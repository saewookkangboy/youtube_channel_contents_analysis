/**
 * 로컬에서만 표시: 작성 흐름 요약·세션 통계(최종 분석 결과 본문과는 별개).
 */

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '../lib/cn';
import {
  clearAnalysisEpisodes,
  getAnalysisReinforcementStats,
} from './analysisReinforcement';
import {
  CHANNEL_STRUCTURE_SECTION_COUNT,
  ORCHESTRATOR_ROLE_CARD,
  VIDEO_STRUCTURE_SECTION_COUNT,
} from './agentOrchestrationRoles';

export function DevAgentKitPanel() {
  const [open, setOpen] = useState(false);
  const [statsTick, setStatsTick] = useState(0);
  const stats = useMemo(() => getAnalysisReinforcementStats(), [open, statsTick]);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm text-left text-xs text-slate-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-600 bg-slate-900/95 px-3 py-2 font-semibold shadow-lg backdrop-blur-sm"
      >
        <span className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-violet-400" aria-hidden />
          로컬 작성 보조
        </span>
        {open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
      </button>
      {open && (
        <div className="mt-2 max-h-[min(70vh,28rem)] space-y-3 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl backdrop-blur-sm">
          <div>
            <p className="mb-1 flex items-center gap-1 font-bold text-violet-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              작성 순서 요약
            </p>
            <p className="leading-relaxed text-slate-400">{ORCHESTRATOR_ROLE_CARD}</p>
            <p className="mt-2 tabular-nums text-[10px] text-slate-500">
              권장 목차 수: 채널 {CHANNEL_STRUCTURE_SECTION_COUNT}개 · 영상 {VIDEO_STRUCTURE_SECTION_COUNT}개
              섹션(말미 신호등 요약 포함)
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2">
            <p className="font-bold text-slate-300">분석 에피소드 (세션)</p>
            <p className="mt-1 tabular-nums text-slate-400">
              n={stats.count} · 평균 보상≈{stats.avgReward} · 성공비율={stats.successRate}
            </p>
            {stats.episodes.length > 0 && (
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto border-t border-slate-800 pt-2 text-[10px] text-slate-500">
                {[...stats.episodes].reverse().slice(0, 8).map((e, i) => (
                  <li key={`${e.at}-${i}`} className="tabular-nums">
                    {e.kind} {e.ok ? '✓' : '✗'} {e.durationMs}ms tok {e.promptTokens}+{e.outputTokens}{' '}
                    {e.completenessOk ? '완전' : '누락'}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => {
                clearAnalysisEpisodes();
                setStatsTick((n) => n + 1);
              }}
              className={cn(
                'mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold',
                'bg-slate-800 text-slate-300 hover:bg-slate-700',
              )}
            >
              <Trash2 className="h-3 w-3" aria-hidden />
              세션 기록 지우기
            </button>
          </div>
          <p className="text-[10px] leading-snug text-slate-600">
            이 패널과 형식 보강 문구는 로컬 실행·설정 시에만 쓰이며, 배포 빌드에는 포함되지 않습니다. 형식 보강을 켠
            경우에도 모델에 보내는 안내는 최종 리포트에 그대로 노출되지 않도록 작성되어 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
