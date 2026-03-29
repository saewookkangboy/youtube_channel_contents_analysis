import { describe, expect, it } from 'vitest';
import {
  aggregateRecentVideosStats,
  buildChannelAnalyticsCompact,
  computeEngagementRates,
  computeRecentVsChannelAvgRatio,
  parseStatInt,
} from '../src/lib/dataAnalysis';
import type { YouTubeChannelData } from '../src/services/youtubeApiService';

describe('dataAnalysis', () => {
  it('parseStatInt handles empty and numeric strings', () => {
    expect(parseStatInt('')).toBe(0);
    expect(parseStatInt('1200')).toBe(1200);
  });

  it('computeEngagementRates returns null rates when views are zero', () => {
    const r = computeEngagementRates(0, 10, 5);
    expect(r.engagementPct).toBeNull();
  });

  it('computeEngagementRates computes percentages', () => {
    const r = computeEngagementRates(1000, 50, 25);
    expect(r.engagementPct).toBeCloseTo(7.5);
    expect(r.likeRatePct).toBeCloseTo(5);
    expect(r.commentRatePct).toBeCloseTo(2.5);
  });

  it('aggregateRecentVideosStats sums recent list', () => {
    const agg = aggregateRecentVideosStats([
      { title: 'a', views: '100', likes: '10', comments: '2', publishedAt: '' },
      { title: 'b', views: '200', likes: '0', comments: '0', publishedAt: '' },
    ]);
    expect(agg.views).toBe(300);
    expect(agg.count).toBe(2);
  });

  it('computeRecentVsChannelAvgRatio', () => {
    expect(computeRecentVsChannelAvgRatio(200, 100)).toBe(2);
    expect(computeRecentVsChannelAvgRatio(null, 100)).toBeNull();
  });

  it('buildChannelAnalyticsCompact includes keys', () => {
    const data: YouTubeChannelData = {
      channelName: 'X',
      subscriberCount: '1000',
      totalViews: '10000',
      videoCount: '10',
      recentVideos: [
        { title: 't', views: '500', likes: '50', comments: '5', publishedAt: '2024-01-01' },
      ],
    };
    const c = buildChannelAnalyticsCompact(data);
    expect(c.sc).toBe(1000);
    expect(c.n).toBe(1);
    expect(c.top).toEqual({ i: 0, v: 500 });
  });
});
