import { describe, expect, it } from 'vitest';

import { normalizeBetaAutomationState } from '../src/services/betaAutomationStateNormalizer';

describe('normalizeBetaAutomationState', () => {
  it('레거시 상태를 최신 스키마로 보정한다', () => {
    const legacy = {
      outreachTargets: [{ id: 't-legacy', name: 'legacy_user', status: 'sent', currentStep: 1 }],
      replyInput: 'legacy reply',
      commitments: [{ id: 'p-legacy', creator: 'legacy_creator', due: '2026-01-01 10:00', status: 'scheduled' }],
    };

    const normalized = normalizeBetaAutomationState(legacy, 'ko');

    expect(normalized.outreachTargets).toHaveLength(1);
    expect(normalized.outreachTargets[0].nextRunAt).toBeNull();
    expect(normalized.outreachEvents).toEqual([]);
    expect(normalized.replyInput).toBe('legacy reply');
    expect(normalized.intentResult).toBeNull();
    expect(normalized.commitments[0].views24h).toBe(0);
  });

  it('유효하지 않은 값은 안전한 기본값으로 대체한다', () => {
    const invalid = {
      outreachTargets: [{ id: 'bad-1', name: 'bad', status: 'INVALID_STATUS', currentStep: 'oops' }],
      outreachEvents: [
        {
          id: 'e-1',
          targetId: 'bad-1',
          targetName: 'bad',
          type: 'INVALID_TYPE',
          code: 'INVALID_CODE',
          message: 'bad',
          at: 'now',
        },
      ],
      replyInput: 1234,
      intentResult: { label: 'INVALID_LABEL', confidence: 'high', nextAction: 1, draft: false },
      commitments: [{ id: 'p-1', creator: 'bad', due: 'soon', status: 'INVALID_STATUS', views24h: 'many' }],
    };

    const normalized = normalizeBetaAutomationState(invalid, 'en');

    expect(normalized.outreachTargets[0].status).toBe('queued');
    expect(normalized.outreachTargets[0].currentStep).toBe(0);
    expect(normalized.outreachEvents).toEqual([]);
    expect(normalized.replyInput).toBe('I am interested but need pricing first.');
    expect(normalized.intentResult).toBeNull();
    expect(normalized.commitments[0].status).toBe('scheduled');
    expect(normalized.commitments[0].views24h).toBe(0);
  });
});
