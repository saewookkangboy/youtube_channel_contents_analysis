import type { CostBreakdown, GeminiApiUsageSummary, TokenUsage } from './geminiApiUsage';

/** UI 표시용 라벨 (추정 단가는 미포함 — OpenAI 요금표 변동 시 별도 반영) */
export const OPENAI_REPORT_MODEL_LABELS: Record<string, string> = {
  'gpt-5.4-nano': 'GPT-5.4 nano',
  'gpt-5.4-mini': 'GPT-5.4 mini',
};

export function buildOpenAiChatUsageSummary(
  modelId: string,
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  } | null
  | undefined,
): GeminiApiUsageSummary {
  const modelLabel = OPENAI_REPORT_MODEL_LABELS[modelId] ?? modelId;
  if (!usage) {
    return {
      modelId,
      modelLabel,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      costs: null,
      noMetadata: true,
    };
  }
  const input = usage.prompt_tokens ?? 0;
  const output = usage.completion_tokens ?? 0;
  const reasoning = usage.completion_tokens_details?.reasoning_tokens ?? 0;
  const total = usage.total_tokens ?? input + output;
  const tokenUsage: TokenUsage = {
    inputTokens: input,
    outputTokens: output,
    totalTokens: total,
    outputTokenDetails: {
      textTokens: Math.max(0, output - reasoning),
      reasoningTokens: reasoning > 0 ? reasoning : undefined,
    },
  };
  const costs: CostBreakdown | null = null;
  return {
    modelId,
    modelLabel,
    usage: tokenUsage,
    costs,
    pricingMissing: true,
    noMetadata: false,
  };
}
