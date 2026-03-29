import { Loader2, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { cn } from '../lib/cn';
import { isGeminiApiKeyConfigured } from '../services/geminiClient';
import { isOpenAiApiKeyConfigured } from '../services/openaiClient';
import type {
  ReportVerificationIssue,
  VerificationVerdict,
  VerifyProviderOutcome,
  VerifyUiState,
} from '../services/reportVerificationService';

const VERDICT_KEY: Record<VerificationVerdict, TranslationKey> = {
  supported: 'verifyVerdict_supported',
  uncertain: 'verifyVerdict_uncertain',
  likely_hallucination: 'verifyVerdict_likely_hallucination',
  contradicts_grounding: 'verifyVerdict_contradicts_grounding',
};

function riskClass(risk: 'low' | 'medium' | 'high'): string {
  if (risk === 'low') return 'bg-emerald-100 text-emerald-900 ring-emerald-200';
  if (risk === 'medium') return 'bg-amber-100 text-amber-900 ring-amber-200';
  return 'bg-red-100 text-red-900 ring-red-200';
}

function riskLabel(t: (k: TranslationKey) => string, risk: 'low' | 'medium' | 'high'): string {
  if (risk === 'low') return t('verifyRiskLow');
  if (risk === 'medium') return t('verifyRiskMedium');
  return t('verifyRiskHigh');
}

function ProviderColumn({
  title,
  configured,
  phase,
  outcome,
}: {
  title: string;
  configured: boolean;
  phase: 'running' | 'complete';
  outcome: VerifyProviderOutcome | undefined;
}) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-100 bg-gray-50/80 p-4 md:p-5',
        !configured && 'opacity-70',
      )}
    >
      <h3 className="text-sm font-bold tracking-tight text-gray-900">{title}</h3>
      <div className="mt-3 min-h-[4rem] text-sm">
        {!configured && (
          <p className="text-gray-500 leading-relaxed">{t('verifySkippedNoKey')}</p>
        )}
        {configured && phase === 'running' && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            <span>{t('verifyRunning')}</span>
          </div>
        )}
        {configured && phase === 'complete' && outcome?.status === 'skipped' && (
          <p className="text-gray-500 leading-relaxed">{t('verifySkippedNoKey')}</p>
        )}
        {configured && phase === 'complete' && outcome?.status === 'error' && (
          <p className="text-red-700 leading-relaxed">
            <span className="font-semibold">{t('verifyError')}: </span>
            {outcome.message}
          </p>
        )}
        {configured && phase === 'complete' && outcome?.status === 'ok' && (
          <VerificationBody data={outcome.data} t={t} />
        )}
      </div>
    </div>
  );
}

function VerificationBody({
  data,
  t,
}: {
  data: { overallRisk: 'low' | 'medium' | 'high'; summary: string; issues: ReportVerificationIssue[] };
  t: (k: TranslationKey) => string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset',
            riskClass(data.overallRisk),
          )}
        >
          {t('verifyRiskLabel')}: {riskLabel(t, data.overallRisk)}
        </span>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t('verifySummaryLabel')}
        </p>
        <p className="mt-1 leading-relaxed text-gray-800">{data.summary}</p>
      </div>
      {data.issues.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('verifyIssuesTitle')}
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-4 text-gray-800">
            {data.issues.map((issue, i) => (
              <li key={i} className="leading-relaxed">
                <span className="font-medium text-gray-900">“{issue.excerpt}”</span>
                <span className="mx-1 text-gray-400">·</span>
                <span className="text-violet-800">{t(VERDICT_KEY[issue.verdict])}</span>
                <span className="mt-0.5 block text-gray-600">{issue.explanation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ReportVerificationPanel({ state }: { state: VerifyUiState }) {
  const { t } = useI18n();
  const hasOpenAi = isOpenAiApiKeyConfigured();
  const hasGemini = isGeminiApiKeyConfigured();
  const phase = state.phase;

  const openaiOutcome =
    state.phase === 'complete' ? state.result.openai : undefined;
  const geminiOutcome =
    state.phase === 'complete' ? state.result.gemini : undefined;

  return (
    <div className="mt-6 rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:mt-8 sm:p-8 md:p-12">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="rounded-2xl bg-violet-100 p-3">
            <ShieldCheck className="h-6 w-6 text-violet-700" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 sm:text-2xl">{t('verifySectionTitle')}</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{t('verifySectionSubtitle')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <ProviderColumn
          title={t('verifyProviderOpenai')}
          configured={hasOpenAi}
          phase={phase === 'running' ? 'running' : 'complete'}
          outcome={openaiOutcome}
        />
        <ProviderColumn
          title={t('verifyProviderGemini')}
          configured={hasGemini}
          phase={phase === 'running' ? 'running' : 'complete'}
          outcome={geminiOutcome}
        />
      </div>
    </div>
  );
}
