import React from 'react';
import { Activity, ExternalLink } from 'lucide-react';
import {
  formatTokenCount,
  formatUsd,
  type GeminiApiUsageSummary,
} from '../lib/geminiApiUsage';

export interface SessionGeminiUsageAggregate {
  requestCount: number;
  totalCostUsd: number;
  totalPromptTokens: number;
  totalCandidatesTokens: number;
  totalReasoningTokens: number;
}

interface GeminiUsageCardProps {
  lastRequest: GeminiApiUsageSummary | null;
  session: SessionGeminiUsageAggregate;
}

export function GeminiUsageCard({ lastRequest, session }: GeminiUsageCardProps) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-2">
        <Activity className="w-4 h-4" /> Gemini API 사용량
      </h3>
      <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
        실제 응답의 토큰 메타데이터와{' '}
        <a
          href="https://github.com/saewookkangboy/ai-cost-calc"
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-600 hover:underline inline-flex items-center gap-0.5"
        >
          ai-cost-calc
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>{' '}
        단가표 기준 추정 비용입니다. 청구서와 다를 수 있습니다.
      </p>

      {lastRequest ? (
        <div className="space-y-3 text-sm">
          {lastRequest.noMetadata && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              이 응답에는 토큰 메타데이터가 포함되지 않았습니다. SDK·모델 버전에 따라 제공되지 않을 수 있습니다.
            </p>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">모델</span>
            <span className="font-semibold text-gray-900 text-right">{lastRequest.modelLabel}</span>
          </div>
          {!lastRequest.noMetadata && (
            <>
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">프롬프트 토큰</span>
                <span className="font-mono text-gray-900">
                  {formatTokenCount(lastRequest.usage.inputTokens)}
                </span>
              </div>
              {!!lastRequest.usage.inputTokenDetails?.cacheReadTokens && (
                <div className="flex justify-between gap-2 text-xs">
                  <span className="text-gray-500">· 캐시 입력</span>
                  <span className="font-mono text-gray-700">
                    {formatTokenCount(lastRequest.usage.inputTokenDetails.cacheReadTokens)}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">출력 토큰</span>
                <span className="font-mono text-gray-900">
                  {formatTokenCount(lastRequest.usage.outputTokens)}
                </span>
              </div>
              {(lastRequest.usage.outputTokenDetails?.reasoningTokens ?? 0) > 0 && (
                <div className="flex justify-between gap-2 text-xs">
                  <span className="text-gray-500">· 추론(생각) 토큰</span>
                  <span className="font-mono text-gray-700">
                    {formatTokenCount(lastRequest.usage.outputTokenDetails!.reasoningTokens!)}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2 border-t border-gray-100 pt-3">
                <span className="text-gray-500">합계 토큰</span>
                <span className="font-mono font-semibold text-gray-900">
                  {formatTokenCount(lastRequest.usage.totalTokens)}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between gap-2 items-baseline">
            <span className="text-gray-500">추정 비용</span>
            {lastRequest.noMetadata ? (
              <span className="text-xs text-gray-500">—</span>
            ) : lastRequest.costs ? (
              <span className="font-mono font-bold text-emerald-700">{formatUsd(lastRequest.costs.totalCost)}</span>
            ) : (
              <span className="text-xs text-amber-700 font-medium">
                {lastRequest.pricingMissing ? '단가 미등록 모델' : '계산 불가'}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">분석을 한 번 실행하면 마지막 호출의 사용량이 표시됩니다.</p>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">이 페이지 세션 누적</p>
        {session.requestCount === 0 ? (
          <p className="text-xs text-gray-500">아직 기록된 Gemini 호출이 없습니다.</p>
        ) : (
          <ul className="text-xs space-y-1.5 text-gray-700">
            <li className="flex justify-between">
              <span>호출 수</span>
              <span className="font-mono">{session.requestCount}회</span>
            </li>
            <li className="flex justify-between">
              <span>누적 프롬프트</span>
              <span className="font-mono">{formatTokenCount(session.totalPromptTokens)}</span>
            </li>
            <li className="flex justify-between">
              <span>누적 출력</span>
              <span className="font-mono">{formatTokenCount(session.totalCandidatesTokens)}</span>
            </li>
            {session.totalReasoningTokens > 0 && (
              <li className="flex justify-between">
                <span>누적 추론</span>
                <span className="font-mono">{formatTokenCount(session.totalReasoningTokens)}</span>
              </li>
            )}
            <li className="flex justify-between font-semibold text-gray-900 pt-1">
              <span>누적 추정 비용</span>
              <span className="font-mono text-emerald-700">{formatUsd(session.totalCostUsd)}</span>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
