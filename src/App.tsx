/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  analyzeYouTubeChannel,
  analyzeYouTubeVideo,
  AlgorithmInsight,
  isGeminiApiKeyConfigured,
} from './services/geminiService';
import { fetchYouTubeChannelData, fetchYouTubeVideoData, YouTubeChannelData, YouTubeVideoData } from './services/youtubeApiService';
import { AnalysisMarkdown } from './components/AnalysisMarkdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Youtube, 
  BarChart3, 
  Users, 
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
  AlertTriangle,
  RefreshCw,
  Table2,
  ListChecks
} from 'lucide-react';
import { cn } from './lib/cn';
import { analyzeReportCompleteness, buildReportCompletenessAppendix } from './lib/reportCompleteness';
import { wrapReportDocumentHtml } from './lib/wrapReportDocumentHtml';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'channel' | 'video'>('channel');
  
  // Channel State
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [sources, setSources] = useState<{title?: string, uri: string}[]>([]);
  const [channelData, setChannelData] = useState<YouTubeChannelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [algorithmInsights, setAlgorithmInsights] = useState<AlgorithmInsight[] | null>(null);

  // Video State
  const [videoUrl, setVideoUrl] = useState('');
  const [videoAnalysis, setVideoAnalysis] = useState<string | null>(null);
  const [videoSources, setVideoSources] = useState<{title?: string, uri: string}[]>([]);
  const [videoData, setVideoData] = useState<YouTubeVideoData | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoAlgorithmInsights, setVideoAlgorithmInsights] = useState<AlgorithmInsight[] | null>(null);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isGeminiApiKeyConfigured()) {
      const msg =
        'Gemini API 키가 없습니다. 프로젝트 루트에 .env 또는 .env.local을 만들고 GEMINI_API_KEY를 설정한 뒤 개발 서버를 다시 실행해 주세요.';
      if (activeTab === 'channel') {
        setError(msg);
      } else {
        setVideoError(msg);
      }
      return;
    }

    if (activeTab === 'channel') {
      if (!url) return;
      setLoading(true);
      setError(null);
      setAnalysis(null);
      setSources([]);
      setChannelData(null);
      setAlgorithmInsights(null);

      try {
        let rawData: YouTubeChannelData | null = null;
        const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
        
        if (apiKey) {
          try {
            rawData = await fetchYouTubeChannelData(url, apiKey);
          } catch (apiErr) {
            console.warn("YouTube API fetch failed, falling back to Gemini search:", apiErr);
          }
        }

        setChannelData(rawData);
        const result = await analyzeYouTubeChannel(url, rawData);
        setAnalysis(result.text || '분석 결과가 비어 있습니다. 잠시 후 다시 시도해 주세요.');
        setSources(result.sources || []);
        setAlgorithmInsights(result.algorithmInsights || null);
      } catch (err) {
        setError('채널 분석에 실패했습니다. URL을 확인한 뒤 다시 시도해 주세요.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      if (!videoUrl) return;
      setVideoLoading(true);
      setVideoError(null);
      setVideoAnalysis(null);
      setVideoSources([]);
      setVideoData(null);
      setVideoAlgorithmInsights(null);

      try {
        let rawData: YouTubeVideoData | null = null;
        const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
        
        if (apiKey) {
          try {
            rawData = await fetchYouTubeVideoData(videoUrl, apiKey);
          } catch (apiErr) {
            console.warn("YouTube API fetch failed, falling back to Gemini search:", apiErr);
          }
        }

        setVideoData(rawData);
        const result = await analyzeYouTubeVideo(videoUrl, rawData);
        setVideoAnalysis(result.text || '분석 결과가 비어 있습니다. 잠시 후 다시 시도해 주세요.');
        setVideoSources(result.sources || []);
        setVideoAlgorithmInsights(result.algorithmInsights || null);
      } catch (err) {
        setVideoError('영상 분석에 실패했습니다. URL을 확인한 뒤 다시 시도해 주세요.');
        console.error(err);
      } finally {
        setVideoLoading(false);
      }
    }
  };

  const handleDownloadMarkdown = () => {
    const currentAnalysis = activeTab === 'channel' ? analysis : videoAnalysis;
    if (!currentAnalysis) return;
    const completeness = analyzeReportCompleteness(activeTab, currentAnalysis);
    const appendix = buildReportCompletenessAppendix(completeness.missingLabels, {
      algorithmSeoTableMissing: completeness.algorithmSeoTableMissing,
      algorithmSeoChecklistColumnsIncomplete: completeness.algorithmSeoChecklistColumnsIncomplete,
      algorithmSeoChecklistColumnGaps: completeness.algorithmSeoChecklistColumnGaps,
    });
    const blob = new Blob([currentAnalysis + appendix], { type: 'text/markdown;charset=utf-8' });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = activeTab === 'channel' ? '유튜브_채널_분석.md' : '유튜브_영상_분석.md';
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
    
    const htmlContent = wrapReportDocumentHtml(reportElement.innerHTML);
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  const currentAnalysis = activeTab === 'channel' ? analysis : videoAnalysis;
  const currentLoading = activeTab === 'channel' ? loading : videoLoading;
  const currentError = activeTab === 'channel' ? error : videoError;
  const currentSources = activeTab === 'channel' ? sources : videoSources;
  const currentUrl = activeTab === 'channel' ? url : videoUrl;
  const currentAlgorithmInsights = activeTab === 'channel' ? algorithmInsights : videoAlgorithmInsights;

  const reportCompleteness = useMemo(() => {
    if (!currentAnalysis) {
      return null;
    }
    return analyzeReportCompleteness(activeTab, currentAnalysis);
  }, [activeTab, currentAnalysis]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-orange-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded-lg">
              <Youtube className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">채널인사이트</h1>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-full">
            <button
              onClick={() => setActiveTab('channel')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeTab === 'channel' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              채널
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeTab === 'video' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"
              )}
            >
              <Video className="w-4 h-4" />
              영상
            </button>
          </div>

          <form onSubmit={handleAnalyze} className="flex-1 max-w-xl flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                value={currentUrl}
                onChange={(e) => activeTab === 'channel' ? setUrl(e.target.value) : setVideoUrl(e.target.value)}
                placeholder={
                  activeTab === 'channel'
                    ? '채널 URL (예: youtube.com/@handle 또는 /channel/UC…)'
                    : '영상 URL (예: youtube.com/watch?v=…)'
                }
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full focus:ring-2 focus:ring-red-500 transition-all outline-none text-sm"
              />
            </div>
            <button 
              disabled={currentLoading}
              className="bg-black text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {currentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '분석'}
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {!currentAnalysis && !currentLoading && !currentError && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md">
                <Sparkles className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2 text-gray-900 tracking-tight">분석을 시작하세요</h2>
                <p className="text-gray-600 mb-3 text-[15px] leading-relaxed">
                  {activeTab === 'channel'
                    ? '상단에 YouTube 채널 URL을 입력하고 분석을 실행하면, 채널 성장과 시청 만족도를 함께 보는 한국어 전략 리포트가 생성됩니다.'
                    : '상단에 YouTube 영상 URL을 입력하고 분석을 실행하면, 해당 영상의 성과 해석과 패키징·알고리즘 관점의 실행 과제가 한국어 리포트로 정리됩니다.'}
                </p>
                <p className="text-left text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
                  <span className="font-semibold text-gray-600">포함 범위(Agent.md 기준): </span>
                  초기 24시간 성과 진단, 제목·썸네일·오프닝 정합성, 알고리즘·SEO(표 형식), 우선 실행{' '}
                  <strong className="text-gray-700">7일 액션 플랜</strong> 등 고정 섹션을 유지합니다. API 키가
                  있으면 YouTube 메타데이터를, 없으면 검색·근거 링크로 보완합니다.
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
              <p className="mt-4 text-gray-500 font-medium animate-pulse">
                웹 검색과 모델 추론으로 인사이트를 모으는 중입니다…
              </p>
            </motion.div>
          )}

          {currentError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-100 p-6 rounded-2xl text-red-600 max-w-2xl mx-auto text-center"
            >
              <Info className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">{currentError}</p>
              <button 
                onClick={() => handleAnalyze()}
                className="mt-4 text-sm underline font-bold"
              >
                다시 시도
              </button>
            </motion.div>
          )}

          {currentAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Sidebar Stats / Info */}
              <div className="lg:col-span-1 space-y-6">
                {activeTab === 'channel' ? (
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> 분석 핵심 지표
                    </h3>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      성장 진단 (P0)
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-2xl border border-amber-200/80 bg-amber-50/60">
                        <span className="text-sm font-medium text-gray-800">초기 24시간 성과 진단</span>
                        <span className="text-xs font-bold text-amber-800">CTR · 30초 훅</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-2xl border border-amber-200/80 bg-amber-50/60">
                        <span className="text-sm font-medium text-gray-800">만족도 중심 진단 카드</span>
                        <span className="text-xs font-bold text-amber-800">패키징 정합성</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-2xl border border-amber-200/80 bg-amber-50/60">
                        <span className="text-sm font-medium text-gray-800">실험형 7일 액션</span>
                        <span className="text-xs font-bold text-amber-800">가설 · 지표</span>
                      </div>
                    </div>
                    <p className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      포함 리포트 섹션
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">성과 및 지표 분석</span>
                        <span className="text-sm font-bold text-red-600">강화됨</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">수익화 전략</span>
                        <span className="text-sm font-bold text-blue-600">포함됨</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">알고리즘, 태그 & 썸네일</span>
                        <span className="text-sm font-bold text-orange-600">강화됨</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">제목 전략 제안</span>
                        <span className="text-sm font-bold text-purple-600">포함됨</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">시청자 참여 전략</span>
                        <span className="text-sm font-bold text-green-600">포함됨</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">최적 업로드 스케줄</span>
                        <span className="text-sm font-bold text-indigo-600">포함됨</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">신규 시리즈 기획</span>
                        <span className="text-sm font-bold text-pink-600">포함됨</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span className="text-sm text-gray-500">영상/오디오 품질 개선</span>
                        <span className="text-sm font-bold text-teal-600">포함됨</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> 영상 API 지표
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                          <span className="text-sm text-gray-500">조회수</span>
                          <span className="text-sm font-bold text-red-600">{videoData?.views ? parseInt(videoData.views).toLocaleString() : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                          <span className="text-sm text-gray-500">좋아요</span>
                          <span className="text-sm font-bold text-blue-600">{videoData?.likes ? parseInt(videoData.likes).toLocaleString() : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                          <span className="text-sm text-gray-500">댓글 수</span>
                          <span className="text-sm font-bold text-orange-600">{videoData?.comments ? parseInt(videoData.comments).toLocaleString() : '-'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <ListChecks className="w-4 h-4" /> 리포트 모듈 (P0)
                      </h3>
                      <p className="mb-3 text-xs leading-relaxed text-gray-500">
                        본문에 동일한 헤딩으로 포함됩니다. 누락 시 상단 경고 배너를 확인하세요.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-2xl border border-amber-200/80 bg-amber-50/60">
                          <span className="text-sm font-medium text-gray-800">초기 24시간 성과 진단</span>
                          <span className="text-xs font-bold text-amber-800">표준</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-2xl border border-amber-200/80 bg-amber-50/60">
                          <span className="text-sm font-medium text-gray-800">만족도 중심 진단 카드</span>
                          <span className="text-xs font-bold text-amber-800">표준</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-2xl border border-amber-200/80 bg-amber-50/60">
                          <span className="text-sm font-medium text-gray-800">실험형 7일 액션 플랜</span>
                          <span className="text-xs font-bold text-amber-800">표준</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-black text-white p-6 rounded-3xl shadow-xl">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> 알고리즘 인사이트 요약
                  </h3>
                  {currentAlgorithmInsights ? (
                    <div className="space-y-4">
                      {currentAlgorithmInsights.map((insight, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm opacity-90">{insight.label}</span>
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
                      추천은 클릭 이후 시청 경험과 장기 만족도까지 함께 반영됩니다. CTR만이 아니라 유지·재방문·정합성을
                      함께 보완하는 것이 성장에 유리합니다.
                    </p>
                  )}
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" /> 시청자 반응 (예시 지표)
                  </h3>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-green-500 h-full w-[85%]" />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-400">
                    <span>부정</span>
                    <span>긍정</span>
                  </div>
                </div>
              </div>

              {/* Main Analysis Content */}
              <div className="lg:col-span-2 space-y-6">
                {activeTab === 'channel' && channelData && channelData.recentVideos.length > 0 && (
                  <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-3 bg-red-100 rounded-2xl">
                        <BarChart3 className="w-6 h-6 text-red-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">최근 영상 성과 트렌드</h2>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[...channelData.recentVideos].reverse().map(v => ({
                            name: new Date(v.publishedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
                            views: parseInt(v.views, 10) || 0,
                            likes: parseInt(v.likes, 10) || 0,
                            title: v.title
                          }))}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(value) => value >= 10000 ? `${(value / 10000).toFixed(0)}만` : value} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(value) => value >= 10000 ? `${(value / 10000).toFixed(0)}만` : value} />
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
                            name="조회수"
                            stroke="#EF4444"
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="likes"
                            name="좋아요"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-gray-500 mt-4 text-center">
                      * YouTube API를 통해 수집된 가장 최근 업로드 영상 5개의 조회수 및 좋아요 추이입니다.
                    </p>
                  </div>
                )}

                <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-black tracking-tighter">심층 분석</h2>
                    <a 
                      href={currentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>

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
                              보고서 필수 섹션 일부가 누락된 것으로 감지되었습니다
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
                              <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs font-semibold text-amber-900">
                                Agent.md
                              </code>
                              의 고정 템플릿 기준 {reportCompleteness.missingLabels.length}개 항목이 헤딩에서 찾아지지
                              않았습니다. 모델 출력이 잘렸거나 제목 표기가 달라졌을 수 있습니다. 아래를 보완하거나 다시
                              분석해 주세요.
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
                          다시 분석
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
                              알고리즘/SEO 섹션에 Markdown 표가 없습니다
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-sky-900/90">
                              헤딩은 감지되었지만, GFM 표(헤더 행 +{' '}
                              <code className="rounded bg-sky-100/80 px-1 py-0.5 text-xs font-mono text-sky-900">
                                |---|---|
                              </code>{' '}
                              구분 행)이 본문에서 찾아지지 않았습니다. 체크리스트 표를 포함하도록 다시 분석하거나 직접
                              추가해 주세요.
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
                          다시 분석
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
                                알고리즘/SEO 체크리스트 표 헤더가 템플릿과 맞지 않습니다
                              </p>
                              <p className="mt-1 text-sm leading-relaxed text-violet-900/90">
                                표는 있으나 첫 번째 표 헤더에 다음 열 키워드가 빠졌거나 표기가 다릅니다. 프롬프트의 3열
                                구조(최적화 항목 · 현재 상태 진단 · 구체적인 개선 방안)에 맞추거나 다시 분석해 주세요.
                              </p>
                              {reportCompleteness.algorithmSeoChecklistColumnGaps.length > 0 && (
                                <ul className="mt-3 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-violet-900/85">
                                  {reportCompleteness.algorithmSeoChecklistColumnGaps.map((g) => (
                                    <li key={g}>{g}</li>
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
                            다시 분석
                          </button>
                        </div>
                      </div>
                    )}
                  
                  <div id="report-content" className="prose prose-slate max-w-none 
                    prose-headings:font-bold prose-headings:tracking-tight 
                    prose-p:text-gray-700 prose-p:leading-loose prose-p:text-[15px]
                    prose-strong:font-bold prose-strong:text-gray-900
                    prose-a:text-red-600 hover:prose-a:text-red-700
                    prose-ul:mt-4 prose-ul:mb-6 prose-li:my-2">
                    <AnalysisMarkdown content={currentAnalysis} />
                  </div>
                </div>

                {currentSources.length > 0 && (
                  <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-sm border border-gray-100 mt-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-blue-100 rounded-2xl">
                        <Search className="w-6 h-6 text-blue-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">참고 출처 · 팩트 체크</h2>
                    </div>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      AI가 분석을 위해 실제로 참고한 웹 문서 및 데이터 출처입니다. 할루시네이션 검증을 위해 직접 확인할 수 있습니다.
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
                    마크다운(MD) 다운로드
                  </button>
                  <button
                    onClick={handleViewAsWebPage}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-white text-gray-900 border-2 border-gray-200 font-bold rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                  >
                    <Globe className="w-5 h-5" />
                    웹 페이지로 보기
                  </button>
                </div>

                <div className="flex items-center justify-center gap-4 py-4">
                  <div className="h-px bg-gray-200 flex-1" />
                  <span className="text-[10px] font-bold text-gray-400 tracking-[0.15em]">분석 리포트 끝</span>
                  <div className="h-px bg-gray-200 flex-1" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-gray-400 text-sm">© 2026 채널인사이트 · Google Gemini 기반</div>
          <div className="flex items-center gap-6 text-xs font-bold tracking-widest text-gray-400">
            <a href="#" className="hover:text-black transition-colors">
              개인정보
            </a>
            <a href="#" className="hover:text-black transition-colors">
              이용약관
            </a>
            <a href="#" className="hover:text-black transition-colors">
              API
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
