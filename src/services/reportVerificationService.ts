/**
 * 심층 리포트 후단: OpenAI·Gemini 병렬 팩트/할루시네이션 점검 (데이터 파이프라인 verify 단계).
 * 메인 리포트는 Gemini 우선(`analysisPipeline` 주석)이며, 여기서 OpenAI는 키가 있을 때 **보조 검증**으로 동작한다.
 * 앞단 수집은 `runCollectPhaseInParallel`로 YouTube Data API와 분석 준비를 같은 방식으로 병합한다.
 */
import { isUserAbortError, isTransientGeminiError, isTransientOpenAIError, withRetry } from '../lib/resilience';
import { getGeminiClient, isGeminiApiKeyConfigured } from './geminiClient';
import { getOpenAIClient, getOpenAiVerifyModelId, isOpenAiApiKeyConfigured } from './openaiClient';

export type VerificationVerdict =
  | 'supported'
  | 'uncertain'
  | 'likely_hallucination'
  | 'contradicts_grounding';

export interface ReportVerificationIssue {
  excerpt: string;
  verdict: VerificationVerdict;
  explanation: string;
}

export interface ReportVerificationPayload {
  overallRisk: 'low' | 'medium' | 'high';
  summary: string;
  issues: ReportVerificationIssue[];
}

export type ReportVerificationKind = 'channel' | 'video';

export interface ReportVerificationInput {
  kind: ReportVerificationKind;
  targetUrl: string;
  /** FACT_PACKET / ANALYTICS 등 검증용 근거(없으면 빈 문자열) */
  groundingContext: string;
  reportMarkdown: string;
  locale: 'ko' | 'en';
  signal?: AbortSignal;
}

const VERIFY_RETRY = {
  maxAttempts: 3,
  baseDelayMs: 900,
  maxDelayMs: 14_000,
} as const;

/** 토큰·비용 상한 — 리포트 본문은 잘라서 검증 */
export const MAX_VERIFY_REPORT_CHARS = 96_000;

function getGeminiVerifyModelId(): string {
  const m = process.env.GEMINI_VERIFY_MODEL?.trim();
  return m || 'gemini-3-flash-preview';
}

function truncateReport(md: string): string {
  const t = md.trim();
  if (t.length <= MAX_VERIFY_REPORT_CHARS) return t;
  return `${t.slice(0, MAX_VERIFY_REPORT_CHARS)}\n\n[…report truncated for verification…]`;
}

function buildSystemPrompt(locale: 'ko' | 'en'): string {
  if (locale === 'en') {
    return `You are an independent fact-check and hallucination reviewer for a YouTube strategy report.
Compare concrete claims in the report against the provided GROUNDING context (API facts JSON blocks when present).
Flag numbers, URLs, channel names, or metrics that contradict grounding or appear invented without "estimate/uncertain" framing.
Respond with a single JSON object only (no markdown fences), keys:
{"overallRisk":"low"|"medium"|"high","summary":"string","issues":[{"excerpt":"short quote","verdict":"supported"|"uncertain"|"likely_hallucination"|"contradicts_grounding","explanation":"string"}]}
issues may be empty if the report is well grounded. Be concise.`;
  }
  return `당신은 유튜브 전략 리포트의 독립 팩트체크·할루시네이션 검토자입니다.
리포트의 구체적 주장을 제공된 GROUNDING(API 팩트 JSON 블록 등)과 대조하세요.
수치·URL·채널명·지표가 근거와 충돌하거나, "추정/불확실" 표시 없이 날조된 것처럼 보이면 표시하세요.
반드시 JSON 객체만 출력합니다(마크다운 펜스 금지). 키:
{"overallRisk":"low"|"medium"|"high","summary":"string","issues":[{"excerpt":"짧은 인용","verdict":"supported"|"uncertain"|"likely_hallucination"|"contradicts_grounding","explanation":"string"}]}
문제가 없으면 issues는 빈 배열로 두세요. 간결히 작성하세요.`;
}

function buildUserPrompt(
  kind: ReportVerificationKind,
  targetUrl: string,
  groundingContext: string,
  reportExcerpt: string,
  locale: 'ko' | 'en',
): string {
  const targetLabel = kind === 'channel' ? 'Channel URL' : 'Video URL';
  const gl = groundingContext.trim() || (locale === 'en' ? '(none)' : '(없음)');
  return `${targetLabel}: ${targetUrl}

GROUNDING (trusted facts / analytics blocks — may be empty):
${gl}

REPORT_MARKDOWN_TO_REVIEW:
${reportExcerpt}`;
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const body = fence ? fence[1].trim() : trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start >= 0 && end > start) return body.slice(start, end + 1);
  return body;
}

export function parseReportVerificationPayload(raw: string): ReportVerificationPayload | null {
  try {
    const parsed: unknown = JSON.parse(extractJsonObject(raw));
    return normalizePayload(parsed);
  } catch {
    return null;
  }
}

function normalizePayload(parsed: unknown): ReportVerificationPayload | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  const overallRisk = o.overallRisk;
  const summary = o.summary;
  if (overallRisk !== 'low' && overallRisk !== 'medium' && overallRisk !== 'high') return null;
  if (typeof summary !== 'string') return null;
  const issuesRaw = o.issues;
  if (!Array.isArray(issuesRaw)) return null;
  const issues: ReportVerificationIssue[] = [];
  for (const item of issuesRaw) {
    if (!item || typeof item !== 'object') continue;
    const ir = item as Record<string, unknown>;
    if (typeof ir.excerpt !== 'string' || typeof ir.explanation !== 'string') continue;
    const v = ir.verdict;
    if (
      v !== 'supported' &&
      v !== 'uncertain' &&
      v !== 'likely_hallucination' &&
      v !== 'contradicts_grounding'
    ) {
      continue;
    }
    issues.push({ excerpt: ir.excerpt, verdict: v, explanation: ir.explanation });
  }
  return { overallRisk, summary, issues };
}

export type VerifyProviderOutcome =
  | { status: 'skipped'; reason: 'no_key' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: ReportVerificationPayload };

export interface ParallelReportVerificationResult {
  openai: VerifyProviderOutcome;
  gemini: VerifyProviderOutcome;
}

/** UI: 심층 분석 직후 병렬 검증 진행/완료 */
export type VerifyUiState =
  | { phase: 'running' }
  | { phase: 'complete'; result: ParallelReportVerificationResult };

async function verifyWithOpenAI(input: ReportVerificationInput): Promise<VerifyProviderOutcome> {
  const { kind, targetUrl, groundingContext, reportMarkdown, locale, signal } = input;
  const model = getOpenAiVerifyModelId();
  const reportExcerpt = truncateReport(reportMarkdown);
  const userPrompt = buildUserPrompt(kind, targetUrl, groundingContext, reportExcerpt, locale);

  try {
    const response = await withRetry(
      () =>
        getOpenAIClient().chat.completions.create(
          {
            model,
            messages: [
              { role: 'system', content: buildSystemPrompt(locale) },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
            max_completion_tokens: 4096,
            response_format: { type: 'json_object' },
          } as never,
          { signal: signal ?? null },
        ),
      {
        ...VERIFY_RETRY,
        signal,
        shouldRetry: (err) => isTransientOpenAIError(err),
        onRetry: (err, retryRound, delayMs) => {
          console.warn(
            `[OpenAI verify] retry ${retryRound}/${VERIFY_RETRY.maxAttempts - 1} (${delayMs}ms)`,
            err,
          );
        },
      },
    );

    const raw = response.choices[0]?.message?.content ?? '';
    const data = parseReportVerificationPayload(raw);
    if (!data) {
      return { status: 'error', message: locale === 'en' ? 'Invalid JSON from model' : '모델 JSON 파싱 실패' };
    }
    return { status: 'ok', data };
  } catch (err) {
    if (isUserAbortError(err)) {
      return { status: 'error', message: locale === 'en' ? 'Cancelled' : '취소됨' };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', message: msg };
  }
}

async function verifyWithGemini(input: ReportVerificationInput): Promise<VerifyProviderOutcome> {
  const { kind, targetUrl, groundingContext, reportMarkdown, locale, signal } = input;
  const model = getGeminiVerifyModelId();
  const reportExcerpt = truncateReport(reportMarkdown);
  const userPrompt = buildUserPrompt(kind, targetUrl, groundingContext, reportExcerpt, locale);
  const fullPrompt = `${buildSystemPrompt(locale)}\n\n${userPrompt}`;

  try {
    const response = await withRetry(
      () =>
        getGeminiClient().models.generateContent({
          model,
          contents: fullPrompt,
          config: {
            abortSignal: signal,
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        }),
      {
        ...VERIFY_RETRY,
        signal,
        shouldRetry: (err) => isTransientGeminiError(err),
        onRetry: (err, retryRound, delayMs) => {
          console.warn(
            `[Gemini verify] retry ${retryRound}/${VERIFY_RETRY.maxAttempts - 1} (${delayMs}ms)`,
            err,
          );
        },
      },
    );

    const raw = response.text || '';
    const data = parseReportVerificationPayload(raw);
    if (!data) {
      return { status: 'error', message: locale === 'en' ? 'Invalid JSON from model' : '모델 JSON 파싱 실패' };
    }
    return { status: 'ok', data };
  } catch (err) {
    if (isUserAbortError(err)) {
      return { status: 'error', message: locale === 'en' ? 'Cancelled' : '취소됨' };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', message: msg };
  }
}

/**
 * OPENAI_API_KEY·GEMINI_API_KEY가 있으면 각각 동시에 검증하고, 없는 쪽은 skipped.
 */
export async function runParallelReportVerification(
  input: ReportVerificationInput,
): Promise<ParallelReportVerificationResult> {
  const runOpenAi = isOpenAiApiKeyConfigured();
  const runGemini = isGeminiApiKeyConfigured();

  const openaiP: Promise<VerifyProviderOutcome> = runOpenAi
    ? verifyWithOpenAI(input)
    : Promise.resolve({ status: 'skipped', reason: 'no_key' });

  const geminiP: Promise<VerifyProviderOutcome> = runGemini
    ? verifyWithGemini(input)
    : Promise.resolve({ status: 'skipped', reason: 'no_key' });

  const [openai, gemini] = await Promise.all([openaiP, geminiP]);
  return { openai, gemini };
}

export function canRunAnyVerification(): boolean {
  return isOpenAiApiKeyConfigured() || isGeminiApiKeyConfigured();
}
