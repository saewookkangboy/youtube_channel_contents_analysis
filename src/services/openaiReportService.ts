import {
  buildChannelAnalyticsGroundingBlock,
  buildChannelFactPacket,
  buildVideoAnalyticsGroundingBlock,
  buildVideoFactPacket,
} from '../lib/analysisPipeline';
import { buildOpenAiChatUsageSummary } from '../lib/openaiApiUsage';
import { isTransientOpenAIError, withRetry } from '../lib/resilience';
import {
  appendOutputTruncateNotice,
  extractAlgorithmInsightsFromMarkdown,
  postProcessKoreanNaturalnessWithTone,
} from '../lib/reportMarkdownUtils';
import {
  buildChannelAnalysisPrompt,
  buildVideoAnalysisPrompt,
  loadDevOrchestrationPromptSuffix,
  type AnalysisResult,
  type GeminiAnalysisOptions,
} from './geminiService';
import {
  buildChannelKoreanSemanticGroundingBlock,
  buildVideoKoreanSemanticGroundingBlock,
} from '../lib/koreanSemanticEmbedding';
import { getOpenAIClient, getOpenAiReportModelId, isOpenAiApiKeyConfigured } from './openaiClient';
import { YouTubeChannelData, YouTubeVideoData } from './youtubeApiService';

export { isOpenAiApiKeyConfigured } from './openaiClient';

const OPENAI_GENERATE_RETRY = {
  maxAttempts: 4,
  baseDelayMs: 1_200,
  maxDelayMs: 20_000,
} as const;

const REPORT_MAX_COMPLETION_TOKENS_VIDEO = 24_000;
const REPORT_MAX_COMPLETION_TOKENS_CHANNEL = 24_000;

function shouldUseWebGroundingTools(
  rawData: unknown | null | undefined,
  factsOnly: boolean | undefined,
): boolean {
  if (!rawData) return true;
  return !factsOnly;
}

function openAiSystemPreamble(locale: 'ko' | 'en'): string {
  if (locale === 'en') {
    return 'You are a senior YouTube growth strategist. Obey the user prompt exactly: markdown `##` section order, GFM tables, role-based sections, 7-day plan structure, and one final ```json block for algorithmInsights.';
  }
  return '당신은 유튜브 성장 전략 시니어 컨설턴트입니다. 사용자 프롬프트를 정확히 따릅니다: 마크다운 `##` 섹션 순서, GFM 표, 역할별 섹션, 7일 플랜 형식, 맨 끝 algorithmInsights용 ```json 블록 1개.';
}

type CreateCompletionBody = {
  model: string;
  messages: { role: 'system' | 'user'; content: string }[];
  temperature: number;
  max_completion_tokens: number;
};

export async function analyzeYouTubeVideoWithOpenAI(
  videoUrl: string,
  rawData?: YouTubeVideoData | null,
  options?: GeminiAnalysisOptions,
): Promise<AnalysisResult> {
  const model = getOpenAiReportModelId();
  const factBlock = rawData ? buildVideoFactPacket(rawData) : '';
  const analyticsBlock = rawData ? buildVideoAnalyticsGroundingBlock(rawData) : '';
  const sig = options?.signal;
  const locale = options?.outputLocale === 'en' ? 'en' : 'ko';

  const useDevPrefetch = Boolean(options && 'prefetchedDevOrchestrationBlock' in options);
  let semanticGroundingBlock: string;
  let devOrchestrationBlock: string;
  if (useDevPrefetch) {
    devOrchestrationBlock = options!.prefetchedDevOrchestrationBlock ?? '';
    semanticGroundingBlock = rawData
      ? await buildVideoKoreanSemanticGroundingBlock(rawData, { signal: sig })
      : '';
  } else {
    [semanticGroundingBlock, devOrchestrationBlock] = await Promise.all([
      rawData ? buildVideoKoreanSemanticGroundingBlock(rawData, { signal: sig }) : Promise.resolve(''),
      loadDevOrchestrationPromptSuffix(locale, 'video', options),
    ]);
  }

  const useWebTools = shouldUseWebGroundingTools(rawData, options?.factsOnly);

  const userPrompt = buildVideoAnalysisPrompt({
    videoUrl,
    factBlock,
    analyticsBlock,
    devOrchestrationBlock,
    semanticGroundingBlock,
    useWebTools,
    locale,
    provider: 'openai',
  });

  const body: CreateCompletionBody = {
    model,
    messages: [
      { role: 'system', content: openAiSystemPreamble(locale) },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_completion_tokens: REPORT_MAX_COMPLETION_TOKENS_VIDEO,
  };

  const response = await withRetry(
    () =>
      getOpenAIClient().chat.completions.create(body as never, {
        signal: sig ?? null,
      }),
    {
      ...OPENAI_GENERATE_RETRY,
      signal: sig,
      shouldRetry: (err) => isTransientOpenAIError(err),
      onRetry: (err, retryRound, delayMs) => {
        console.warn(
          `[OpenAI video] 일시 오류 후 재시도 ${retryRound}/${OPENAI_GENERATE_RETRY.maxAttempts - 1} (${delayMs}ms 대기)`,
          err,
        );
      },
    },
  );

  let text = response.choices[0]?.message?.content ?? '';
  const finishReason = response.choices[0]?.finish_reason;
  const extracted = extractAlgorithmInsightsFromMarkdown(text);
  text = extracted.text;
  text = appendOutputTruncateNotice(text, locale, finishReason === 'length');
  text = postProcessKoreanNaturalnessWithTone(
    text,
    locale,
    options?.koreanNaturalnessTone ?? 'default',
    options?.koreanNaturalnessIntensity ?? 'medium',
  );

  return {
    text,
    sources: [],
    algorithmInsights: extracted.algorithmInsights,
    apiUsage: buildOpenAiChatUsageSummary(model, response.usage),
  };
}

export async function analyzeYouTubeChannelWithOpenAI(
  channelUrl: string,
  rawData?: YouTubeChannelData | null,
  options?: GeminiAnalysisOptions,
): Promise<AnalysisResult> {
  const model = getOpenAiReportModelId();
  const factBlock = rawData ? buildChannelFactPacket(rawData) : '';
  const analyticsBlock = rawData ? buildChannelAnalyticsGroundingBlock(rawData) : '';
  const sig = options?.signal;
  const locale = options?.outputLocale === 'en' ? 'en' : 'ko';

  const useDevPrefetch = Boolean(options && 'prefetchedDevOrchestrationBlock' in options);
  let semanticGroundingBlock: string;
  let devOrchestrationBlock: string;
  if (useDevPrefetch) {
    devOrchestrationBlock = options!.prefetchedDevOrchestrationBlock ?? '';
    semanticGroundingBlock = rawData
      ? await buildChannelKoreanSemanticGroundingBlock(rawData, { signal: sig })
      : '';
  } else {
    [semanticGroundingBlock, devOrchestrationBlock] = await Promise.all([
      rawData ? buildChannelKoreanSemanticGroundingBlock(rawData, { signal: sig }) : Promise.resolve(''),
      loadDevOrchestrationPromptSuffix(locale, 'channel', options),
    ]);
  }

  const useWebTools = shouldUseWebGroundingTools(rawData, options?.factsOnly);

  const userPrompt = buildChannelAnalysisPrompt({
    channelUrl,
    factBlock,
    analyticsBlock,
    devOrchestrationBlock,
    semanticGroundingBlock,
    useWebTools,
    locale,
    provider: 'openai',
  });

  const body: CreateCompletionBody = {
    model,
    messages: [
      { role: 'system', content: openAiSystemPreamble(locale) },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_completion_tokens: REPORT_MAX_COMPLETION_TOKENS_CHANNEL,
  };

  const response = await withRetry(
    () =>
      getOpenAIClient().chat.completions.create(body as never, {
        signal: sig ?? null,
      }),
    {
      ...OPENAI_GENERATE_RETRY,
      signal: sig,
      shouldRetry: (err) => isTransientOpenAIError(err),
      onRetry: (err, retryRound, delayMs) => {
        console.warn(
          `[OpenAI channel] 일시 오류 후 재시도 ${retryRound}/${OPENAI_GENERATE_RETRY.maxAttempts - 1} (${delayMs}ms 대기)`,
          err,
        );
      },
    },
  );

  let text = response.choices[0]?.message?.content ?? '';
  const finishReason = response.choices[0]?.finish_reason;
  const extracted = extractAlgorithmInsightsFromMarkdown(text);
  text = extracted.text;
  text = appendOutputTruncateNotice(text, locale, finishReason === 'length');
  text = postProcessKoreanNaturalnessWithTone(
    text,
    locale,
    options?.koreanNaturalnessTone ?? 'default',
    options?.koreanNaturalnessIntensity ?? 'medium',
  );

  return {
    text,
    sources: [],
    algorithmInsights: extracted.algorithmInsights,
    apiUsage: buildOpenAiChatUsageSummary(model, response.usage),
  };
}
