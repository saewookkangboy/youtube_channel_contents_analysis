/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  analyzeYouTubeChannel,
  analyzeYouTubeVideo,
  AlgorithmInsight,
  type GeminiAnalysisOptions,
} from './services/geminiService';
import {
  analyzeYouTubeChannelWithOpenAI,
  analyzeYouTubeVideoWithOpenAI,
} from './services/openaiReportService';
import type { YouTubeChannelData, YouTubeVideoData } from './services/youtubeApiService';
import { runCollectPhaseInParallel } from './lib/analysisCollectParallel';
import {
  buildChannelAnalyticsGroundingBlock,
  buildChannelFactPacket,
  buildVideoAnalyticsGroundingBlock,
  buildVideoFactPacket,
  isAnyMainReportLlmKeyConfigured,
  useOpenAiForMainReport,
} from './lib/analysisPipeline';
import {
  canRunAnyVerification,
  runParallelReportVerification,
  type VerifyUiState,
} from './services/reportVerificationService';
import { AnalysisMarkdown } from './components/AnalysisMarkdown';
import { ReportVerificationPanel } from './components/ReportVerificationPanel';
import { GeminiUsageCard } from './components/GeminiUsageCard';
import { BetaAutomationLab } from './components/BetaAutomationLab';
import type { GeminiApiUsageSummary } from './lib/geminiApiUsage';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Youtube, 
  BarChart3,
  TrendingUp, 
  Info,
  Loader2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Download,
  Globe,
  Video,
  LayoutDashboard,
  FlaskConical,
  AlertTriangle,
  RefreshCw,
  Table2,
  ListChecks,
  Activity,
  CircleX,
} from 'lucide-react';
import { cn } from './lib/cn';
import {
  analysisErrorTranslationKeyForChannel,
  analysisErrorTranslationKeyForVideo,
  classifyAnalysisError,
} from './lib/analysisErrors';
import {
  analyzeReportCompleteness,
  buildReportCompletenessAppendix,
  CHECKLIST_GAP_TRANSLATION_KEY,
} from './lib/reportCompleteness';
import { useI18n } from './i18n/I18nContext';
import { wrapReportDocumentHtml } from './lib/wrapReportDocumentHtml';
import {
  aggregateRecentVideosStats,
  computeEngagementRates,
  computeRecentVsChannelAvgRatio,
  parseStatInt,
} from './lib/dataAnalysis';
import { recordAnalysisEpisode } from './dev/analysisReinforcement';
import { DevAgentKitPanel } from './dev/DevAgentKitPanel';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  CHANNEL_REPORT_PREVIEW_MARKDOWN,
  VIDEO_REPORT_PREVIEW_MARKDOWN,
} from './dev/reportPreviewFixtures';
import type {
  KoreanNaturalnessIntensity,
  KoreanNaturalnessTone,
} from './lib/reportMarkdownUtils';

function devReportPreviewBoot(): {
  tab: 'channel' | 'video';
  channelUrl: string;
  videoUrl: string;
  channelMd: string | null;
  videoMd: string | null;
} | null {
  const allowReportPreview =
    import.meta.env.DEV || import.meta.env.VITE_E2E_REPORT_PREVIEW === '1';
  if (!allowReportPreview || typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search).get('reportPreview');
  if (!p) return null;
  const channelUrl =
    p === 'channel' || p === 'both' ? 'https://www.youtube.com/channel/UC_preview' : '';
  const videoUrlStr =
    p === 'video' || p === 'both' ? 'https://www.youtube.com/watch?v=preview' : '';
  return {
    tab: p === 'video' ? 'video' : 'channel',
    channelUrl,
    videoUrl: videoUrlStr,
    channelMd: p === 'channel' || p === 'both' ? CHANNEL_REPORT_PREVIEW_MARKDOWN : null,
    videoMd: p === 'video' || p === 'both' ? VIDEO_REPORT_PREVIEW_MARKDOWN : null,
  };
}

function initialActiveTab(): 'channel' | 'video' | 'beta' {
  if (typeof window !== 'undefined') {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'beta') return 'beta';
  }
  return devReportPreviewBoot()?.tab ?? 'channel';
}

export default function App() {
  const { locale, t, setLocale } = useI18n();
  const [activeTab, setActiveTab] = useState<'channel' | 'video' | 'beta'>(
    () => initialActiveTab(),
  );
  const isAnalysisTab = activeTab === 'channel' || activeTab === 'video';
  const analysisTab: 'channel' | 'video' = activeTab === 'video' ? 'video' : 'channel';

  // Channel State
  const [url, setUrl] = useState(() => devReportPreviewBoot()?.channelUrl ?? '');
  const [analysis, setAnalysis] = useState<string | null>(() => devReportPreviewBoot()?.channelMd ?? null);
  const [sources, setSources] = useState<{title?: string, uri: string}[]>([]);
  const [channelData, setChannelData] = useState<YouTubeChannelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [algorithmInsights, setAlgorithmInsights] = useState<AlgorithmInsight[] | null>(null);

  // Video State
  const [videoUrl, setVideoUrl] = useState(() => devReportPreviewBoot()?.videoUrl ?? '');
  const [videoAnalysis, setVideoAnalysis] = useState<string | null>(
    () => devReportPreviewBoot()?.videoMd ?? null,
  );
  const [videoSources, setVideoSources] = useState<{title?: string, uri: string}[]>([]);
  const [videoData, setVideoData] = useState<YouTubeVideoData | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoAlgorithmInsights, setVideoAlgorithmInsights] = useState<AlgorithmInsight[] | null>(null);

  const [channelApiUsage, setChannelApiUsage] = useState<GeminiApiUsageSummary | null>(null);
  const [videoApiUsage, setVideoApiUsage] = useState<GeminiApiUsageSummary | null>(null);
  const [channelVerify, setChannelVerify] = useState<VerifyUiState | null>(null);
  const [videoVerify, setVideoVerify] = useState<VerifyUiState | null>(null);
  const [sessionGeminiUsage, setSessionGeminiUsage] = useState({
    requestCount: 0,
    totalCostUsd: 0,
    totalPromptTokens: 0,
    totalCandidatesTokens: 0,
    totalReasoningTokens: 0,
  });

  /** YouTube Data API로 팩트를 가져온 뒤 웹 검색·URL 도구를 끄고 비용·지연을 줄임 (키가 있으면 기본 켜기 → Fact 기반 출력 우선) */
  const [factsOnlyMode, setFactsOnlyMode] = useState(
    () => Boolean(import.meta.env.VITE_YOUTUBE_API_KEY),
  );
  const [koreanNaturalnessTone, setKoreanNaturalnessTone] =
    useState<KoreanNaturalnessTone>('default');
  const [koreanNaturalnessIntensity, setKoreanNaturalnessIntensity] =
    useState<KoreanNaturalnessIntensity>('medium');
  const hasYtApiKey = Boolean(import.meta.env.VITE_YOUTUBE_API_KEY);
  /** 로컬 전용: 분석 프롬프트 형식 보강 접미사 (프로덕션 번들에서 동적 청크 제외) */
  const devAgentOrchestration =
    import.meta.env.DEV && import.meta.env.VITE_DEV_AGENT_ORCHESTRATION === '1';

  const mountedRef = useRef(true);
  const channelAbortRef = useRef<AbortController | null>(null);
  const videoAbortRef = useRef<AbortController | null>(null);
  const channelVerifyAbortRef = useRef<AbortController | null>(null);
  const videoVerifyAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      channelAbortRef.current?.abort();
      videoAbortRef.current?.abort();
      channelVerifyAbortRef.current?.abort();
      videoVerifyAbortRef.current?.abort();
    };
  }, []);

  const handleCancelAnalyze = () => {
    if (analysisTab === 'channel') {
      channelAbortRef.current?.abort();
      channelAbortRef.current = null;
      setLoading(false);
      setError(null);
    } else {
      videoAbortRef.current?.abort();
      videoAbortRef.current = null;
      setVideoLoading(false);
      setVideoError(null);
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAnalysisTab) return;

    const useOpenAi = useOpenAiForMainReport();
    if (!isAnyMainReportLlmKeyConfigured()) {
      const msg = t('errNoLlmKey');
      if (activeTab === 'channel') {
        setError(msg);
      } else {
        setVideoError(msg);
      }
      return;
    }

    if (analysisTab === 'channel') {
      if (!url) return;
      channelAbortRef.current?.abort();
      const ac = new AbortController();
      channelAbortRef.current = ac;
      const signal = ac.signal;

      channelVerifyAbortRef.current?.abort();
      channelVerifyAbortRef.current = null;
      setChannelVerify(null);

      setLoading(true);
      setError(null);
      setAnalysis(null);
      setSources([]);
      setChannelData(null);
      setAlgorithmInsights(null);
      setChannelApiUsage(null);
      const runStarted = performance.now();

      try {
        const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
        const { rawData, prefetchedDevOrchestrationBlock } = await runCollectPhaseInParallel({
          kind: 'channel',
          url,
          youtubeApiKey: apiKey || undefined,
          options: { signal, outputLocale: locale, devAgentOrchestration },
        });

        if (!mountedRef.current || channelAbortRef.current !== ac) return;
        setChannelData(rawData);
        const geminiOpts: GeminiAnalysisOptions = {
          factsOnly: hasYtApiKey && factsOnlyMode,
          outputLocale: locale,
          signal,
          devAgentOrchestration,
          prefetchedDevOrchestrationBlock,
          koreanNaturalnessTone,
          koreanNaturalnessIntensity,
        };
        const result = useOpenAi
          ? await analyzeYouTubeChannelWithOpenAI(url, rawData, geminiOpts)
          : await analyzeYouTubeChannel(url, rawData, geminiOpts);

        if (!mountedRef.current || channelAbortRef.current !== ac) return;
        setAnalysis(result.text || t('resultEmpty'));
        setSources(result.sources || []);
        setAlgorithmInsights(result.algorithmInsights || null);
        setChannelApiUsage(result.apiUsage);
        if (import.meta.env.DEV) {
          const textForC = result.text || '';
          const completeness = analyzeReportCompleteness('channel', textForC, locale);
          recordAnalysisEpisode({
            at: new Date().toISOString(),
            kind: 'channel',
            ok: true,
            durationMs: Math.round(performance.now() - runStarted),
            promptTokens: result.apiUsage?.usage.inputTokens ?? 0,
            outputTokens: result.apiUsage?.usage.outputTokens ?? 0,
            completenessOk: completeness.ok,
          });
        }
        if (result.apiUsage && !result.apiUsage.noMetadata) {
          setSessionGeminiUsage((prev) => ({
            requestCount: prev.requestCount + 1,
            totalCostUsd: prev.totalCostUsd + (result.apiUsage!.costs?.totalCost ?? 0),
            totalPromptTokens: prev.totalPromptTokens + result.apiUsage!.usage.inputTokens,
            totalCandidatesTokens: prev.totalCandidatesTokens + result.apiUsage!.usage.outputTokens,
            totalReasoningTokens:
              prev.totalReasoningTokens + (result.apiUsage!.usage.outputTokenDetails?.reasoningTokens ?? 0),
          }));
        }

        const grounding =
          rawData != null
            ? `${buildChannelFactPacket(rawData)}\n${buildChannelAnalyticsGroundingBlock(rawData)}`
            : '';
        channelVerifyAbortRef.current?.abort();
        const vac = new AbortController();
        channelVerifyAbortRef.current = vac;
        if (canRunAnyVerification()) {
          setChannelVerify({ phase: 'running' });
          const reportMd = result.text || '';
          void runParallelReportVerification({
            kind: 'channel',
            targetUrl: url,
            groundingContext: grounding,
            reportMarkdown: reportMd,
            locale,
            signal: vac.signal,
          }).then((res) => {
            if (!mountedRef.current || channelVerifyAbortRef.current !== vac) return;
            setChannelVerify({ phase: 'complete', result: res });
          });
        } else {
          setChannelVerify(null);
        }
      } catch (err) {
        if (!mountedRef.current || channelAbortRef.current !== ac) return;
        const kind = classifyAnalysisError(err);
        if (kind !== 'aborted') {
          setError(t(analysisErrorTranslationKeyForChannel(kind)));
        } else {
          setError(null);
        }
        console.error(err);
      } finally {
        if (channelAbortRef.current === ac) {
          channelAbortRef.current = null;
          if (mountedRef.current) setLoading(false);
        }
      }
    } else {
      if (!videoUrl) return;
      videoAbortRef.current?.abort();
      const ac = new AbortController();
      videoAbortRef.current = ac;
      const signal = ac.signal;

      videoVerifyAbortRef.current?.abort();
      videoVerifyAbortRef.current = null;
      setVideoVerify(null);

      setVideoLoading(true);
      setVideoError(null);
      setVideoAnalysis(null);
      setVideoSources([]);
      setVideoData(null);
      setVideoAlgorithmInsights(null);
      setVideoApiUsage(null);
      const runStarted = performance.now();

      try {
        const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
        const { rawData, prefetchedDevOrchestrationBlock } = await runCollectPhaseInParallel({
          kind: 'video',
          url: videoUrl,
          youtubeApiKey: apiKey || undefined,
          options: { signal, outputLocale: locale, devAgentOrchestration },
        });

        if (!mountedRef.current || videoAbortRef.current !== ac) return;
        setVideoData(rawData);
        const geminiOpts: GeminiAnalysisOptions = {
          factsOnly: hasYtApiKey && factsOnlyMode,
          outputLocale: locale,
          signal,
          devAgentOrchestration,
          prefetchedDevOrchestrationBlock,
          koreanNaturalnessTone,
          koreanNaturalnessIntensity,
        };
        const result = useOpenAi
          ? await analyzeYouTubeVideoWithOpenAI(videoUrl, rawData, geminiOpts)
          : await analyzeYouTubeVideo(videoUrl, rawData, geminiOpts);

        if (!mountedRef.current || videoAbortRef.current !== ac) return;
        setVideoAnalysis(result.text || t('resultEmpty'));
        setVideoSources(result.sources || []);
        setVideoAlgorithmInsights(result.algorithmInsights || null);
        setVideoApiUsage(result.apiUsage);
        if (import.meta.env.DEV) {
          const textForV = result.text || '';
          const completeness = analyzeReportCompleteness('video', textForV, locale);
          recordAnalysisEpisode({
            at: new Date().toISOString(),
            kind: 'video',
            ok: true,
            durationMs: Math.round(performance.now() - runStarted),
            promptTokens: result.apiUsage?.usage.inputTokens ?? 0,
            outputTokens: result.apiUsage?.usage.outputTokens ?? 0,
            completenessOk: completeness.ok,
          });
        }
        if (result.apiUsage && !result.apiUsage.noMetadata) {
          setSessionGeminiUsage((prev) => ({
            requestCount: prev.requestCount + 1,
            totalCostUsd: prev.totalCostUsd + (result.apiUsage!.costs?.totalCost ?? 0),
            totalPromptTokens: prev.totalPromptTokens + result.apiUsage!.usage.inputTokens,
            totalCandidatesTokens: prev.totalCandidatesTokens + result.apiUsage!.usage.outputTokens,
            totalReasoningTokens:
              prev.totalReasoningTokens + (result.apiUsage!.usage.outputTokenDetails?.reasoningTokens ?? 0),
          }));
        }

        const videoGrounding =
          rawData != null
            ? `${buildVideoFactPacket(rawData)}\n${buildVideoAnalyticsGroundingBlock(rawData)}`
            : '';
        videoVerifyAbortRef.current?.abort();
        const vvac = new AbortController();
        videoVerifyAbortRef.current = vvac;
        if (canRunAnyVerification()) {
          setVideoVerify({ phase: 'running' });
          const reportMdV = result.text || '';
          void runParallelReportVerification({
            kind: 'video',
            targetUrl: videoUrl,
            groundingContext: videoGrounding,
            reportMarkdown: reportMdV,
            locale,
            signal: vvac.signal,
          }).then((res) => {
            if (!mountedRef.current || videoVerifyAbortRef.current !== vvac) return;
            setVideoVerify({ phase: 'complete', result: res });
          });
        } else {
          setVideoVerify(null);
        }
      } catch (err) {
        if (!mountedRef.current || videoAbortRef.current !== ac) return;
        const kind = classifyAnalysisError(err);
        if (kind !== 'aborted') {
          setVideoError(t(analysisErrorTranslationKeyForVideo(kind)));
        } else {
          setVideoError(null);
        }
        console.error(err);
      } finally {
        if (videoAbortRef.current === ac) {
          videoAbortRef.current = null;
          if (mountedRef.current) setVideoLoading(false);
        }
      }
    }
  };

  const handleDownloadMarkdown = () => {
    if (!currentAnalysis) return;
    const completeness = analyzeReportCompleteness(analysisTab, currentAnalysis, locale);
    const appendix = buildReportCompletenessAppendix(
      completeness.missingLabels,
      {
        algorithmSeoTableMissing: completeness.algorithmSeoTableMissing,
        algorithmSeoChecklistColumnsIncomplete: completeness.algorithmSeoChecklistColumnsIncomplete,
        algorithmSeoChecklistColumnGaps: completeness.algorithmSeoChecklistColumnGaps,
      },
      locale,
    );
    const blob = new Blob([currentAnalysis + appendix], { type: 'text/markdown;charset=utf-8' });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = analysisTab === 'channel' ? t('downloadFilenameChannel') : t('downloadFilenameVideo');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(urlObj);
  };

  const handleViewAsWebPage = () => {
    const currentAnalysis = activeTab === 'channel' ? analysis : videoAnalysis;
    if (!currentAnalysis) return;
    const reportElement = document.getElementById('report-content');
    if (!reportElement) return;
    
    const htmlContent = wrapReportDocumentHtml(reportElement.innerHTML, {
      lang: locale === 'en' ? 'en' : 'ko',
      title: t('reportViewerTitle'),
    });
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  const currentAnalysis = analysisTab === 'channel' ? analysis : videoAnalysis;
  const currentVerify = analysisTab === 'channel' ? channelVerify : videoVerify;
  const currentLoading = analysisTab === 'channel' ? loading : videoLoading;
  const currentError = analysisTab === 'channel' ? error : videoError;
  const currentSources = analysisTab === 'channel' ? sources : videoSources;
  const currentUrl = analysisTab === 'channel' ? url : videoUrl;
  const currentAlgorithmInsights = analysisTab === 'channel' ? algorithmInsights : videoAlgorithmInsights;
  const currentApiUsage = analysisTab === 'channel' ? channelApiUsage : videoApiUsage;

  const reportCompleteness = useMemo(() => {
    if (!currentAnalysis) {
      return null;
    }
    return analyzeReportCompleteness(analysisTab, currentAnalysis, locale);
  }, [analysisTab, currentAnalysis, locale]);

  /** 조회 대비 참여·반응 비율 및 채널 맥락 지표 (API 데이터가 있을 때만 수치 표시) */
  const operationalKpi = useMemo(() => {
    const fmtPct = (n: number | null, digits = 2) => {
      if (n === null || Number.isNaN(n)) return '—';
      if (n > 0 && n < 10 ** -digits) return `<0.${'0'.repeat(digits - 1)}1%`;
      return `${n.toFixed(digits)}%`;
    };

    /** 대략 0~10% 구간이 막대 전체를 쓰도록 스케일 */
    const rateBar = (pct: number | null) =>
      pct === null || Number.isNaN(pct) ? 0 : Math.min(100, pct * 10);

    if (analysisTab === 'video' && videoData) {
      const views = parseStatInt(videoData.views);
      const likes = parseStatInt(videoData.likes);
      const comments = parseStatInt(videoData.comments);
      const er = computeEngagementRates(views, likes, comments);
      const engagementPct = er.engagementPct;
      const likeRatePct = er.likeRatePct;
      const commentRatePct = er.commentRatePct;
      return {
        scopeLabel: t('kpiScopeVideo'),
        rows: [
          { key: 'engagement', label: t('kpiEngagement'), hint: t('kpiHintEngagement'), value: fmtPct(engagementPct), barFill: rateBar(engagementPct) },
          { key: 'like', label: t('kpiLikeRate'), hint: t('kpiHintLike'), value: fmtPct(likeRatePct), barFill: rateBar(likeRatePct) },
          { key: 'comment', label: t('kpiCommentRate'), hint: t('kpiHintComment'), value: fmtPct(commentRatePct), barFill: rateBar(commentRatePct) },
        ],
        footnote:
          views === 0
            ? t('kpiFootnoteNoViewsVideo')
            : t('kpiFootnoteLowVideo'),
      };
    }

    if (analysisTab === 'channel' && channelData && channelData.recentVideos.length > 0) {
      const { recentVideos } = channelData;
      const agg = aggregateRecentVideosStats(recentVideos);
      const er = computeEngagementRates(agg.views, agg.likes, agg.comments);
      const engagementPct = er.engagementPct;
      const likeRatePct = er.likeRatePct;
      const commentRatePct = er.commentRatePct;

      const totalViews = parseStatInt(channelData.totalViews);
      const videoCount = parseStatInt(channelData.videoCount);
      const channelAvgViews = videoCount > 0 ? totalViews / videoCount : null;
      const recentAvgViews = agg.count > 0 ? agg.views / agg.count : null;
      let recentVsChannel: string | null = null;
      let recentVsBarFill = 0;
      const ratio = computeRecentVsChannelAvgRatio(recentAvgViews, channelAvgViews);
      if (ratio !== null) {
        recentVsBarFill = Math.min(100, ratio * 50);
        recentVsChannel = `${ratio >= 1 ? '+' : ''}${((ratio - 1) * 100).toFixed(0)}%`;
      }

      const baseRows = [
        { key: 'engagement', label: t('kpiEngagement'), hint: t('kpiHintEngagement'), value: fmtPct(engagementPct), barFill: rateBar(engagementPct) },
        { key: 'like', label: t('kpiLikeRate'), hint: t('kpiHintLike'), value: fmtPct(likeRatePct), barFill: rateBar(likeRatePct) },
        { key: 'comment', label: t('kpiCommentRate'), hint: t('kpiHintComment'), value: fmtPct(commentRatePct), barFill: rateBar(commentRatePct) },
      ];
      const rows =
        recentVsChannel !== null
          ? [
              ...baseRows,
              {
                key: 'recentVsAvg',
                label: t('kpiRecentVsAvg'),
                hint: t('kpiHintRecentVs'),
                value: recentVsChannel,
                barFill: recentVsBarFill,
              },
            ]
          : baseRows;

      return {
        scopeLabel: t('kpiScopeChannel', recentVideos.length),
        rows,
        footnote:
          agg.views === 0
            ? t('kpiFootnoteNoViewsChannel')
            : t('kpiFootnoteLowChannel'),
      };
    }

    return {
      scopeLabel: null as string | null,
      rows: [] as { key: string; label: string; hint: string; value: string; barFill: number }[],
      footnote: t('kpiFootnoteNeedApi'),
    };
  }, [analysisTab, videoData, channelData, locale, t]);

  const [compactChart, setCompactChart] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setCompactChart(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-orange-200">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 md:shrink-0">
            <div className="flex min-w-0 items-center gap-2">
              <div className="shrink-0 rounded-lg bg-red-600 p-2">
                <Youtube className="h-6 w-6 text-white" />
              </div>
              <h1 className="min-w-0 truncate text-lg font-bold tracking-tight sm:text-xl">{t('brandTitle')}</h1>
            </div>
            <div
              className="flex shrink-0 items-center gap-0.5 rounded-full border border-gray-200 bg-white p-0.5 shadow-sm"
              role="group"
              aria-label={t('langToggleAria')}
            >
              <button
                type="button"
                onClick={() => setLocale('ko')}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                  locale === 'ko' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800',
                )}
              >
                {t('langKo')}
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                  locale === 'en' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800',
                )}
              >
                {t('langEn')}
              </button>
            </div>
          </div>

          <div className="flex justify-center md:justify-start">
            <div className="inline-flex w-full max-w-md rounded-full bg-gray-100 p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('channel')}
                className={cn(
                  'flex min-h-11 min-w-0 flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all sm:flex-initial sm:px-4',
                  activeTab === 'channel'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-500 hover:text-black',
                )}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>{t('tabChannel')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('video')}
                className={cn(
                  'flex min-h-11 min-w-0 flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all sm:flex-initial sm:px-4',
                  activeTab === 'video'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-500 hover:text-black',
                )}
              >
                <Video className="h-4 w-4 shrink-0" />
                <span>{t('tabVideo')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('beta')}
                className={cn(
                  'flex min-h-11 min-w-0 flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all sm:flex-initial sm:px-4',
                  activeTab === 'beta'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-500 hover:text-black',
                )}
              >
                <FlaskConical className="h-4 w-4 shrink-0" />
                <span>Beta</span>
              </button>
            </div>
          </div>

          {isAnalysisTab ? (
            <form
              onSubmit={handleAnalyze}
              className="flex w-full flex-col gap-2 md:max-w-xl md:flex-1 md:gap-2"
            >
            <div className="flex w-full flex-col gap-2 md:flex-row md:items-stretch md:gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  enterKeyHint="search"
                  autoComplete="url"
                  inputMode="url"
                  value={currentUrl}
                  onChange={(e) =>
                    analysisTab === 'channel' ? setUrl(e.target.value) : setVideoUrl(e.target.value)
                  }
                  placeholder={
                    analysisTab === 'channel' ? t('placeholderChannel') : t('placeholderVideo')
                  }
                  className="min-h-11 w-full rounded-full border-none bg-gray-100 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="flex shrink-0 gap-2">
                {currentLoading && (
                  <button
                    type="button"
                    onClick={handleCancelAnalyze}
                    aria-label={t('cancelAnalyze')}
                    className="flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    <CircleX className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="hidden sm:inline">{t('cancelAnalyze')}</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={currentLoading}
                  className="flex min-h-11 shrink-0 touch-manipulation items-center justify-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                >
                  {currentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('analyze')}
                </button>
              </div>
            </div>
              {hasYtApiKey && (
              <label
                className="flex cursor-pointer items-start gap-2.5 px-1 text-left text-xs leading-snug text-gray-600 md:items-center"
                title={t('factsOnlyTooltip')}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-red-600 focus:ring-red-500 md:mt-0"
                  checked={factsOnlyMode}
                  onChange={(e) => setFactsOnlyMode(e.target.checked)}
                />
                <span>
                  <span className="font-medium text-gray-700">{t('factsOnlyTitle')}</span>
                  <span className="text-gray-500"> {t('factsOnlyHint')}</span>
                </span>
              </label>
            )}
              {locale === 'ko' && (
              <div className="flex flex-wrap items-center gap-3 px-1 text-xs text-gray-600">
                <label className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">{t('koreanToneTitle')}</span>
                  <select
                    value={koreanNaturalnessTone}
                    onChange={(e) => setKoreanNaturalnessTone(e.target.value as KoreanNaturalnessTone)}
                    className="min-h-9 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="default">{t('koreanToneDefault')}</option>
                    <option value="formal">{t('koreanToneFormal')}</option>
                    <option value="casual">{t('koreanToneCasual')}</option>
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">{t('koreanIntensityTitle')}</span>
                  <select
                    value={koreanNaturalnessIntensity}
                    onChange={(e) =>
                      setKoreanNaturalnessIntensity(e.target.value as KoreanNaturalnessIntensity)
                    }
                    className="min-h-9 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="low">{t('koreanIntensityLow')}</option>
                    <option value="medium">{t('koreanIntensityMedium')}</option>
                    <option value="high">{t('koreanIntensityHigh')}</option>
                  </select>
                </label>
              </div>
            )}
            </form>
          ) : (
            <div className="w-full md:max-w-xl md:flex-1">
              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm text-violet-800">
                {t('betaTabPlaceholder')}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {!isAnalysisTab ? (
          <BetaAutomationLab locale={locale} />
        ) : (
        <AnimatePresence mode="wait">
          {!currentAnalysis && !currentLoading && !currentError && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center px-1 py-12 text-center sm:py-20"
            >
              <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <Sparkles className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h2 className="mb-2 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{t('emptyStateTitle')}</h2>
                <p className="text-gray-600 mb-3 text-[15px] leading-relaxed">
                  {activeTab === 'channel' ? t('emptyStateChannel') : t('emptyStateVideo')}
                </p>
                <p className="text-left text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
                  <span className="font-semibold text-gray-600">{t('emptyStateScopeLead')}</span>
                  {t('emptyStateScopeBody')}
                </p>
              </div>
            </motion.div>
          )}

          {currentLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative">
                <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Youtube className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <p className="mt-4 text-center text-gray-500 font-medium animate-pulse">
                {hasYtApiKey ? t('loadingPipelineParallel') : t('loadingWeb')}
              </p>
              <button
                type="button"
                onClick={handleCancelAnalyze}
                className="mt-6 flex touch-manipulation items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
              >
                <CircleX className="h-4 w-4 shrink-0" aria-hidden />
                {t('cancelAnalyze')}
              </button>
            </motion.div>
          )}

          {currentError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto max-w-2xl rounded-2xl border border-red-100 bg-red-50 px-4 py-6 text-center text-red-600 sm:px-6"
            >
              <Info className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">{currentError}</p>
              <button 
                onClick={() => handleAnalyze()}
                className="mt-4 text-sm underline font-bold"
              >
                {t('retry')}
              </button>
            </motion.div>
          )}

          {currentAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8"
            >
              {/* Sidebar Stats / Info */}
              <div className="min-w-0 space-y-6 lg:col-span-1">
                  {analysisTab === 'channel' ? (
                  <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                      <BarChart3 className="h-4 w-4 shrink-0" /> {t('sidebarChannelMetrics')}
                    </h3>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      {t('growthDiagP0')}
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3">
                        <span className="min-w-0 text-sm font-medium text-gray-800">{t('metric24h')}</span>
                        <span className="shrink-0 text-xs font-bold text-amber-800">{t('metric24hBadge')}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3">
                        <span className="min-w-0 text-sm font-medium text-gray-800">{t('metricSatisfaction')}</span>
                        <span className="shrink-0 text-xs font-bold text-amber-800">{t('metricSatisfactionBadge')}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3">
                        <span className="min-w-0 text-sm font-medium text-gray-800">{t('metric7d')}</span>
                        <span className="shrink-0 text-xs font-bold text-amber-800">{t('metric7dBadge')}</span>
                      </div>
                    </div>
                    <p className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      {t('reportSections')}
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">{t('secPerformance')}</span>
                        <span className="text-sm font-bold text-red-600">{t('badgeEnhanced')}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">{t('secMonetization')}</span>
                        <span className="text-sm font-bold text-blue-600">{t('badgeIncluded')}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">{t('secAlgoThumb')}</span>
                        <span className="text-sm font-bold text-orange-600">{t('badgeEnhanced')}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">{t('secTitles')}</span>
                        <span className="text-sm font-bold text-purple-600">{t('badgeIncluded')}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">{t('secEngagement')}</span>
                        <span className="text-sm font-bold text-green-600">{t('badgeIncluded')}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">{t('secSchedule')}</span>
                        <span className="text-sm font-bold text-indigo-600">{t('badgeIncluded')}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">{t('secSeries')}</span>
                        <span className="text-sm font-bold text-pink-600">{t('badgeIncluded')}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">{t('secQuality')}</span>
                        <span className="text-sm font-bold text-teal-600">{t('badgeIncluded')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> {t('videoApiMetrics')}
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                          <span className="text-sm text-gray-500">{t('views')}</span>
                          <span className="text-sm font-bold text-red-600">{videoData?.views ? parseInt(videoData.views).toLocaleString() : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                          <span className="text-sm text-gray-500">{t('likes')}</span>
                          <span className="text-sm font-bold text-blue-600">{videoData?.likes ? parseInt(videoData.likes).toLocaleString() : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                          <span className="text-sm text-gray-500">{t('comments')}</span>
                          <span className="text-sm font-bold text-orange-600">{videoData?.comments ? parseInt(videoData.comments).toLocaleString() : '-'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <ListChecks className="w-4 h-4" /> {t('reportModulesP0')}
                      </h3>
                      <p className="mb-3 text-xs leading-relaxed text-gray-500">
                        {t('reportModulesHint')}
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-2xl border border-amber-200/80 bg-amber-50/60">
                          <span className="text-sm font-medium text-gray-800">{t('metric24h')}</span>
                          <span className="text-xs font-bold text-amber-800">{t('standard')}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-2xl border border-amber-200/80 bg-amber-50/60">
                          <span className="text-sm font-medium text-gray-800">{t('metricSatisfaction')}</span>
                          <span className="text-xs font-bold text-amber-800">{t('standard')}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-2xl border border-amber-200/80 bg-amber-50/60">
                          <span className="text-sm font-medium text-gray-800">{t('metric7dPlan')}</span>
                          <span className="text-xs font-bold text-amber-800">{t('standard')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <GeminiUsageCard lastRequest={currentApiUsage} session={sessionGeminiUsage} />

                <div className="rounded-3xl bg-black p-5 text-white shadow-xl sm:p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-50">
                    <TrendingUp className="h-4 w-4 shrink-0" /> {t('algoInsightsTitle')}
                  </h3>
                  {currentAlgorithmInsights ? (
                    <div className="space-y-4">
                      {currentAlgorithmInsights.map((insight, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 text-sm opacity-90">{insight.label}</span>
                          <div className="flex gap-1.5">
                            <div className={cn("w-3 h-3 rounded-full", insight.status === 'red' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-gray-700")} />
                            <div className={cn("w-3 h-3 rounded-full", insight.status === 'yellow' ? "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" : "bg-gray-700")} />
                            <div className={cn("w-3 h-3 rounded-full", insight.status === 'green' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-gray-700")} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed opacity-90">
                      {t('algoInsightsFallback')}
                    </p>
                  )}
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-2">
                    <Activity className="h-4 w-4 shrink-0" /> {t('kpiTitle')}
                  </h3>
                  <p className="mb-4 text-[11px] leading-snug text-gray-500">
                    {t('kpiSubtitle')}
                  </p>
                  {operationalKpi.scopeLabel && (
                    <p className="mb-3 rounded-xl bg-gray-50 px-3 py-2 text-[11px] font-medium text-gray-600">
                      {t('kpiBasis')} {operationalKpi.scopeLabel}
                    </p>
                  )}
                  {operationalKpi.rows.length > 0 ? (
                    <div className="space-y-3">
                      {operationalKpi.rows.map((row) => (
                        <div key={row.key} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{row.label}</p>
                              <p className="text-[10px] text-gray-400">{row.hint}</p>
                            </div>
                            <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">{row.value}</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200/90">
                            <div
                              className={cn(
                                'h-full rounded-full transition-[width] duration-500',
                                row.key === 'recentVsAvg' ? 'bg-violet-500' : 'bg-orange-500',
                              )}
                              style={{ width: `${row.barFill}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[t('kpiEngagement'), t('kpiLikeRate'), t('kpiCommentRate')].map((label) => (
                        <div key={label} className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-400">{label}</span>
                            <span className="text-sm font-bold text-gray-300">—</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200/60" />
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-4 text-[11px] leading-relaxed text-gray-500">{operationalKpi.footnote}</p>
                </div>
              </div>

              {/* Main Analysis Content */}
              <div className="min-w-0 space-y-6 lg:col-span-2">
                {analysisTab === 'channel' && channelData && channelData.recentVideos.length > 0 && (
                  <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-8 md:p-12">
                    <div className="mb-6 flex items-center gap-3 sm:mb-8">
                      <div className="rounded-2xl bg-red-100 p-3">
                        <BarChart3 className="h-6 w-6 text-red-600" />
                      </div>
                      <h2 className="min-w-0 text-lg font-bold text-gray-900 sm:text-2xl">{t('chartTitle')}</h2>
                    </div>
                    <div className="h-[220px] w-full sm:h-[280px] md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[...channelData.recentVideos].reverse().map(v => ({
                            name: new Date(v.publishedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', { month: 'short', day: 'numeric' }),
                            views: parseInt(v.views, 10) || 0,
                            likes: parseInt(v.likes, 10) || 0,
                            title: v.title
                          }))}
                          margin={
                            compactChart
                              ? { top: 4, right: 6, left: 0, bottom: 4 }
                              : { top: 5, right: 28, left: 12, bottom: 5 }
                          }
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: compactChart ? 10 : 12 }} dy={10} />
                          <YAxis yAxisId="left" width={compactChart ? 28 : 36} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: compactChart ? 10 : 12 }} tickFormatter={(value) => (value >= 10000 ? (locale === 'ko' ? `${(value / 10000).toFixed(0)}만` : `${Math.round(value / 1000)}k`) : String(value))} />
                          <YAxis yAxisId="right" orientation="right" width={compactChart ? 28 : 36} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: compactChart ? 10 : 12 }} tickFormatter={(value) => (value >= 10000 ? (locale === 'ko' ? `${(value / 10000).toFixed(0)}만` : `${Math.round(value / 1000)}k`) : String(value))} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                            formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                          />
                          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="views"
                            name={t('chartLineViews')}
                            stroke="#EF4444"
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="likes"
                            name={t('chartLineLikes')}
                            stroke="#3B82F6"
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-gray-500 mt-4 text-center">
                      {t('chartFootnote')}
                    </p>
                  </div>
                )}

                <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-8 md:p-12">
                  <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-2xl font-black tracking-tighter sm:text-3xl">{t('deepAnalysis')}</h2>
                    <a
                      href={currentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center self-start text-gray-400 transition-colors hover:text-red-600 sm:self-auto"
                      aria-label={t('openOriginalAria')}
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  </div>
                  <p className="mb-6 max-w-3xl text-xs leading-relaxed text-gray-500 sm:mb-8">
                    {t('deepAnalysisPipelineNote')}
                  </p>

                  {reportCompleteness && !reportCompleteness.ok && (
                    <div
                      className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 md:p-5 text-amber-950"
                      role="status"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold tracking-tight">
                              {t('completenessTitle')}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
                              <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs font-semibold text-amber-900">
                                {t('completenessAgentMd')}
                              </code>
                              {t('completenessAfterAgent', {
                                count: reportCompleteness.missingLabels.length,
                              })}
                            </p>
                            <ul className="mt-3 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-amber-900/85">
                              {reportCompleteness.missingLabels.map((label) => (
                                <li key={label}>{label}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAnalyze()}
                          disabled={currentLoading || !currentUrl}
                          className={cn(
                            'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors',
                            'bg-amber-900 text-white hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-50',
                          )}
                        >
                          <RefreshCw className={cn('h-4 w-4', currentLoading && 'animate-spin')} />
                          {t('reanalyze')}
                        </button>
                      </div>
                    </div>
                  )}

                  {reportCompleteness && reportCompleteness.algorithmSeoTableMissing && (
                    <div
                      className="mb-8 rounded-2xl border border-sky-200 bg-sky-50/90 p-4 md:p-5 text-sky-950"
                      role="status"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                            <Table2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold tracking-tight">
                              {t('algoTableMissingTitle')}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-sky-900/90">
                              {t('algoTableMissingBody')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAnalyze()}
                          disabled={currentLoading || !currentUrl}
                          className={cn(
                            'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors',
                            'bg-sky-900 text-white hover:bg-sky-950 disabled:cursor-not-allowed disabled:opacity-50',
                          )}
                        >
                          <RefreshCw className={cn('h-4 w-4', currentLoading && 'animate-spin')} />
                          {t('reanalyze')}
                        </button>
                      </div>
                    </div>
                  )}

                  {reportCompleteness &&
                    !reportCompleteness.algorithmSeoTableMissing &&
                    reportCompleteness.algorithmSeoChecklistColumnsIncomplete && (
                      <div
                        className="mb-8 rounded-2xl border border-violet-200 bg-violet-50/90 p-4 md:p-5 text-violet-950"
                        role="status"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                              <ListChecks className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold tracking-tight">
                                {t('checklistHeaderTitle')}
                              </p>
                              <p className="mt-1 text-sm leading-relaxed text-violet-900/90">
                                {t('checklistHeaderBody')}
                              </p>
                              {reportCompleteness.algorithmSeoChecklistColumnGaps.length > 0 && (
                                <ul className="mt-3 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-violet-900/85">
                                  {reportCompleteness.algorithmSeoChecklistColumnGaps.map((g) => (
                                    <li key={g}>{t(CHECKLIST_GAP_TRANSLATION_KEY[g])}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAnalyze()}
                            disabled={currentLoading || !currentUrl}
                            className={cn(
                              'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors',
                              'bg-violet-900 text-white hover:bg-violet-950 disabled:cursor-not-allowed disabled:opacity-50',
                            )}
                          >
                            <RefreshCw className={cn('h-4 w-4', currentLoading && 'animate-spin')} />
                            {t('reanalyze')}
                          </button>
                        </div>
                      </div>
                    )}
                  
                  <div
                    id="report-content"
                    className="report-document report-document--surface prose prose-slate max-w-none min-w-0
                    prose-headings:font-bold prose-headings:tracking-tight
                    prose-p:text-[15px] prose-p:leading-[1.78]
                    prose-a:text-red-600 hover:prose-a:text-red-700"
                  >
                    <AnalysisMarkdown content={currentAnalysis} />
                  </div>
                </div>

                {currentAnalysis && currentVerify != null && (
                  <ReportVerificationPanel state={currentVerify} />
                )}

                {currentSources.length > 0 && (
                  <div className="mt-6 rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:mt-8 sm:p-8 md:p-12">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="rounded-2xl bg-blue-100 p-3">
                        <Search className="h-6 w-6 text-blue-600" />
                      </div>
                      <h2 className="min-w-0 text-lg font-bold text-gray-900 sm:text-2xl">{t('sourcesTitle')}</h2>
                    </div>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      {t('sourcesBody')}
                    </p>
                    <ul className="space-y-4">
                      {currentSources.map((source, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <ChevronRight className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <a 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:text-blue-800 hover:underline break-all font-medium"
                          >
                            {source.title || source.uri}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-8">
                  <button
                    onClick={handleDownloadMarkdown}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
                  >
                    <Download className="w-5 h-5" />
                    {t('downloadMd')}
                  </button>
                  <button
                    onClick={handleViewAsWebPage}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-white text-gray-900 border-2 border-gray-200 font-bold rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                  >
                    <Globe className="w-5 h-5" />
                    {t('viewWeb')}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-4 py-4">
                  <div className="h-px bg-gray-200 flex-1" />
                  <span className="text-[10px] font-bold text-gray-400 tracking-[0.15em]">{t('reportEnd')}</span>
                  <div className="h-px bg-gray-200 flex-1" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </main>

      <footer className="mt-8 border-t border-gray-100 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-7xl space-y-1 px-4 py-4 text-center text-xs text-gray-400 sm:px-6">
          <p>{t('footerCopy')}</p>
          <p>
            {t('footerMade')}{' '}
            <a
              href="mailto:chunghyo@troe.kr"
              className="text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
            >
              chunghyo@troe.kr
            </a>
          </p>
        </div>
      </footer>
      <DevAgentKitPanel />
    </div>
  );
}
