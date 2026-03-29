/**
 * 수집(collect) 단계: YouTube Data API 팩트 fetch와 분석 준비(개발용 오케스트레이션 동적 로드)를
 * `Promise.all`로 병렬 실행해, 검증 단계의 OpenAI·Gemini 병렬과 같은 **레인 병렬** 패턴을 맞춘다.
 * 이후 정제·리포트 단계에서는 팩트가 있으면 Gemini `text-embedding-004` 임베딩과 (프리패치 시 생략된) dev 접미사 로드를 추가로 병합한다.
 */
import type { YouTubeChannelData, YouTubeVideoData } from '../services/youtubeApiService';
import { fetchYouTubeChannelData, fetchYouTubeVideoData } from '../services/youtubeApiService';
import { loadDevOrchestrationPromptSuffix, type GeminiAnalysisOptions } from '../services/geminiService';

export type CollectParallelKind = 'channel' | 'video';

export interface CollectParallelParams {
  kind: CollectParallelKind;
  url: string;
  youtubeApiKey: string | undefined;
  options: Pick<GeminiAnalysisOptions, 'signal' | 'outputLocale' | 'devAgentOrchestration'>;
}

export type CollectParallelResult<T extends YouTubeChannelData | YouTubeVideoData | null> = {
  rawData: T;
  /** `GeminiAnalysisOptions.prefetchedDevOrchestrationBlock`에 그대로 넣는다. */
  prefetchedDevOrchestrationBlock: string;
};

export async function runCollectPhaseInParallel(
  params: CollectParallelParams & { kind: 'channel' },
): Promise<CollectParallelResult<YouTubeChannelData | null>>;
export async function runCollectPhaseInParallel(
  params: CollectParallelParams & { kind: 'video' },
): Promise<CollectParallelResult<YouTubeVideoData | null>>;
export async function runCollectPhaseInParallel(
  params: CollectParallelParams,
): Promise<CollectParallelResult<YouTubeChannelData | YouTubeVideoData | null>> {
  const { kind, url, youtubeApiKey, options } = params;
  const signal = options.signal;
  const locale = options.outputLocale === 'en' ? 'en' : 'ko';

  const devPromise = loadDevOrchestrationPromptSuffix(locale, kind, options as GeminiAnalysisOptions);

  const ytPromise: Promise<YouTubeChannelData | YouTubeVideoData | null> = youtubeApiKey
    ? (async () => {
        try {
          if (kind === 'channel') {
            return await fetchYouTubeChannelData(url, youtubeApiKey, { signal });
          }
          return await fetchYouTubeVideoData(url, youtubeApiKey, { signal });
        } catch (e) {
          if (signal?.aborted) throw e;
          console.warn('YouTube API fetch failed, falling back to model tools:', e);
          return null;
        }
      })()
    : Promise.resolve(null);

  const [rawData, prefetchedDevOrchestrationBlock] = await Promise.all([ytPromise, devPromise]);

  return { rawData, prefetchedDevOrchestrationBlock };
}
