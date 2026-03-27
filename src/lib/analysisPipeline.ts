/**
 * 분석 파이프라인 (수집 → 정제 → LLM 분석·리포트)
 *
 * 단계:
 * 1. **수집(Collection)**: URL에서 채널/영상 ID를 해석하고, 선택적으로 YouTube Data API로 메타·통계를 가져온다.
 * 2. **정제(Refinement)**: 팩트를 짧은 키 JSON(FACT_PACKET)으로 압축·트렁케이트해 LLM 입력 토큰을 줄인다.
 * 3. **분석·리포트(Analysis & Report)**: Gemini가 단일 호출로 마크다운 리포트 + algorithmInsights JSON을 생성한다.
 *
 * 데이터 흐름:
 *   App.handleAnalyze → youtubeApiService (선택) → build*FactPacket → (선택) text-embedding-004 의미 정렬 블록 → geminiService.generateContent → UI
 *
 * 팩트 우선 모드(`GeminiAnalysisOptions.factsOnly`): API 팩트가 있을 때만 웹 검색·URL 컨텍스트 도구를 끈다.
 *
 * 토큰 최적화 원칙:
 *   - 팩트는 반복 라벨 대신 짧은 키 JSON으로 한 번만 전달한다.
 *   - 설명·제목은 상한 문자로 자르고 공백을 정규화한다.
 *   - 리포트 품질에 필요한 섹션 지시는 geminiService에 유지한다(압축은 팩트 블록 위주).
 */

import type { YouTubeChannelData, YouTubeVideoData } from '../services/youtubeApiService';

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
  return `[FACT_PACKET|channel|v${PIPELINE_VERSION}]\n${JSON.stringify(payload)}\n위 JSON 키: cn=채널명, sc=구독자수, tv=총조회, vc=영상수, rv=최근영상(t 제목,v 조회,l 좋아요,c 댓글,d 업로드일). 이 수치는 API 팩트이며 팩트 섹션에 그대로 반영한다.`;
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
  return `[FACT_PACKET|video|v${PIPELINE_VERSION}]\n${JSON.stringify(payload)}\n위 JSON 키: t=제목,ch=채널,pub=업로드,v/lk/cm=조회·좋아요·댓글,desc=설명(일부). 이 수치는 API 팩트이며 팩트 섹션에 그대로 반영한다.`;
}

export type AnalysisPipelineStage = 'collect' | 'refine' | 'report';

export function getPipelineStagesOrdered(): AnalysisPipelineStage[] {
  return ['collect', 'refine', 'report'];
}
