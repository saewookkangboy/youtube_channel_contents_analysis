import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isAnyMainReportLlmKeyConfigured,
  useOpenAiForMainReport,
} from '../src/lib/analysisPipeline';

describe('analysisPipeline LLM 우선순위', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('OPENAI_API_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Gemini 키가 있으면 메인 리포트는 OpenAI 경로를 쓰지 않는다', () => {
    vi.stubEnv('GEMINI_API_KEY', 'g-key');
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    expect(useOpenAiForMainReport()).toBe(false);
    expect(isAnyMainReportLlmKeyConfigured()).toBe(true);
  });

  it('Gemini 없고 OpenAI만 있으면 메인 리포트는 OpenAI 폴백', () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    expect(useOpenAiForMainReport()).toBe(true);
    expect(isAnyMainReportLlmKeyConfigured()).toBe(true);
  });

  it('둘 다 없으면 메인 리포트 불가', () => {
    expect(useOpenAiForMainReport()).toBe(false);
    expect(isAnyMainReportLlmKeyConfigured()).toBe(false);
  });
});
