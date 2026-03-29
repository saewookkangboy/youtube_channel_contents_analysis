import OpenAI from 'openai';

export function isOpenAiApiKeyConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!isOpenAiApiKeyConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!.trim(),
      dangerouslyAllowBrowser: true,
    });
  }
  return openaiClient;
}

/** 기본 `gpt-5.4-nano` — `.env`의 OPENAI_REPORT_MODEL로 재정의 가능 */
export function getOpenAiReportModelId(): string {
  const m = process.env.OPENAI_REPORT_MODEL?.trim();
  return m || 'gpt-5.4-nano';
}

/** 리포트 후단 팩트 검증용 — 기본 `gpt-4o-mini` (`.env`의 OPENAI_VERIFY_MODEL로 재정의) */
export function getOpenAiVerifyModelId(): string {
  const m = process.env.OPENAI_VERIFY_MODEL?.trim();
  return m || 'gpt-4o-mini';
}
