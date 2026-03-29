import { describe, expect, it } from 'vitest';
import {
  analysisErrorTranslationKey,
  classifyAnalysisError,
} from '../src/lib/analysisErrors';
import { ResilientHttpError } from '../src/lib/resilience';

describe('classifyAnalysisError', () => {
  it('classifies ResilientHttpError by status', () => {
    expect(classifyAnalysisError(new ResilientHttpError(429, 'Too Many', 'u'))).toBe(
      'rate_limited',
    );
    expect(classifyAnalysisError(new ResilientHttpError(401, 'Unauthorized', 'u'))).toBe('auth');
    expect(classifyAnalysisError(new ResilientHttpError(500, 'Err', 'u'))).toBe('server');
  });

  it('classifies ApiError-shaped object', () => {
    expect(classifyAnalysisError({ name: 'ApiError', status: 404 })).toBe('not_found');
  });

  it('classifies network-ish messages', () => {
    expect(classifyAnalysisError(new Error('Failed to fetch'))).toBe('network');
  });

  it('returns unknown for generic errors', () => {
    expect(classifyAnalysisError(new Error('something else'))).toBe('unknown');
  });
});

describe('analysisErrorTranslationKey', () => {
  it('maps kinds to keys', () => {
    expect(analysisErrorTranslationKey('aborted')).toBe('errAborted');
    expect(analysisErrorTranslationKey('unknown')).toBe('errUnknown');
  });
});
