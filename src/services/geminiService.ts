import { FinishReason } from "@google/genai";
import { buildChannelFactPacket, buildVideoFactPacket } from "../lib/analysisPipeline";
import { isTransientGeminiError, withRetry } from "../lib/resilience";
import {
  buildChannelKoreanSemanticGroundingBlock,
  buildVideoKoreanSemanticGroundingBlock,
} from "../lib/koreanSemanticEmbedding";
import { buildGeminiApiUsageSummary, type GeminiApiUsageSummary } from "../lib/geminiApiUsage";
import { getGeminiClient } from "./geminiClient";
import { YouTubeChannelData, YouTubeVideoData } from "./youtubeApiService";

export { isGeminiApiKeyConfigured } from "./geminiClient";

const GEMINI_GENERATE_RETRY = {
  maxAttempts: 4,
  baseDelayMs: 1_200,
  maxDelayMs: 20_000,
} as const;

/** 긴 심층 리포트가 기본 상한에서 잘리는 것을 줄이기 위한 출력 토큰 상한 */
const REPORT_MAX_OUTPUT_TOKENS_CHANNEL = 8192;
const REPORT_MAX_OUTPUT_TOKENS_VIDEO = 8192;

/**
 * 번호 목록만 따르다 보면 모델이 `##` 없이 굵게·목록만 쓰는 경우가 있어,
 * 완성도 검사·보내기와 맞지 않는다. 각 메인 섹션을 `##` 한 줄로 고정한다.
 */
function markdownSectionHeadingContract(locale: "ko" | "en", reportType: "channel" | "video"): string {
  const rangeKo = reportType === "channel" ? "0~15" : "0~8";
  const rangeEn = reportType === "channel" ? "0–15" : "0–8";
  if (locale === "en") {
    return `
[Markdown \`##\` headings — required]
- Start **each** main outline section (${rangeEn}) with **exactly one** line: \`## <n>. <emoji> <title>\` (titles in English per OUTPUT LANGUAGE). Example: \`## 0. 🔍 Fact check & raw data\`.
- Put all bullets and paragraphs **under** that \`##\` line. Do **not** replace section headers with only **bold** lines or list items.
- Use \`###\` only for true subsections (e.g. each **day** inside the 7-day plan).
- **Do not skip** outline sections; if data is missing write **No data** but keep the \`##\` heading.
- Inside **Algorithm & SEO**, include at least one **GFM table** (pipe columns + \`|---|---|\` separator row) with the three checklist columns (optimization item · current status · improvement actions).
- After sections ${rangeEn}, add the **7-day action plan** as its own \`##\` heading per the output rules, then **one** \`\`\`json fenced block at the very end (algorithmInsights only).
`;
  }
  return `
[마크다운 \`##\` 제목 — 필수]
- 위 번호 목록의 **각 메인 섹션**(${rangeKo})은 반드시 \`## 번호. 이모지 제목\` **한 줄**로 시작한다(예: \`## 0. 🔍 팩트 체크 및 로우 데이터 (Fact Check & Raw Data)\`).
- 본문은 해당 \`##\` 바로 아래에만 쓴다. **굵게만** 쓰거나 목록 텍스트로 섹션 제목을 대체하지 않는다.
- \`###\`은 7일 플랜의 **일차** 등 실제 소제목에만 쓴다.
- **섹션을 생략하지 않는다.** 데이터가 없으면 "데이터 없음"을 쓰되 \`##\` 줄은 유지한다.
- **알고리즘 및 SEO** 섹션 안에 GFM 표(파이프 열 + 구분 행)로 **세 열**(최적화 항목 · 현재 상태 진단 · 구체적인 개선 방안) 체크리스트를 반드시 넣는다.
- 본문 섹션(${rangeKo}) 후 출력 규칙의 **7일 액션 플랜**용 \`##\` 제목을 쓰고, 맨 마지막에 algorithmInsights JSON 펜스(\`\`\`json)만 둔다.
`;
}

function appendOutputTruncateNotice(
  markdown: string,
  finishReason: string | undefined,
  locale: "ko" | "en",
): string {
  if (finishReason !== FinishReason.MAX_TOKENS && finishReason !== "MAX_TOKENS") {
    return markdown;
  }
  const note =
    locale === "en"
      ? "\n\n> **Note:** Output hit the model length limit. The end of the report (7-day plan, table, or JSON block) may be incomplete — run **Analyze** again."
      : "\n\n> **안내:** 출력 길이 한도에 도달해 응답이 중간에 끊겼을 수 있습니다. 끝부분(7일 플랜·표·JSON)이 없으면 **다시 분석**을 실행해 주세요.";
  return `${markdown.trimEnd()}${note}`;
}

export interface AlgorithmInsight {
  label: string;
  status: 'green' | 'yellow' | 'red';
}

export interface AnalysisResult {
  text: string;
  sources: { title?: string; uri: string }[];
  algorithmInsights?: AlgorithmInsight[];
  apiUsage?: GeminiApiUsageSummary;
}

/** `factsOnly`는 YouTube API로 rawData를 확보했을 때만 적용된다(미확보 시 자동으로 웹 도구 사용). */
export interface GeminiAnalysisOptions {
  factsOnly?: boolean;
  /** UI 언어와 맞춰 리포트 본문·헤딩·JSON 라벨 언어를 맞춘다. 기본 ko. */
  outputLocale?: "ko" | "en";
  /** 분석 취소·새 분석 시작 시 이전 요청을 중단한다. */
  signal?: AbortSignal;
}

function shouldUseWebGroundingTools(
  rawData: unknown | null | undefined,
  factsOnly: boolean | undefined,
): boolean {
  if (!rawData) return true;
  return !factsOnly;
}

function buildStructuredReportRules(reportType: "channel" | "video", locale: "ko" | "en"): string {
  const minSectionCount = reportType === "channel" ? 16 : 9;

  if (locale === "en") {
    const scopeLabel = reportType === "channel" ? "Channel analysis report" : "Video analysis report";
    return `
[Output rules — ${scopeLabel}]
Use Markdown ##/###. Keep emoji + numbering style. Each major section: at least 3 actionable bullets (what / how / expected impact). If evidence is weak, write "No data". Use GFM tables where instructed. Required headings (English): "## 🕒 First 24 Hours Performance Diagnostics", "## 🎯 Satisfaction-Centered Diagnostic Card", and finish with "## ✅ Priority 7-Day Action Plan".
[Required — "## ✅ Priority 7-Day Action Plan" format]
- Do **not** use one single ordered list for all 7 days. Use **### subheadings per day** (e.g. "### Day 1 — Title/thumbnail A/B").
- Under each day, include these four bullets; **each bullet must be at least 2 sentences** (do not cram hypothesis/change/metrics/criteria into one line).
  - **Hypothesis**: tie to prior diagnosis, causal claim to test, why this experiment.
  - **Concrete change & execution**: where (title, thumbnail, first 30s, etc.), order of operations, **copy-pasteable lines, shot ideas, edit beats**.
  - **Metrics**: primary + secondary in Studio, when to check (e.g. 24–48h after publish).
  - **Success criteria**: numbers/ratios/timebox, scale or hold if met, pivot/stop if missed.
- Vary daily focus (packaging vs opening vs Shorts bridge) if helpful, but keep depth consistent across all 7 days.
Section count ≥ ${minSectionCount}. Entire report in English.`;
  }

  const scopeLabel = reportType === "channel" ? "채널 분석 보고서" : "영상 분석 보고서";
  return `
[출력 규칙 - ${scopeLabel}]
Markdown ##/### 고정, 이모지·번호 형식 유지. 주요 섹션마다 실행 불릿 3개 이상(무엇/어떻게/기대효과). 근거 부족 시 "데이터 없음". 표 지시 구간은 GFM 표. 필수: "## 🕒 초기 24시간 성과 진단", "## 🎯 만족도 중심 진단 카드", 마지막 "## ✅ 우선 실행 액션 플랜 (7일)".
[필수 — "## ✅ 우선 실행 액션 플랜 (7일)" 상세 형식]
- 7일을 **단일 순서 목록(ol) 한 덩어리**로만 쓰지 말고, **1일차~7일차 각각 ### 소제목**(예: "### 1일차 — 제목·썸네일 A/B")으로 나눈다.
- 각 일차마다 아래 4개를 **하위 불릿**으로 두고, **각 불릿은 최소 2문장**으로 서술한다(가설/변경/지표/성공기준을 한 줄에 몰아쓰기 금지).
  - **가설**: 앞선 진단과의 연결, 검증하려는 인과관계, 이 실험을 택한 이유.
  - **구체적 변경·실행**: 적용 위치(제목·썸네일·첫 30초 등), 실행 순서, **복사해 쓸 수 있는 문구·장면·편집 포인트 예시**를 포함한다.
  - **측정 지표**: 스튜디오에서 볼 1차·보조 지표, 확인 시점(예: 업로드 후 24~48시간).
  - **성공 기준·판정**: 수치·비율·기간, 달성 시 확대/유지, 미달 시 수정 또는 중단 기준.
- 일차마다 초점(예: 패키징 vs 오프닝 vs 쇼츠 연계)을 달리해도 되나, 위 깊이는 7일 모두 동일하게 유지한다.
섹션 수 ≥ ${minSectionCount}. 한국어 위주.`;
}

function outputLanguageBlock(locale: "ko" | "en"): string {
  if (locale === "en") {
    return `
[OUTPUT LANGUAGE — ENGLISH]
Write the **entire** markdown report in clear, natural **English** (headings, body, tables, bullets). Keep the same section order and emoji/numbering scheme as in the template below; translate section titles into English in the rendered headings.
Use **"No data"** (English) instead of Korean when information is missing.
`;
  }
  return `
[출력 언어 — 한국어]
보고서 **전체**(제목·본문·표·불릿)를 **한국어**로 작성합니다. 근거가 부족하면 "데이터 없음"을 사용합니다.
`;
}

function algorithmInsightsJsonHint(locale: "ko" | "en"): string {
  if (locale === "en") {
    return '{"algorithmInsights":[{"label":"CTR packaging","status":"green"},{"label":"Retention risk","status":"yellow"}]}';
  }
  return '{"algorithmInsights":[{"label":"항목1","status":"green"},{"label":"항목2","status":"yellow"}]}';
}

function algorithmInsightsJsonInstruction(locale: "ko" | "en", reportKind: "channel" | "video"): string {
  const hint = algorithmInsightsJsonHint(locale);
  if (locale === "en") {
    const countHint = reportKind === "channel" ? "About 5 items fit a channel report." : "About 5 items fit a video report.";
    return `
    [Algorithm insights JSON — UI traffic lights · required]
    At the **very end** of the response, add **only one** \`\`\`json code block. Inside: a single valid JSON object with the key algorithmInsights only. Each item is {label, status}; status is green|yellow|red; label must be a **short English phrase** (no Korean, parentheses, or slashes). ${countHint} Do not put these instructions inside the JSON.
    Example: \`\`\`json\n${hint}\n\`\`\`
    `;
  }
  const countHint =
    reportKind === "channel"
      ? "채널 분석 시 항목 5개 전후가 적절."
      : "영상 분석 시 항목 5개 전후가 적절.";
  return `
    [알고리즘 인사이트 JSON — UI 신호등용 · 필수]
    응답 **맨 마지막**에 단독으로 \`\`\`json 코드블록 1개**만** 추가한다. 블록 안은 **유효한 JSON 객체 한 덩어리**이며 키는 algorithmInsights만 사용한다. 각 항목은 {label, status}, status는 green|yellow|red, label은 한국어 짧은 구만(영문·괄호·슬래시 금지). ${countHint} 위 설명 문장은 JSON 밖에 쓰지 말 것.
    형식 예: \`\`\`json\n${hint}\n\`\`\`
    `;
}

function webToolCopy(
  locale: "ko" | "en",
  mode: "channel" | "video",
  useWebTools: boolean,
): string {
  if (locale === "en") {
    if (mode === "video") {
      return useWebTools
        ? `Use Google Search to add context; if it conflicts with FACT_PACKET numbers, prefer FACT_PACKET.`
        : `[Tools: facts only] Do not use Google Search. Write from FACT_PACKET, description, tags, and general YouTube best practices only. Mark uncertainty as "No data".`;
    }
    return useWebTools
      ? `Use Google Search and URL context for trends; if it conflicts with FACT_PACKET numbers, prefer FACT_PACKET.`
      : `[Tools: facts only] Do not use Google Search or URL context. Write from FACT_PACKET, channel URL context, and best practices. Avoid web-dependent claims; use "No data" when needed.`;
  }
  if (mode === "video") {
    return useWebTools
      ? `Google 검색 도구로 영상 맥락·트렌드를 보조 반영하되, FACT_PACKET 수치와 충돌하면 FACT_PACKET을 우선한다.`
      : `[도구 모드: 팩트 전용] Google 검색 도구를 사용하지 않는다. FACT_PACKET·제공된 설명·태그와 일반적인 유튜브 베스트 프랙티스만으로 작성한다. 외부 웹 근거·실시간 트렌드 주장은 하지 않고, 불확실하면 "데이터 없음"으로 표시한다.`;
  }
  return useWebTools
    ? `Google 검색·URL 컨텍스트로 트렌드·맥락을 보조하되, FACT_PACKET 수치와 충돌하면 FACT_PACKET을 우선한다.`
    : `[도구 모드: 팩트 전용] Google 검색·URL 컨텍스트 도구를 사용하지 않는다. FACT_PACKET·채널 URL 맥락과 일반 베스트 프랙티스만으로 작성한다. 경쟁 채널·실시간 트렌드 등 웹 근거가 필요한 주장은 추정하지 말고 "데이터 없음"으로 표시한다.`;
}

function parseAlgorithmInsightsPayload(parsed: unknown): AlgorithmInsight[] | null {
  if (!parsed || typeof parsed !== "object") return null;
  const raw = (parsed as Record<string, unknown>).algorithmInsights;
  if (!Array.isArray(raw)) return null;
  const out: AlgorithmInsight[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.label !== "string" || !rec.label.trim()) continue;
    const st = rec.status;
    if (st !== "green" && st !== "yellow" && st !== "red") continue;
    out.push({ label: rec.label.trim(), status: st });
  }
  return out.length > 0 ? out : null;
}

function tryParseAlgorithmInsightsJsonBody(body: string): AlgorithmInsight[] | null {
  try {
    return parseAlgorithmInsightsPayload(JSON.parse(body));
  } catch {
    return null;
  }
}

/**
 * 모델이 삽입한 코드 펜스에서 algorithmInsights JSON을 파싱한다.
 * (이전 정규식은 객체 중첩 시 첫 `}`에서 잘려 파싱에 실패했음)
 */
function extractAlgorithmInsightsFromMarkdown(markdown: string): {
  text: string;
  algorithmInsights?: AlgorithmInsight[];
} {
  const fencePattern = /```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  const matches: RegExpExecArray[] = [];
  while ((m = fencePattern.exec(markdown)) !== null) {
    matches.push(m);
  }
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const body = match[1].trim();
    const insights = tryParseAlgorithmInsightsJsonBody(body);
    if (insights) {
      const stripped = markdown.replace(match[0], "").replace(/\n{3,}/g, "\n\n").trim();
      return { text: stripped, algorithmInsights: insights };
    }
  }
  return { text: markdown };
}

export async function analyzeYouTubeVideo(
  videoUrl: string,
  rawData?: YouTubeVideoData | null,
  options?: GeminiAnalysisOptions,
): Promise<AnalysisResult> {
  const model = "gemini-3.1-pro-preview"; // Using pro for better creative prompt generation

  const factBlock = rawData ? buildVideoFactPacket(rawData) : "";
  const sig = options?.signal;
  const semanticGroundingBlock = rawData
    ? await buildVideoKoreanSemanticGroundingBlock(rawData, { signal: sig })
    : "";
  const useWebTools = shouldUseWebGroundingTools(rawData, options?.factsOnly);
  const locale = options?.outputLocale === "en" ? "en" : "ko";
  const webToolLine = webToolCopy(locale, "video", useWebTools);
  const videoRoleIntro =
    locale === "en"
      ? `You are a top YouTube content strategist and prompt engineer.\nAnalyze the following YouTube video URL and produce a detailed strategy report the creator can use immediately.`
      : `당신은 세계 최고의 유튜브 콘텐츠 전략가이자 AI 프롬프트 엔지니어입니다.\n다음 유튜브 영상 URL을 분석하고, 크리에이터가 즉시 활용할 수 있는 상세한 전략 리포트를 작성해 주세요.`;
  const videoSectionLanguage =
    locale === "en"
      ? "Follow the section numbering and emoji markers below; write the full report in professional markdown."
      : "아래 섹션 번호·이모지·제목 형식을 그대로 지키고, 전문적인 마크다운 보고서를 한국어로 작성해 주세요.";
  const readabilityImportant =
    locale === "en"
      ? "**Important**: Add a blank line between paragraphs and after subheadings for readability."
      : "**중요**: 가독성을 위해 각 문단 사이에는 빈 줄을 한 줄 넣어(문단 구분) 여백을 충분히 확보해 주세요. 소제목과 본문 사이에도 적절한 간격을 두어 읽기 편하게 구성해 주세요.";
  const outputFormatOnly =
    locale === "en"
      ? "Output structured, professional markdown only."
      : "출력은 구조가 분명한 전문 마크다운 형식으로만 작성해 주세요.";

  const prompt = `
    ${outputLanguageBlock(locale)}
    ${videoRoleIntro}
    
    URL: ${videoUrl}
    ${factBlock ? `${factBlock}\n` : ""}
    ${semanticGroundingBlock ? `${semanticGroundingBlock}\n` : ""}

    ${videoSectionLanguage}

    ${markdownSectionHeadingContract(locale, "video")}

    0. **🔍 팩트 체크 및 로우 데이터 (Fact Check & Raw Data)**:
       - FACT_PACKET이 있으면 해당 JSON 수치·텍스트를 먼저 그대로 인용·나열한다. 없으면 검색·도구로 확보한 맥락을 "추정/출처"로 구분해 명시한다.
       - 이후 분석은 위 팩트(또는 명시한 출처)를 우선한다.

    1. **📊 영상 상세 분석 (Detailed Video Analysis)**:
       - 영상의 전반적인 성과, 시청자 반응, 핵심 강점 및 약점 분석.
       - 시청자가 이 영상에 반응한 주요 요인(Hook, 편집, 스토리텔링 등).

    2. **📝 제목 및 설명란 추천 (Title & Description Recommendations)**:
       - **제목 추천 (Title Recommendations)**: 클릭률(CTR)과 검색 최적화(SEO)를 모두 잡을 수 있는 매력적인 영상 제목 후보 3~5가지를 제안해 주세요.
       - **설명란 추천 (Description Recommendations)**: 유튜브 SEO에 최적화된 구조적인 설명란(Description) 초안을 작성해 주세요. 다음 요소를 반드시 포함해야 합니다:
         - **도입부 (Hook)**: 시청자의 이목을 끄는 1~2줄의 요약.
         - **상세 설명 (Detailed Summary)**: 영상의 핵심 내용과 타겟 키워드가 자연스럽게 녹아든 상세한 설명.
         - **타임스탬프 (Timestamps)**: 주요 내용별 타임라인 (예시 형태).
         - **채널 정보 및 CTA (Channel Info & CTA)**: 구독 유도 및 관련 링크 안내.
         - **해시태그 (Hashtags)**: 검색 노출을 극대화할 수 있는 핵심 해시태그 3~5개.

    3. **✨ Nano Banana Pro 프롬프트 (Nano Banana Pro Prompts)**:
       - 이 영상의 매력도를 극대화할 수 있는 새로운 **썸네일(Thumbnail)** 제작을 위한 'Nano Banana Pro(최고 성능의 이미지/텍스트 생성 AI 모델)'용 프롬프트를 상세히 작성.
       - 썸네일 프롬프트는 영문으로 작성하여 이미지 생성에 바로 쓸 수 있게 하고, 구체적인 구도, 조명, 피사체, 분위기를 묘사할 것.

    4. **🕒 초기 24시간 성과 진단 (First 24h Diagnostics)**:
       - Home/Suggested 맥락의 CTR 해석과 노출 대비 성과 진단.
       - 초반 이탈 구간(특히 첫 30초)에서의 문제 가설과 개선안.
       - "첫 30초 훅" 개선안 3개를 구체 문장 형태로 제시.

    5. **🎯 만족도 중심 진단 카드 (Satisfaction Fit Card)**:
       - 제목-썸네일-오프닝의 약속/전달 일치도를 '높음/보통/낮음'으로 평가.
       - 클릭 유도만 강하고 본문 전달이 약한 리스크 여부 진단.
       - 시청자 기대와 실제 전달 간 갭을 줄이는 즉시 수정안 제시.

    6. **🤖 알고리즘 및 SEO 최적화 가이드 (Algorithm & SEO Optimization)**:
       - **[필수] 알고리즘 & SEO 개선 체크리스트 (Markdown 표 형식)**:
         - 반드시 다음의 열(Column)을 포함하는 상세한 **Markdown 표(Table)**를 작성하세요: '최적화 항목(Optimization Item)', '현재 상태 진단(Current Status Assessment)', '구체적인 개선 방안(Specific Improvement Actions)'.
         - 표에 포함될 필수 최적화 항목: **제목(Titles), 설명란(Descriptions), 태그(Tags), 썸네일(Thumbnails)**.
       - **추천 비디오 태그 (Recommended Video Tags)**:
         - SEO 최적화 및 알고리즘 노출을 극대화하기 위한 핵심 키워드 및 태그 목록 제안.

    7. **📱 쇼츠 콘텐츠 전략 (Shorts Content Strategy)**:
       - 이 롱폼 영상에서 파생될 수 있는 **3개의 구체적인 쇼츠(Shorts) 콘텐츠 아이디어**.
       - 각 쇼츠 아이디어별로 다음을 반드시 포함:
         - **Initial Hook (초반 3초 훅)**: 시청자의 이목을 단숨에 끄는 도입부
         - **Core Content (핵심 전개 내용)**: 60초 이내로 압축된 핵심 하이라이트
         - **Call-to-Action (CTA)**: 롱폼 본편 시청이나 구독을 유도하는 명확한 액션 플랜
         - **썸네일 내 CTA 문구 추천 (Thumbnail CTA Text)**: 각 쇼츠 컨셉의 썸네일(또는 영상 내 텍스트 오버레이)에 포함할 구체적이고 강력한 Call-to-Action 텍스트 추천.

    8. **🎬 영상 분석 — 마케터·PD 심층 인사이트 (Role-Based Video Analysis)**:
       - 이 섹션은 **앞선 섹션(0~7)의 심층 분석 결과**를 바탕으로, 역할별로 **실무에 바로 쓸 수 있게** 재구성한다(중복 나열이 아니라 **요약·실행** 중심).
       - 역할 구분선은 마크다운 제목 문법(#, ##, ###)을 쓰지 말고, 첫 줄은 단독 한 줄로 **마케터 (Marketer)** 만 굵게, 둘째 블록 시작 전에 단독 한 줄로 **영상 기획 및 PD (Producer / PD)** 만 굵게 쓴 뒤 각각 바로 아래에 본문을 이어 쓴다(따옴표 없이).
       - **마케터 (Marketer)** 블록(굵은 라인 직후 본문):
         - 콘텐츠 **기획·제작**에 활용할 **Lesson Learned(교훈)** — 구체 불릿.
         - **다음 콘텐츠** 제작 시 **고려해야 할 포인트** — 체크리스트 또는 우선순위 불릿.
         - 이 영상·채널 맥락을 **인스타그램 / 틱톡 / 링크드인**에 **공유·재배포**할 때 **플랫폼별**로 달라지는 **톤·포맷·비율·캡션·CTA·해시태그/키워드·커뮤니티 규범** 등 정리(플랫폼마다 소제목 또는 표로 구분).
       - **영상 기획 및 PD (Producer / PD)** 블록(굵은 라인 직후 본문):
         - **다음 콘텐츠** 제작을 위한 **아이디어** 및 **기획 방향** 제안(포맷, 각도, 연출·구성, 시리즈화 가능성).
         - **참고 레퍼런스(벤치마킹 채널)** — 반드시 하위에 **Markdown 표**로 작성한다. 권장 열: **채널명** | **공식·대표 URL(채널 또는 대표 영상)** | **참고 포인트** | **팩트 체크(검증 상태·근거)**.
         - **[필수] 벤치마킹 채널 팩트 체크**: (1) 웹 검색·URL 컨텍스트 등 **도구로 채널 존재·채널명-URL 대응**을 교차 확인한다. (2) **확인된 URL만** 표에 넣고, 페이지 제목·채널 핸들이 채널명과 **불일치하면 제외하거나 수정**한다. (3) **추측·날조 URL 금지**; 검증 불가 시 해당 행에 **검증 상태**를 "확인됨" / "부분 확인" / "추정" 중 하나로 명시하고, **근거**(검색 쿼리, 인용한 스니펫 요약, 또는 근거가 된 웹 URI)를 **팩트 체크** 열에 적는다. (4) 분석 대상 영상·채널(FACT_PACKET)과 **동일 채널을 벤치마크로 중복 기재하지 않는다**(필요 시 "본 채널"으로 구분). (5) 링크는 클릭 시 해당 채널/콘텐츠로 연결되는 **유효한 형식**으로 쓴다.

    ${algorithmInsightsJsonInstruction(locale, "video")}

    ${webToolLine}
    ${outputFormatOnly}
    
    ${readabilityImportant}
    ${buildStructuredReportRules("video", locale)}
  `;

  try {
    const response = await withRetry(
      () =>
        getGeminiClient().models.generateContent({
          model: model,
          contents: prompt,
          config: {
            abortSignal: sig,
            ...(useWebTools ? { tools: [{ googleSearch: {} }] } : {}),
            temperature: 0.7,
            maxOutputTokens: REPORT_MAX_OUTPUT_TOKENS_VIDEO,
          },
        }),
      {
        ...GEMINI_GENERATE_RETRY,
        signal: sig,
        shouldRetry: (err) => isTransientGeminiError(err),
        onRetry: (err, retryRound, delayMs) => {
          console.warn(
            `[Gemini video] 일시 오류 후 재시도 ${retryRound}/${GEMINI_GENERATE_RETRY.maxAttempts - 1} (${delayMs}ms 대기)`,
            err,
          );
        },
      },
    );

    let text = response.text || "";
    const finishReason = response.candidates?.[0]?.finishReason;
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter(chunk => chunk.web?.uri)
      .map(chunk => ({
        title: chunk.web?.title,
        uri: chunk.web?.uri as string
      }));

    const extractedInsights = extractAlgorithmInsightsFromMarkdown(text);
    text = extractedInsights.text;
    text = appendOutputTruncateNotice(text, finishReason, locale);
    const algorithmInsights = extractedInsights.algorithmInsights;

    const apiUsage = buildGeminiApiUsageSummary(model, response.usageMetadata);

    return { text, sources, algorithmInsights, apiUsage };
  } catch (error) {
    console.error("Gemini API Error (Video Analysis):", error);
    throw error;
  }
}

export async function analyzeYouTubeChannel(
  channelUrl: string,
  rawData?: YouTubeChannelData | null,
  options?: GeminiAnalysisOptions,
): Promise<AnalysisResult> {
  const model = "gemini-3-flash-preview";

  const factBlock = rawData ? buildChannelFactPacket(rawData) : "";
  const sig = options?.signal;
  const semanticGroundingBlock = rawData
    ? await buildChannelKoreanSemanticGroundingBlock(rawData, { signal: sig })
    : "";
  const useWebTools = shouldUseWebGroundingTools(rawData, options?.factsOnly);
  const locale = options?.outputLocale === "en" ? "en" : "ko";
  const webToolLine = webToolCopy(locale, "channel", useWebTools);
  const channelTaskIntro =
    locale === "en"
      ? `Perform a deep analysis of the following YouTube channel: ${channelUrl}`
      : `다음 YouTube 채널을 심층 분석해 주세요: ${channelUrl}`;
  const channelSectionLanguage =
    locale === "en"
      ? "Follow the section numbering and emoji markers below; write the full report in professional markdown."
      : "아래 섹션 번호·이모지·제목 형식을 그대로 지키고, 전문적인 마크다운 보고서를 한국어로 작성해 주세요.";
  const readabilityImportantCh =
    locale === "en"
      ? "**Important**: Add a blank line between paragraphs and after subheadings for readability."
      : "**중요**: 가독성을 위해 각 문단 사이에는 빈 줄을 한 줄 넣어(문단 구분) 여백을 충분히 확보해 주세요. 소제목과 본문 사이에도 적절한 간격을 두어 읽기 편하게 구성해 주세요.";
  const outputFormatOnlyCh =
    locale === "en"
      ? "Output structured, professional markdown only."
      : "출력은 구조가 분명한 전문 마크다운 형식으로만 작성해 주세요.";

  const prompt = `
    ${outputLanguageBlock(locale)}
    ${channelTaskIntro}
    ${factBlock ? `${factBlock}\n` : ""}
    ${semanticGroundingBlock ? `${semanticGroundingBlock}\n` : ""}
    
    ${channelSectionLanguage}

    ${markdownSectionHeadingContract(locale, "channel")}
    
    0. **🔍 팩트 체크 및 로우 데이터 (Fact Check & Raw Data)**:
       - FACT_PACKET이 있으면 JSON의 구독자·총조회·영상수·최근 영상(rv) 수치를 먼저 그대로 인용·나열한다. 없으면 검색·도구 결과를 "추정/출처"로 구분해 명시한다.
       - 이후 분석은 위 팩트(또는 명시한 출처)를 우선한다.
       
    1. **📊 채널 데이터 및 현황 분석 (Channel Data Analysis)**:
       - 채널의 현재 규모, 주요 지표, 최근 성장세 분석.
       
    2. **🚀 콘텐츠 성과 분석 (Content Performance Analysis)**:
       - 가장 성과가 좋은 콘텐츠 유형 및 개별 영상 분석.
       - 평균 시청 지속 시간(AVD), 시청자 유지율(Retention), 시청자 인구통계(성별, 연령대 등) 등 핵심 지표 분석.
       - 시청 지속 시간(Retention)을 극대화하기 위한 최신 편집 트렌드 적용 방안 (예: 패턴 인터럽트(Pattern Interrupts), 시각적 훅(Visual Hooks), 스토리텔링 아크 개선).
       - 조회수, 댓글, 좋아요 등 참여도가 높은 영상들의 데이터 기반 공통점 파악.
       
    3. **💰 다각화된 수익화 전략 (Advanced Monetization Strategies)**:
       - 단순 광고 수익을 넘어선 니치(Niche) 맞춤형 수익화 모델 제안 (예: 고단가 제휴 마케팅(Affiliate), 자체 디지털 상품/강의, 멤버십 전용 혜택 기획).
       - 이 채널이 브랜드 스폰서십을 유치하기 위해 어필할 수 있는 '핵심 셀링 포인트(USP)'와 구체적인 타겟 브랜드 카테고리 3가지 제안.
       - 커뮤니티 기반 수익 창출(Patreon, Discord 등)을 위한 구체적인 3단계 실행 계획 제시.
       
    4. **📈 구독자 증가를 위한 전략 (Subscriber Growth Strategy)**:
       - 신규 시청자를 구독자로 전환시키기 위한 구체적인 액션 플랜.
       
    5. **🕒 초기 24시간 성과 진단 (First 24h Diagnostics)**:
       - Home/Suggested CTR을 노출 맥락과 함께 진단하고, 개선 우선순위를 제시.
       - 초반 이탈 구간(특히 첫 30초)에서 반복되는 문제 패턴을 도출.
       - 채널 공통 오프닝 구조 개선안(훅/패턴 인터럽트/전개 템포) 제안.

    6. **🎯 만족도 중심 진단 카드 (Satisfaction Fit Card)**:
       - 최근 상위/하위 영상을 기준으로 제목-썸네일-오프닝 정합성 평가.
       - 클릭 유도 대비 시청 경험 품질 리스크를 '높음/보통/낮음'으로 분류.
       - 재방문 및 구독 전환 관점에서 즉시 수정할 패키징/본문 개선안 제시.

    7. **🤖 유튜브 알고리즘 및 SEO 최적화 가이드 (Algorithm & SEO Optimization)**:
       - **[필수] 알고리즘 & SEO 개선 체크리스트 (Markdown 표 형식)**:
         - 반드시 다음의 열(Column)을 포함하는 상세한 **Markdown 표(Table)**를 작성하세요: '최적화 항목(Optimization Item)', '현재 상태 진단(Current Status Assessment)', '구체적인 개선 방안(Specific Improvement Actions)'.
         - 표에 포함될 필수 최적화 항목: **제목(Titles), 설명란(Descriptions), 태그(Tags), 썸네일(Thumbnails)**.
       - **검색 의도(Search Intent) 및 에버그린(Evergreen) 키워드**: 일회성 트래픽이 아닌 지속적인 검색 유입을 만드는 롱테일 키워드 전략 및 추천 태그.
       - **정주행 유도(Binge-watching Loop)**: 최종 화면(End Screen), 카드, 재생목록을 전략적으로 배치하여 세션 시간(Session Time)을 늘리는 구체적 방법.
       - **썸네일 효율성 분석 및 개선 제안 (Thumbnail Effectiveness)**: 채널의 최근 썸네일 이미지들을 분석하여 시각적 매력도(Visual Appeal), 텍스트 가독성(Text Readability), 감정적 소구력(Emotional Impact)을 높여 클릭률(CTR)을 증가시킬 수 있는 구체적이고 실행 가능한 개선 방안 제시.
       - **최근 인기 영상 기반 썸네일 추천 (Thumbnail Recommendations based on Top Recent Videos)**: 제공된 '최근 업로드 영상 데이터' 중 **좋아요 수와 조회수가 가장 높은 최신 콘텐츠**를 집중 분석하여, 해당 영상의 성공 요인을 극대화할 수 있는 **적절한 썸네일 이미지 추천 디자인**을 구체적인 '제안 사항'으로 정리하여 제시.
       - **인물 및 이미지 활용 (Faces & Striking Imagery)**: 영상의 핵심 주제와 완벽하게 일치하면서도 시청자의 감정을 극대화할 수 있는 인물의 표정(Faces)이나 강렬한 시각적 이미지(Striking Imagery)를 썸네일에 효과적으로 배치하는 구체적인 방법 제안.
       - 색상 대비(Color Contrast), 폰트 선택(Font Choices), 다양한 화면 크기(모바일 등)에서도 가독성이 뛰어난 텍스트 크기 및 배치(Placement)에 대한 구체적인 가이드라인 제공.
       - 썸네일 클릭률을 높이기 위한 **2~3가지의 명확하고 구별되는 디자인 개선안(Distinct Design Recommendations)**을 구체적으로 제안.

    8. **✍️ 영상 제목 효율성 및 개선 제안 (Video Title Effectiveness & Suggestions)**:
       - 현재 사용 중인 제목의 클릭 유도 효율성 분석.
       - 검색 최적화(SEO)를 위한 키워드 배치 및 클릭률(CTR)을 높이기 위한 매력적인 제목 스타일 제안.
       - 시청자의 호기심을 자극하는 '클릭 트리거(Click Triggers)'를 활용한 구체적인 제목 수정 예시 3가지 제공.

    9. **🤝 시청자 참여 및 커뮤니티 전략 (User Engagement Features)**:
       - 구독자와의 상호작용을 높이기 위한 인터랙티브 요소 제안 (설문조사, Q&A 세션 등).
       - 커뮤니티 탭 활용 전략 및 시청자 충성도 강화를 위한 구체적인 방법.

    10. **⏰ 최적의 업로드 시간 및 요일 제안 (Optimal Publishing Schedule)**:
       - 시청자 인구통계 및 활동 패턴을 기반으로 조회수와 참여도를 극대화할 수 있는 최적의 업로드 시간대와 요일 분석.
       - 타겟 시청층의 라이프스타일을 고려한 맞춤형 스케줄 제안.

    11. **💡 신규 콘텐츠 시리즈 아이디어 (New Content Series Ideas)**:
       - 채널의 니치(Niche), 시청자 성향(Audience), 기존 성공 사례(Successful Content Types)를 바탕으로 2~3개의 독창적인 신규 콘텐츠 시리즈(Original Content Series) 제안.
       - 썸네일과 제목을 먼저 기획하는 'Thumbnail-First' 접근법에 기반한 신규 콘텐츠 포맷 기획안 포함.
       - 각 시리즈별로 기획 의도 및 콘셉트(Concept), 타겟 시청자 어필 포인트(Target Audience Appeal), 예상 참여도 및 기대 효과(Expected Engagement Impact)를 구체적으로 포함.

    12. **🎥 영상 및 오디오 품질 개선 제안 (Video & Audio Quality Improvement)**:
        - 현재 영상의 시각적/청각적 품질을 분석하고 개선하기 위한 구체적이고 즉시 실행 가능한(Actionable) 방법 제안.
        - **장비 추천(Equipment Recommendations)**: 채널 규모와 예산, 촬영 환경에 맞는 구체적인 장비 모델(예: 특정 카메라 바디/렌즈, 샷건/다이나믹 마이크, 조명 세팅 등)을 명시하여 추천.
        - **편집 기술(Editing Techniques)**: 영상의 완성도를 높일 수 있는 구체적인 편집 팁(예: LUT를 활용한 색보정(Color Grading), 컴프레서/EQ를 활용한 오디오 믹싱, 시청 유지율을 높이는 컷편집 리듬 등) 가이드.

    13. **👀 타겟 시청자 교차 시청 채널 분석 (Audience Cross-Viewership Analysis)**:
        - '내 시청자가 시청하는 다른 채널(유사 채널 및 경쟁 채널)'의 트렌드와 인기 요인을 분석.
        - 해당 채널들의 성공적인 콘텐츠 포맷, 주제, 업로드 주기 등을 파악하여 실제 채널 운영에 적용할 수 있는 벤치마킹 포인트 도출.
        - 이를 바탕으로 현재 채널에 즉시 도입해 볼 수 있는 **구체적인 콘텐츠 제작 아이디어 및 채널 운영 전략**을 제안.
        - 구체 **채널명·URL**을 적을 때는 섹션 15의 **벤치마킹 채널 팩트 체크**와 동일한 원칙으로 검증·출처를 명시한다(미검증 URL·날조 링크 금지).

    14. **📱 유튜브 쇼츠(Shorts) 연계 및 활용 전략 (Shorts Strategy)**:
        - 현재 채널의 **가장 인기 있는 롱폼 콘텐츠(Top Performing Content)**를 기반으로 한 쇼츠(Shorts) 콘텐츠 구성 아이디어 제안.
        - 기존 롱폼 영상의 핵심 하이라이트를 60초 이내로 재가공(Repurposing)하거나 쇼츠 전용으로 기획할 수 있는 구체적인 아이디어를 **상세한 Bullet Point(글머리 기호)** 형태로 3~4가지(3-4 distinct Shorts concepts) 제시.
        - 각 쇼츠 아이디어별로 다음 4가지 요소를 반드시 포함하여 구체적으로 명시: 
          1) **Initial Hook (초반 3초 훅)**: 시청자의 이목을 단숨에 끄는 도입부
          2) **Core Content (핵심 전개 내용)**: 60초 이내로 압축된 핵심 하이라이트
          3) **Call-to-Action (CTA)**: 롱폼 본편 시청이나 구독을 유도하는 명확한 액션 플랜
          4) **썸네일 내 CTA 문구 추천 (Thumbnail CTA Text)**: 각 쇼츠 컨셉의 썸네일에 포함할 구체적이고 강력한 Call-to-Action 텍스트 추천.

    15. **📣 채널 분석 — 마케터·PD 심층 인사이트 (Role-Based Channel Analysis)**:
        - 이 섹션은 **앞선 섹션(0~14)의 심층 분석 결과**를 바탕으로, 역할별로 **실무에 바로 쓸 수 있게** 재구성한다(중복 나열이 아니라 **요약·실행** 중심).
        - 역할 구분선은 마크다운 제목 문법(#, ##, ###)을 쓰지 말고, 첫 줄은 단독 한 줄로 **마케터 (Marketer)** 만 굵게, 둘째 블록 시작 전에 단독 한 줄로 **영상 기획 및 PD (Producer / PD)** 만 굵게 쓴 뒤 각각 바로 아래에 본문을 이어 쓴다(따옴표 없이).
        - **마케터 (Marketer)** 블록(굵은 라인 직후 본문):
          - 유튜브 채널 **마케팅** 관점의 **운영 팁**(브랜딩, 메시징, 퍼널, 협업·캠페인·스폰서 대응 등).
          - **콘텐츠 기획 방향** 제안(타깃, 메시지, 콘텐츠 믹스, 시즌/캠페인 연계).
          - 채널 운영 **방향·가이드**(우선순위, 금지/권장, KPI 관점).
        - **영상 기획 및 PD (Producer / PD)** 블록(굵은 라인 직후 본문):
          - 채널 운영에 필요한 **구체적 아이디어**(포맷, 시리즈, 에피소드 각도, 연출·구성, 촬영·편집 힌트).
          - 앞선 분석을 **기획안** 형태로 압축(에피소드 후보, 훅 구조, 챕터 구성 등).
          - **참고 레퍼런스(벤치마킹 채널)** — 반드시 하위에 **Markdown 표**로 작성한다. 권장 열: **채널명** | **공식·대표 URL** | **참고 포인트** | **팩트 체크(검증 상태·근거)**.
          - **[필수] 벤치마킹 채널 팩트 체크**: (1) 웹 검색·URL 컨텍스트 등 **도구로 채널 존재·채널명-URL 대응**을 교차 확인한다. (2) **확인된 URL만** 표에 넣고, 페이지 제목·핸들이 채널명과 **불일치하면 제외하거나 수정**한다. (3) **추측·날조 URL 금지**; 검증 불가 시 해당 행에 **검증 상태**를 "확인됨" / "부분 확인" / "추정" 중 하나로 명시하고, **근거**(검색 쿼리, 스니펫 요약, 근거 URI)를 **팩트 체크** 열에 적는다. (4) 분석 대상 채널(FACT_PACKET·본 리포트 URL)과 **동일 엔티티를 벤치마크로 중복 나열하지 않는다**. (5) 링크는 **유효한 형식**으로 쓴다.
    
    ${algorithmInsightsJsonInstruction(locale, "channel")}

    ${webToolLine}
    ${outputFormatOnlyCh}
    
    ${readabilityImportantCh}
    ${buildStructuredReportRules("channel", locale)}
  `;

  try {
    const response = await withRetry(
      () =>
        getGeminiClient().models.generateContent({
          model: model,
          contents: prompt,
          config: {
            abortSignal: sig,
            ...(useWebTools
              ? {
                  tools: [{ googleSearch: {} }, { urlContext: {} }],
                  toolConfig: { includeServerSideToolInvocations: true },
                }
              : {}),
            maxOutputTokens: REPORT_MAX_OUTPUT_TOKENS_CHANNEL,
          },
        }),
      {
        ...GEMINI_GENERATE_RETRY,
        signal: sig,
        shouldRetry: (err) => isTransientGeminiError(err),
        onRetry: (err, retryRound, delayMs) => {
          console.warn(
            `[Gemini channel] 일시 오류 후 재시도 ${retryRound}/${GEMINI_GENERATE_RETRY.maxAttempts - 1} (${delayMs}ms 대기)`,
            err,
          );
        },
      },
    );

    let text = response.text || "";
    const finishReason = response.candidates?.[0]?.finishReason;
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map(chunk => chunk.web)
      .filter((web): web is { uri: string; title: string } => !!web?.uri);
    
    // Deduplicate by URI
    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

    const extractedInsights = extractAlgorithmInsightsFromMarkdown(text);
    text = extractedInsights.text;
    text = appendOutputTruncateNotice(text, finishReason, locale);
    const algorithmInsights = extractedInsights.algorithmInsights;

    const apiUsage = buildGeminiApiUsageSummary(model, response.usageMetadata);

    return { text, sources: uniqueSources, algorithmInsights, apiUsage };
  } catch (error) {
    console.error("Error analyzing channel:", error);
    throw error;
  }
}
