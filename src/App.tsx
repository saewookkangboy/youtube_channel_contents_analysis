/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { analyzeYouTubeChannel, analyzeYouTubeVideo, AlgorithmInsight } from './services/geminiService';
import { fetchYouTubeChannelData, fetchYouTubeVideoData, YouTubeChannelData, YouTubeVideoData } from './services/youtubeApiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  LayoutDashboard
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'channel' | 'video'>('channel');
  
  // Channel State
  const [url, setUrl] = useState('https://youtube.com/channel/UCWowvDxMud_7acLoMWaMEqg?si=mWEyt_X3AG-7pOyL');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [sources, setSources] = useState<{title?: string, uri: string}[]>([]);
  const [channelData, setChannelData] = useState<YouTubeChannelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [algorithmInsights, setAlgorithmInsights] = useState<AlgorithmInsight[] | null>(null);

  // Video State
  const [videoUrl, setVideoUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [videoAnalysis, setVideoAnalysis] = useState<string | null>(null);
  const [videoSources, setVideoSources] = useState<{title?: string, uri: string}[]>([]);
  const [videoData, setVideoData] = useState<YouTubeVideoData | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoAlgorithmInsights, setVideoAlgorithmInsights] = useState<AlgorithmInsight[] | null>(null);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        setAnalysis(result.text || "No analysis generated.");
        setSources(result.sources || []);
        setAlgorithmInsights(result.algorithmInsights || null);
      } catch (err) {
        setError("Failed to analyze the channel. Please check the URL and try again.");
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
        setVideoAnalysis(result.text || "No analysis generated.");
        setVideoSources(result.sources || []);
        setVideoAlgorithmInsights(result.algorithmInsights || null);
      } catch (err) {
        setVideoError("Failed to analyze the video. Please check the URL and try again.");
        console.error(err);
      } finally {
        setVideoLoading(false);
      }
    }
  };

  const handleDownloadMarkdown = () => {
    const currentAnalysis = activeTab === 'channel' ? analysis : videoAnalysis;
    if (!currentAnalysis) return;
    const blob = new Blob([currentAnalysis], { type: 'text/markdown;charset=utf-8' });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = activeTab === 'channel' ? 'youtube_channel_analysis.md' : 'youtube_video_analysis.md';
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
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>YouTube Analysis Report</title>
        <style>
          body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif; padding: 2rem; max-width: 900px; margin: 0 auto; color: #374151; line-height: 1.8; }
          h1 { font-size: 2.25rem; font-weight: 900; margin-top: 3rem; margin-bottom: 1.5rem; border-bottom: 2px solid #f3f4f6; padding-bottom: 1rem; color: #111827; }
          h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; color: #111827; display: flex; align-items: center; gap: 0.5rem; }
          h3 { font-size: 1.25rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; color: #1f2937; }
          p { margin-bottom: 1.25rem; }
          ul { list-style-type: none; padding-left: 0; margin-bottom: 1.5rem; }
          li { position: relative; padding-left: 1.5rem; margin-bottom: 0.5rem; }
          li::before { content: ''; position: absolute; left: 0; top: 0.6rem; width: 6px; height: 6px; background-color: #f87171; border-radius: 50%; }
          table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.95rem; }
          th, td { border: 1px solid #e5e7eb; padding: 1rem; text-align: left; }
          th { background-color: #f9fafb; font-weight: 700; color: #111827; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.05em; }
          tr:nth-child(even) { background-color: #fcfcfc; }
          blockquote { border-left: 4px solid #ef4444; padding: 1.5rem; color: #1f2937; background: #fef2f2; border-radius: 0 1rem 1rem 0; margin: 2rem 0; font-weight: 500; }
          strong { font-weight: 700; color: #111827; background-color: rgba(254, 226, 226, 0.5); padding: 0 0.25rem; border-bottom: 2px solid #fecaca; }
          a { color: #dc2626; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        ${reportElement.innerHTML}
      </body>
      </html>
    `;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  // Auto-analyze on first load if URL is present
  useEffect(() => {
    handleAnalyze();
  }, []);

  const currentAnalysis = activeTab === 'channel' ? analysis : videoAnalysis;
  const currentLoading = activeTab === 'channel' ? loading : videoLoading;
  const currentError = activeTab === 'channel' ? error : videoError;
  const currentSources = activeTab === 'channel' ? sources : videoSources;
  const currentUrl = activeTab === 'channel' ? url : videoUrl;
  const currentAlgorithmInsights = activeTab === 'channel' ? algorithmInsights : videoAlgorithmInsights;

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-orange-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded-lg">
              <Youtube className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">ChannelInsight</h1>
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
              Channel
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeTab === 'video' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"
              )}
            >
              <Video className="w-4 h-4" />
              Video
            </button>
          </div>

          <form onSubmit={handleAnalyze} className="flex-1 max-w-xl flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                value={currentUrl}
                onChange={(e) => activeTab === 'channel' ? setUrl(e.target.value) : setVideoUrl(e.target.value)}
                placeholder={activeTab === 'channel' ? "Paste YouTube Channel URL..." : "Paste YouTube Video URL..."}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full focus:ring-2 focus:ring-red-500 transition-all outline-none text-sm"
              />
            </div>
            <button 
              disabled={currentLoading}
              className="bg-black text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {currentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
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
                <h2 className="text-2xl font-bold mb-2">Ready to Discover?</h2>
                <p className="text-gray-500 mb-6">Enter a YouTube {activeTab} URL above to get a comprehensive AI-powered analysis of their content and strategy.</p>
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
              <p className="mt-4 text-gray-500 font-medium animate-pulse">Gathering insights from across the web...</p>
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
                Try Again
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
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> 영상 분석 지표
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
                )}

                <div className="bg-black text-white p-6 rounded-3xl shadow-xl">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> 알고리즘 인사이트
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
                      현재 유튜브 알고리즘은 시청 지속 시간과 클릭률(CTR)을 가장 중요하게 평가합니다. 
                      분석 결과에 포함된 최적화 항목을 확인하여 채널 노출을 극대화하세요.
                    </p>
                  )}
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Audience Sentiment
                  </h3>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-green-500 h-full w-[85%]" />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-400">
                    <span>NEGATIVE</span>
                    <span>POSITIVE</span>
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
                      <h2 className="text-2xl font-bold text-gray-900">최근 영상 성과 트렌드 (Recent Video Performance)</h2>
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
                            formatter={(value: number, name: string) => [value.toLocaleString(), name === 'views' ? '조회수' : '좋아요']}
                          />
                          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                          <Line yAxisId="left" type="monotone" dataKey="views" name="views" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                          <Line yAxisId="right" type="monotone" dataKey="likes" name="likes" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
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
                    <h2 className="text-3xl font-black tracking-tighter">Deep Analysis</h2>
                    <a 
                      href={currentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                  
                  <div id="report-content" className="prose prose-slate max-w-none 
                    prose-headings:font-bold prose-headings:tracking-tight 
                    prose-p:text-gray-700 prose-p:leading-loose prose-p:text-[15px]
                    prose-strong:font-bold prose-strong:text-gray-900
                    prose-a:text-red-600 hover:prose-a:text-red-700
                    prose-ul:mt-4 prose-ul:mb-6 prose-li:my-2">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => (
                          <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5 }}
                            className="text-2xl md:text-3xl font-black text-gray-900 border-b-2 border-gray-100 pb-4 mb-10 mt-20 first:mt-0" 
                            {...(props as any)} 
                          />
                        ),
                        h2: ({node, ...props}) => (
                          <motion.h2 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5 }}
                            className="text-xl md:text-2xl font-bold text-gray-900 mt-16 mb-6 flex items-center gap-2.5 before:content-[''] before:block before:w-1.5 before:h-6 before:bg-red-500 before:rounded-full" 
                            {...(props as any)} 
                          />
                        ),
                        h3: ({node, ...props}) => (
                          <motion.h3 
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5 }}
                            className="text-lg font-bold text-gray-800 mt-10 mb-4" 
                            {...(props as any)} 
                          />
                        ),
                        strong: ({node, ...props}) => <strong className="font-bold text-gray-900 bg-red-50/80 border-b-2 border-red-200 px-1" {...props} />,
                        ul: ({node, ...props}) => (
                          <motion.ul 
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="list-none space-y-4 my-8 pl-0" 
                            {...(props as any)} 
                          />
                        ),
                        li: ({node, ...props}) => (
                          <li className="flex items-start gap-3 text-gray-700 leading-relaxed">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                            <span className="flex-1">{props.children}</span>
                          </li>
                        ),
                        p: ({node, ...props}) => (
                          <motion.p 
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="mb-6 text-gray-700 leading-[1.8] text-[15px] md:text-base break-keep" 
                            {...(props as any)} 
                          />
                        ),
                        blockquote: ({node, ...props}) => (
                          <motion.blockquote 
                            initial={{ opacity: 0, scale: 0.98 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5 }}
                            className="border-l-4 border-red-500 bg-red-50/50 p-6 rounded-r-2xl my-10 text-gray-800 font-medium not-italic" 
                            {...(props as any)} 
                          />
                        ),
                        table: ({node, ...props}) => (
                          <div className="overflow-x-auto my-10 rounded-xl border border-gray-200 shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200 text-sm md:text-base" {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                        tbody: ({node, ...props}) => <tbody className="divide-y divide-gray-200 bg-white" {...props} />,
                        tr: ({node, ...props}) => <tr className="hover:bg-gray-50 transition-colors" {...props} />,
                        th: ({node, ...props}) => <th className="px-6 py-4 text-left font-bold text-gray-900 uppercase tracking-wider whitespace-nowrap" {...props} />,
                        td: ({node, ...props}) => <td className="px-6 py-4 text-gray-700 leading-relaxed break-keep" {...props} />
                      }}
                    >
                      {currentAnalysis}
                    </ReactMarkdown>
                  </div>
                </div>

                {currentSources.length > 0 && (
                  <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-sm border border-gray-100 mt-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-blue-100 rounded-2xl">
                        <Search className="w-6 h-6 text-blue-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Fact Checker (참고 출처)</h2>
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
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">End of Analysis</span>
                  <div className="h-px bg-gray-200 flex-1" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-gray-400 text-sm">
            © 2026 ChannelInsight AI. Powered by Gemini 3.
          </div>
          <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-gray-400">
            <a href="#" className="hover:text-black transition-colors">Privacy</a>
            <a href="#" className="hover:text-black transition-colors">Terms</a>
            <a href="#" className="hover:text-black transition-colors">API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
