/**
 * YouTube API 팩트 기반 순수 수치·파생 지표 (LLM 재추론 부담 감소, UI·ANALYTICS_PACKET 공용)
 */

import type { YouTubeChannelData, YouTubeVideoData } from '../services/youtubeApiService';

export function parseStatInt(s: string | undefined | null): number {
  if (s == null || s === '') return 0;
  const n = parseInt(String(s), 10);
  return Number.isFinite(n) ? n : 0;
}

export interface EngagementRates {
  views: number;
  likes: number;
  comments: number;
  /** (likes+comments)/views * 100 */
  engagementPct: number | null;
  likeRatePct: number | null;
  commentRatePct: number | null;
}

export function computeEngagementRates(views: number, likes: number, comments: number): EngagementRates {
  const v = Math.max(0, views);
  const l = Math.max(0, likes);
  const c = Math.max(0, comments);
  if (v <= 0) {
    return {
      views: v,
      likes: l,
      comments: c,
      engagementPct: null,
      likeRatePct: null,
      commentRatePct: null,
    };
  }
  return {
    views: v,
    likes: l,
    comments: c,
    engagementPct: ((l + c) / v) * 100,
    likeRatePct: (l / v) * 100,
    commentRatePct: (c / v) * 100,
  };
}

/** 최근 영상 목록 집계(채널 사이드바·ANALYTICS_PACKET용) */
export function aggregateRecentVideosStats(videos: YouTubeChannelData['recentVideos']) {
  let views = 0;
  let likes = 0;
  let comments = 0;
  for (const v of videos) {
    views += parseStatInt(v.views);
    likes += parseStatInt(v.likes);
    comments += parseStatInt(v.comments);
  }
  return { views, likes, comments, count: videos.length };
}

export function computeRecentVsChannelAvgRatio(
  recentAvgViews: number | null,
  channelAvgViews: number | null,
): number | null {
  if (recentAvgViews === null || channelAvgViews === null || channelAvgViews <= 0) return null;
  return recentAvgViews / channelAvgViews;
}

/** ANALYTICS_PACKET용 초소형 JSON (토큰 절약) */
export function buildChannelAnalyticsCompact(data: YouTubeChannelData): Record<string, unknown> {
  const { recentVideos } = data;
  const agg = aggregateRecentVideosStats(recentVideos);
  const er = computeEngagementRates(agg.views, agg.likes, agg.comments);
  const totalViews = parseStatInt(data.totalViews);
  const videoCount = parseStatInt(data.videoCount);
  const chAvg = videoCount > 0 ? totalViews / videoCount : null;
  const recentAvg = agg.count > 0 ? agg.views / agg.count : null;
  const rvRatio = computeRecentVsChannelAvgRatio(recentAvg, chAvg);

  let topIdx = -1;
  let topV = -1;
  recentVideos.forEach((v, i) => {
    const vv = parseStatInt(v.views);
    if (vv > topV) {
      topV = vv;
      topIdx = i;
    }
  });

  return {
    sc: parseStatInt(data.subscriberCount),
    tv: totalViews,
    vc: videoCount,
    n: agg.count,
    er: er.engagementPct != null ? Math.round(er.engagementPct * 100) / 100 : null,
    lr: er.likeRatePct != null ? Math.round(er.likeRatePct * 100) / 100 : null,
    cr: er.commentRatePct != null ? Math.round(er.commentRatePct * 100) / 100 : null,
    rva: recentAvg != null ? Math.round(recentAvg) : null,
    cha: chAvg != null ? Math.round(chAvg) : null,
    rvr: rvRatio != null ? Math.round(rvRatio * 1000) / 1000 : null,
    top: topIdx >= 0 ? { i: topIdx, v: topV } : null,
  };
}

export function buildVideoAnalyticsCompact(data: YouTubeVideoData): Record<string, unknown> {
  const views = parseStatInt(data.views);
  const likes = parseStatInt(data.likes);
  const comments = parseStatInt(data.comments);
  const er = computeEngagementRates(views, likes, comments);
  return {
    id: data.id,
    er: er.engagementPct != null ? Math.round(er.engagementPct * 100) / 100 : null,
    lr: er.likeRatePct != null ? Math.round(er.likeRatePct * 100) / 100 : null,
    cr: er.commentRatePct != null ? Math.round(er.commentRatePct * 100) / 100 : null,
    tg: (data.tags ?? []).length,
  };
}
