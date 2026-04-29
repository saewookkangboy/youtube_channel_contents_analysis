import { describe, expect, it } from 'vitest';

import type { BetaAutomationState } from '../src/services/betaAutomationClient';
import { runOutreachAutomation } from '../src/services/betaAutomationEngine';

describe('runOutreachAutomation', () => {
  it('due 시점이 지난 queued 타겟을 sent로 자동 전환하고 이벤트를 남긴다', () => {
    const nowMs = Date.parse('2026-04-29T00:00:00.000Z');
    const state: BetaAutomationState = {
      outreachTargets: [
        {
          id: 't-1',
          name: 'creator_a',
          status: 'queued',
          currentStep: 0,
          nextRunAt: '2026-04-28T00:00:00.000Z',
        },
      ],
      outreachEvents: [],
      replyInput: '',
      intentResult: null,
      commitments: [],
    };

    const next = runOutreachAutomation(state, nowMs);

    expect(next.outreachTargets[0].status).toBe('sent');
    expect(next.outreachTargets[0].currentStep).toBe(1);
    expect(next.outreachEvents).toHaveLength(1);
    expect(next.outreachEvents[0].type).toBe('auto_step');
    expect(next.outreachEvents[0].code).toBe('OUTREACH_AUTO_STEP');
  });

  it('step 3의 sent 타겟은 자동 중단 처리하고 stop 이벤트를 남긴다', () => {
    const nowMs = Date.parse('2026-04-29T00:00:00.000Z');
    const state: BetaAutomationState = {
      outreachTargets: [
        {
          id: 't-2',
          name: 'creator_b',
          status: 'sent',
          currentStep: 3,
          nextRunAt: '2026-04-28T00:00:00.000Z',
        },
      ],
      outreachEvents: [],
      replyInput: '',
      intentResult: null,
      commitments: [],
    };

    const next = runOutreachAutomation(state, nowMs);

    expect(next.outreachTargets[0].status).toBe('stopped');
    expect(next.outreachTargets[0].nextRunAt).toBeNull();
    expect(next.outreachEvents).toHaveLength(1);
    expect(next.outreachEvents[0].type).toBe('auto_stop');
    expect(next.outreachEvents[0].code).toBe('OUTREACH_AUTO_STOP');
  });
});
