/**
 * 심층 분석용 의미 정렬 힌트: Gemini `text-embedding-004` 배치 1회로
 * 제목·설명(또는 채널명·최근 제목) 간 코사인 유사도를 계산해,
 * 한국어 설명란·SEO 문장이 원문 주제에서 벗어나지 않도록 LLM 프롬프트에 주입한다.
 * 수집 단계에서 dev 접미사를 프리패치하지 않은 경우, 이 임베딩 호출은 `loadDevOrchestrationPromptSuffix`와
 * `Promise.all`로 겹쳐 진행되어 YouTube·Gemini 병렬 레인과 같은 지연 병합 패턴을 유지한다.
 */
import { isTransientGeminiError, isUserAbortError, withRetry } from "./resilience";
import { getGeminiClient } from "../services/geminiClient";
import type { YouTubeChannelData, YouTubeVideoData } from "../services/youtubeApiService";

/** 다국어 문맥에 적합하고, 배치 한 번으로 지연을 최소화 */
export const KOREAN_SEMANTIC_EMBEDDING_MODEL = "text-embedding-004";

const DESC_CHUNK_LEN = 220;
const MAX_DESC_CHUNKS = 4;
const MAX_CHANNEL_TITLES = 6;

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function chunkDescription(desc: string, maxLen: number, maxChunks: number): string[] {
  const t = normalizeWs(desc);
  if (!t) return [];
  if (t.length <= maxLen) return [t];
  const out: string[] = [];
  for (let i = 0; i < t.length && out.length < maxChunks; i += maxLen) {
    out.push(t.slice(i, i + maxLen));
  }
  return out;
}

const EMBED_RETRY = { maxAttempts: 3, baseDelayMs: 600, maxDelayMs: 8_000 } as const;

async function embedTexts(texts: string[], signal?: AbortSignal): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await withRetry(
    () =>
      getGeminiClient().models.embedContent({
        model: KOREAN_SEMANTIC_EMBEDDING_MODEL,
        contents: texts,
        config: {
          autoTruncate: true,
          abortSignal: signal,
        },
      }),
    {
      ...EMBED_RETRY,
      signal,
      shouldRetry: (err) => isTransientGeminiError(err),
      onRetry: (err, round, delayMs) => {
        console.warn(
          `[embedding] 일시 오류 후 재시도 ${round}/${EMBED_RETRY.maxAttempts - 1} (${delayMs}ms 대기)`,
          err,
        );
      },
    },
  );
  const list = res.embeddings ?? [];
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i++) {
    const v = list[i]?.values;
    if (!v?.length) return [];
    out.push(v);
  }
  return out;
}

function fallbackTextFromVideo(data: YouTubeVideoData): string {
  const tags = (data.tags ?? []).slice(0, 8).join(", ");
  return normalizeWs(data.description) || tags;
}

/**
 * 영상: 제목 vs 설명(또는 태그) 구간 유사도 → 한국어 설명·SEO가 따를 의미 축.
 */
export async function buildVideoKoreanSemanticGroundingBlock(
  data: YouTubeVideoData,
  opts?: { signal?: AbortSignal },
): Promise<string> {
  const title = normalizeWs(data.title);
  const body = fallbackTextFromVideo(data);
  const chunks = chunkDescription(body, DESC_CHUNK_LEN, MAX_DESC_CHUNKS);
  if (!title || chunks.length === 0) return "";

  try {
    const vectors = await embedTexts([title, ...chunks], opts?.signal);
    if (vectors.length !== 1 + chunks.length) return "";

    const titleVec = vectors[0];
    const simParts = chunks.map((_, i) => {
      const sim = cosineSimilarity(titleVec, vectors[i + 1]);
      return `구간${i + 1} ${sim.toFixed(3)}`;
    });

    return `[SEMANTIC_GROUNDING|${KOREAN_SEMANTIC_EMBEDDING_MODEL}]
제목과 설명 원문(또는 태그) 구간 간 의미 유사도(0~1, 높을수록 제목과 주제 일치): ${simParts.join(", ")}.
지침: **제목 및 설명란 추천**·SEO 문장은 유사도가 높은 구간의 핵심 의미·키워드를 빠뜨리지 말고 한국어로 자연스럽게 유지한다. 유사도가 낮은 구간은 부가·메타 정보로만 보조한다. 원문과 모순되는 추측은 하지 않는다.`;
  } catch (e) {
    if (isUserAbortError(e)) throw e;
    console.warn("Video semantic embedding skipped:", e);
    return "";
  }
}

/**
 * 채널: 채널명 vs 최근 영상 제목 유사도 → 채널 단위 한국어 제안의 주제 일관성.
 */
export async function buildChannelKoreanSemanticGroundingBlock(
  data: YouTubeChannelData,
  opts?: { signal?: AbortSignal },
): Promise<string> {
  const name = normalizeWs(data.channelName);
  const titles = data.recentVideos
    .slice(0, MAX_CHANNEL_TITLES)
    .map((v) => normalizeWs(v.title))
    .filter(Boolean);
  if (!name || titles.length === 0) return "";

  try {
    const vectors = await embedTexts([name, ...titles], opts?.signal);
    if (vectors.length !== 1 + titles.length) return "";

    const nameVec = vectors[0];
    const simParts = titles.map((_, i) => {
      const sim = cosineSimilarity(nameVec, vectors[i + 1]);
      return `영상${i + 1} ${sim.toFixed(3)}`;
    });

    return `[SEMANTIC_GROUNDING|${KOREAN_SEMANTIC_EMBEDDING_MODEL}]
채널명과 최근 영상 제목 간 의미 유사도(0~1): ${simParts.join(", ")}.
지침: **설명란·SEO·쇼츠·시리즈** 등 한국어 제안은 위 제목·채널명과 주제가 어긋나지 않게 맞춘다. 유사도가 낮은 제목은 니치 확장·실험 영상일 수 있으니, 채널 핵심 토픽과 구분해 서술한다.`;
  } catch (e) {
    if (isUserAbortError(e)) throw e;
    console.warn("Channel semantic embedding skipped:", e);
    return "";
  }
}
