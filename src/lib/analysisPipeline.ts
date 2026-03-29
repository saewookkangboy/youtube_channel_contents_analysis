/**
 * 분석 파이프라인 (수집 → 정제 → LLM 분석·리포트)
 *
 * 단계:
 * 1. **수집(Collection)**: `runCollectPhaseInParallel`(`src/lib/analysisCollectParallel.ts`)에서 **YouTube Data API** 팩트 fetch와 **분석 준비**(개발 모드 오케스트레이션 동적 로드를 `Promise.all`로) **동시에** 진행한다. API 키가 없으면 팩트 레인은 즉시 `null`로 합류하고 준비 레인만 대기한다 — verify 단계의 OpenAI·Gemini **병렬 레인**과 동일한 병합 패턴이다.
 * 2. **정제(Refinement)**: 팩트를 짧은 키 JSON(FACT_PACKET)으로 압축·트렁케이트해 LLM 입력 토큰을 줄인다. 팩트가 있으면 **Gemini `text-embedding-004`** 의미 정렬 블록을 만든다. 프리패치된 dev 접미사가 없을 때는 임베딩 호출과 dev 접미사 로드를 **또 한 번 `Promise.all`로 병렬**한다(둘 다 Gemini 클라이언트·번들 경로를 쓰는 비독립 작업이지만 I/O 대기는 겹친다).
 * 3. **분석·리포트(Analysis & Report)**: **`GEMINI_API_KEY` 우선** — 있으면 Gemini가 단일 호출로 마크다운 리포트 + algorithmInsights JSON을 생성한다. Gemini 키가 없고 **`OPENAI_API_KEY`만** 있을 때만 OpenAI로 동일 역할을 수행한다(보조·폴백). 프롬프트에서 각 본문 섹션은 `##` 제목 한 줄로 시작하도록 고정해 `reportCompleteness` 헤딩 검사와 맞춘다.
 *
 * **회복력(Resilience)**: YouTube·Gemini·임베딩 호출은 `resilience` 모듈의 지수 백오프+지터 재시도로 일시적 장애(429/5xx·네트워크)를 흡수한다. (Harness/SRE 스타일의 배달 안정성 원칙을 프론트 외부 API 경로에 적용.)
 *
 * 데이터 흐름:
 *   App.handleAnalyze → **`runCollectPhaseInParallel`**: (YouTube Data API ∥ 분석 준비) → build*FactPacket → build*AnalyticsGroundingBlock(선택) → (선택, 병렬 가능) text-embedding-004 ∥ dev 접미사 → **메인 LLM 리포트(Gemini 우선, 없으면 OpenAI)** → **verify**: `runParallelReportVerification`(키가 있으면 OPENAI·GEMINI 병렬) → UI
 *
 * 팩트 우선 모드(`GeminiAnalysisOptions.factsOnly`): API 팩트가 있을 때만 웹 검색·URL 컨텍스트 도구를 끈다.
 *
 * 토큰 최적화 원칙:
 *   - 팩트는 반복 라벨 대신 짧은 키 JSON으로 한 번만 전달한다.
 *   - 설명·제목은 상한 문자로 자르고 공백을 정규화한다.
 *   - 리포트 품질에 필요한 섹션 지시는 geminiService에 유지한다(압축은 팩트 블록 위주).
 */

import type { YouTubeChannelData, YouTubeVideoData } from '../services/youtubeApiService';
import { isGeminiApiKeyConfigured } from '../services/geminiClient';
import { isOpenAiApiKeyConfigured } from '../services/openaiClient';
import {
  buildChannelAnalyticsCompact,
  buildVideoAnalyticsCompact,
} from './dataAnalysis';

export const PIPELINE_VERSION = '1';

/** 팩트 패킷에 넣을 설명 최대 길이(대략 토큰 절감용) */
export const MAX_VIDEO_DESCRIPTION_CHARS = 420;
export const MAX_CHANNEL_VIDEO_TITLE_CHARS = 96;
export const MAX_VIDEO_TAGS_IN_PACKET = 12;

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function truncate(s: string, max: number): string {
  const t = normalizeWhitespace(s);
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** 채널 팩트를 LLM용 짧은 JSON 문자열로 직렬화 */
export function buildChannelFactPacket(data: YouTubeChannelData): string {
  const rv = data.recentVideos.map((v) => ({
    t: truncate(v.title, MAX_CHANNEL_VIDEO_TITLE_CHARS),
    v: v.views,
    l: v.likes,
    c: v.comments,
    d: v.publishedAt,
  }));
  const payload = {
    _: PIPELINE_VERSION,
    cn: data.channelName,
    sc: data.subscriberCount,
    tv: data.totalViews,
    vc: data.videoCount,
    rv,
  };
  return `[FACT_PACKET|channel|v${PIPELINE_VERSION}]\n${JSON.stringify(payload)}\n위 JSON 키: cn=채널명, sc=구독자수, tv=총조회, vc=영상수, rv=최근영상(t 제목,v 조회,l 좋아요,c 댓글,d 업로드일). 이 수치는 YouTube Data API 팩트이며 리포트 \`## 0\`에서 원문 그대로 복사한 뒤, 이후 섹션의 동일 지표는 여기와 **반드시 일치**해야 한다. JSON 문자열을 바꾸거나 반올림해 새 숫자를 만들지 않는다.`;
}

/** 영상 팩트를 LLM용 짧은 JSON 문자열로 직렬화 */
export function buildVideoFactPacket(data: YouTubeVideoData): string {
  const tags = (data.tags ?? []).slice(0, MAX_VIDEO_TAGS_IN_PACKET);
  const payload = {
    _: PIPELINE_VERSION,
    id: data.id,
    t: truncate(data.title, MAX_CHANNEL_VIDEO_TITLE_CHARS),
    ch: data.channelTitle,
    pub: data.publishedAt,
    v: data.views,
    lk: data.likes,
    cm: data.comments,
    tags,
    desc: truncate(data.description, MAX_VIDEO_DESCRIPTION_CHARS),
  };
  return `[FACT_PACKET|video|v${PIPELINE_VERSION}]\n${JSON.stringify(payload)}\n위 JSON 키: t=제목,ch=채널,pub=업로드,v/lk/cm=조회·좋아요·댓글,desc=설명(일부). 이 수치는 YouTube Data API 팩트이며 리포트 \`## 0\`에서 원문 그대로 복사한 뒤, 이후 섹션의 동일 지표는 여기와 **반드시 일치**해야 한다. JSON 문자열을 바꾸거나 반올림해 새 숫자를 만들지 않는다.`;
}

/** 팩트에서 계산한 파생 지표만 전달해 모델이 동일 계산을 반복하지 않게 함(토큰·일관성) */
export function buildChannelAnalyticsGroundingBlock(data: YouTubeChannelData): string {
  const payload = buildChannelAnalyticsCompact(data);
  return `[ANALYTICS_PACKET|channel|v${PIPELINE_VERSION}]\n${JSON.stringify(payload)}\n키: sc=구독,tv=총조회,vc=영상수,n=최근샘플수,er/lr/cr=% 참여·좋아요·댓글률,rva=최근평균조회,cha=채널평균조회,rvr=최근/채널평균비, top={i,v}=최근 중 최고조회 인덱스·값. 본문(특히 섹션 1~2)에서 이 키 이름을 **최소 1회** 인용해 팩트 스냅샷 기반 계산임을 드러낸다. FACT_PACKET과 함께 우선한다.`;
}

export function buildVideoAnalyticsGroundingBlock(data: YouTubeVideoData): string {
  const payload = buildVideoAnalyticsCompact(data);
  return `[ANALYTICS_PACKET|video|v${PIPELINE_VERSION}]\n${JSON.stringify(payload)}\n키: er/lr/cr=% 참여·좋아요·댓글률,tg=태그수. 본문(특히 섹션 1~2)에서 er·lr·cr 중 최소 하나를 **키 이름과 함께** 인용한다. FACT_PACKET과 함께 우선한다.`;
}

export type AnalysisPipelineStage = 'collect' | 'refine' | 'report' | 'verify';

export function getPipelineStagesOrdered(): AnalysisPipelineStage[] {
  return ['collect', 'refine', 'report', 'verify'];
}

/** 메인 리포트 생성에 쓸 LLM 키가 하나라도 있으면 true */
export function isAnyMainReportLlmKeyConfigured(): boolean {
  return isGeminiApiKeyConfigured() || isOpenAiApiKeyConfigured();
}

/**
 * 메인 리포트 백엔드: Gemini API 키가 있으면 항상 Gemini를 쓰고,
 * 없을 때만 OpenAI를 사용한다(OpenAI는 보조·폴백).
 */
export function useOpenAiForMainReport(): boolean {
  return !isGeminiApiKeyConfigured() && isOpenAiApiKeyConfigured();
}
