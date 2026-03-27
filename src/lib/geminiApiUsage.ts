import type { GenerateContentResponseUsageMetadata } from '@google/genai';

/** [ai-cost-calc](https://github.com/saewookkangboy/ai-cost-calc) 와 동일한 단위(USD / 1M tokens) */
export interface GeminiModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cachedInputPerMillion?: number;
  cacheWritePerMillion?: number;
  reasoningOutputPerMillion?: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputTokenDetails?: {
    noCacheTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  outputTokenDetails?: {
    textTokens?: number;
    reasoningTokens?: number;
  };
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  cachedInputCost: number;
  cacheWriteCost: number;
  reasoningCost: number;
  totalCost: number;
}

const GEMINI_AI_STUDIO_PRICING: Record<string, GeminiModelPricing> = {
  'gemini-3.1-pro-preview': {
    inputPerMillion: 2,
    outputPerMillion: 12,
    cachedInputPerMillion: 0.2,
  },
  'gemini-3-flash-preview': {
    inputPerMillion: 0.5,
    outputPerMillion: 3,
    cachedInputPerMillion: 0.05,
  },
};

export const GEMINI_MODEL_LABELS: Record<string, string> = {
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
  'gemini-3-flash-preview': 'Gemini 3 Flash',
};

export function getGeminiModelPricing(modelId: string): GeminiModelPricing | undefined {
  return GEMINI_AI_STUDIO_PRICING[modelId];
}

/** ai-cost-calc `calculateCost` 와 동일한 공식 */
export function calculateCost(usage: TokenUsage, pricing: GeminiModelPricing): CostBreakdown {
  const { inputTokenDetails, outputTokenDetails } = usage;
  const inputTokenCount = inputTokenDetails?.noCacheTokens ?? usage.inputTokens;
  const inputCost = (inputTokenCount / 1_000_000) * pricing.inputPerMillion;
  const cacheReadTokens = inputTokenDetails?.cacheReadTokens ?? 0;
  const cachedInputCost =
    (cacheReadTokens / 1_000_000) * (pricing.cachedInputPerMillion ?? 0);
  const cacheWriteTokens = inputTokenDetails?.cacheWriteTokens ?? 0;
  const cacheWriteCost =
    (cacheWriteTokens / 1_000_000) * (pricing.cacheWritePerMillion ?? 0);
  const reasoningTokens = outputTokenDetails?.reasoningTokens ?? 0;
  const reasoningRate = pricing.reasoningOutputPerMillion ?? pricing.outputPerMillion;
  const reasoningCost = (reasoningTokens / 1_000_000) * reasoningRate;
  const textTokenCount = outputTokenDetails
    ? (outputTokenDetails.textTokens ?? Math.max(0, usage.outputTokens - reasoningTokens))
    : usage.outputTokens;
  const outputCost = (Math.max(0, textTokenCount) / 1_000_000) * pricing.outputPerMillion;
  const totalCost = inputCost + outputCost + cachedInputCost + cacheWriteCost + reasoningCost;
  return {
    inputCost,
    outputCost,
    cachedInputCost,
    cacheWriteCost,
    reasoningCost,
    totalCost,
  };
}

export function usageMetadataToTokenUsage(
  meta: GenerateContentResponseUsageMetadata | undefined,
): TokenUsage | null {
  if (!meta) {
    return null;
  }
  const promptTotal = meta.promptTokenCount ?? 0;
  const cached = meta.cachedContentTokenCount ?? 0;
  const noCache = Math.max(0, promptTotal - cached);
  const output = meta.candidatesTokenCount ?? 0;
  const reasoning = meta.thoughtsTokenCount ?? 0;
  const declaredTotal = meta.totalTokenCount;
  const fallbackTotal =
    promptTotal +
    output +
    (meta.toolUsePromptTokenCount ?? 0) +
    reasoning;
  return {
    inputTokens: promptTotal,
    outputTokens: output,
    totalTokens: declaredTotal ?? fallbackTotal,
    inputTokenDetails: {
      noCacheTokens: noCache,
      cacheReadTokens: cached,
    },
    outputTokenDetails: {
      textTokens: Math.max(0, output - reasoning),
      reasoningTokens: reasoning,
    },
  };
}

export interface GeminiApiUsageSummary {
  modelId: string;
  modelLabel: string;
  usage: TokenUsage;
  costs: CostBreakdown | null;
  /** 단가가 내장 테이블에 없을 때 */
  pricingMissing?: boolean;
  /** 응답에 usageMetadata 가 없을 때 */
  noMetadata?: boolean;
}

export function buildGeminiApiUsageSummary(
  modelId: string,
  meta: GenerateContentResponseUsageMetadata | undefined,
): GeminiApiUsageSummary {
  const modelLabel = GEMINI_MODEL_LABELS[modelId] ?? modelId;
  if (meta == null) {
    return {
      modelId,
      modelLabel,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      costs: null,
      noMetadata: true,
    };
  }
  const usage = usageMetadataToTokenUsage(meta);
  if (!usage) {
    return {
      modelId,
      modelLabel,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      costs: null,
      noMetadata: true,
    };
  }
  const pricing = getGeminiModelPricing(modelId);
  if (!pricing) {
    return {
      modelId,
      modelLabel,
      usage,
      costs: null,
      pricingMissing: true,
    };
  }
  return {
    modelId,
    modelLabel,
    usage,
    costs: calculateCost(usage, pricing),
    pricingMissing: false,
  };
}

const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 6,
});

export function formatUsd(amount: number): string {
  return usdCompact.format(amount);
}

export function formatTokenCount(n: number): string {
  return n.toLocaleString('ko-KR');
}
