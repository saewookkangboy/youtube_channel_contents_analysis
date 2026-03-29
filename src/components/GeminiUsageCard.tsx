import React from 'react';
import { Activity, ExternalLink } from 'lucide-react';
import {
  formatTokenCount,
  formatUsd,
  type GeminiApiUsageSummary,
} from '../lib/geminiApiUsage';
import { useI18n } from '../i18n/I18nContext';

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
  const { t } = useI18n();

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-2">
        <Activity className="w-4 h-4" /> {t('usageCardTitle')}
      </h3>
      <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
        {t('usageCardBlurbBefore')}
        <a
          href="https://github.com/saewookkangboy/ai-cost-calc"
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-600 hover:underline inline-flex items-center gap-0.5"
        >
          ai-cost-calc
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
        {t('usageCardBlurbAfter')}
      </p>

      {lastRequest ? (
        <div className="space-y-3 text-sm">
          {lastRequest.noMetadata && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              {t('usageNoMetadata')}
            </p>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">{t('usageModel')}</span>
            <span className="font-semibold text-gray-900 text-right">{lastRequest.modelLabel}</span>
          </div>
          {!lastRequest.noMetadata && (
            <>
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">{t('usagePromptTokens')}</span>
                <span className="font-mono text-gray-900">
                  {formatTokenCount(lastRequest.usage.inputTokens)}
                </span>
              </div>
              {!!lastRequest.usage.inputTokenDetails?.cacheReadTokens && (
                <div className="flex justify-between gap-2 text-xs">
                  <span className="text-gray-500">{t('usageCacheInput')}</span>
                  <span className="font-mono text-gray-700">
                    {formatTokenCount(lastRequest.usage.inputTokenDetails.cacheReadTokens)}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">{t('usageOutputTokens')}</span>
                <span className="font-mono text-gray-900">
                  {formatTokenCount(lastRequest.usage.outputTokens)}
                </span>
              </div>
              {(lastRequest.usage.outputTokenDetails?.reasoningTokens ?? 0) > 0 && (
                <div className="flex justify-between gap-2 text-xs">
                  <span className="text-gray-500">{t('usageReasoningTokens')}</span>
                  <span className="font-mono text-gray-700">
                    {formatTokenCount(lastRequest.usage.outputTokenDetails!.reasoningTokens!)}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2 border-t border-gray-100 pt-3">
                <span className="text-gray-500">{t('usageTotalTokens')}</span>
                <span className="font-mono font-semibold text-gray-900">
                  {formatTokenCount(lastRequest.usage.totalTokens)}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between gap-2 items-baseline">
            <span className="text-gray-500">{t('usageEstCost')}</span>
            {lastRequest.noMetadata ? (
              <span className="text-xs text-gray-500">—</span>
            ) : lastRequest.costs ? (
              <span className="font-mono font-bold text-emerald-700">{formatUsd(lastRequest.costs.totalCost)}</span>
            ) : (
              <span className="text-xs text-amber-700 font-medium">
                {lastRequest.pricingMissing ? t('usagePricingMissing') : t('usageCalcUnavailable')}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">{t('usageRunOnceHint')}</p>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('usageSessionLabel')}</p>
        {session.requestCount === 0 ? (
          <p className="text-xs text-gray-500">{t('usageSessionNone')}</p>
        ) : (
          <ul className="text-xs space-y-1.5 text-gray-700">
            <li className="flex justify-between">
              <span>{t('usageCalls')}</span>
              <span className="font-mono">
                {session.requestCount}
                {t('usageCallsSuffix')}
              </span>
            </li>
            <li className="flex justify-between">
              <span>{t('usageCumulativePrompt')}</span>
              <span className="font-mono">{formatTokenCount(session.totalPromptTokens)}</span>
            </li>
            <li className="flex justify-between">
              <span>{t('usageCumulativeOutput')}</span>
              <span className="font-mono">{formatTokenCount(session.totalCandidatesTokens)}</span>
            </li>
            {session.totalReasoningTokens > 0 && (
              <li className="flex justify-between">
                <span>{t('usageCumulativeReasoning')}</span>
                <span className="font-mono">{formatTokenCount(session.totalReasoningTokens)}</span>
              </li>
            )}
            <li className="flex justify-between font-semibold text-gray-900 pt-1">
              <span>{t('usageCumulativeCost')}</span>
              <span className="font-mono text-emerald-700">{formatUsd(session.totalCostUsd)}</span>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
