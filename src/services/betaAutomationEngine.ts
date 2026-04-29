import type { BetaAutomationState, OutreachTarget } from './betaAutomationClient';

const DAY_MS = 24 * 60 * 60 * 1000;
const STEP_DELAY_MS: Record<number, number> = {
  0: 0 * DAY_MS, // day 0
  1: 2 * DAY_MS, // day 2
  2: 3 * DAY_MS, // day 5
  3: 2 * DAY_MS, // day 7 stop check
};

function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

function parseIso(iso: string | null): number | null {
  if (!iso) return null;
  const v = Date.parse(iso);
  return Number.isNaN(v) ? null : v;
}

function stepTarget(target: OutreachTarget, nowMs: number): OutreachTarget {
  if (target.status === 'replied' || target.status === 'stopped') return target;
  const dueMs = parseIso(target.nextRunAt);
  if (dueMs === null || nowMs < dueMs) return target;

  if (target.status === 'queued') {
    return {
      ...target,
      status: 'sent',
      currentStep: 1,
      nextRunAt: toIso(nowMs + STEP_DELAY_MS[1]),
    };
  }

  if (target.status === 'sent' && target.currentStep < 3) {
    const nextStep = target.currentStep + 1;
    return {
      ...target,
      currentStep: nextStep,
      nextRunAt: toIso(nowMs + STEP_DELAY_MS[nextStep]),
    };
  }

  return {
    ...target,
    status: 'stopped',
    nextRunAt: null,
  };
}

export function runOutreachAutomation(state: BetaAutomationState, nowMs = Date.now()): BetaAutomationState {
  const nextTargets = state.outreachTargets.map((target) => stepTarget(target, nowMs));
  const events = [...(state.outreachEvents ?? [])];
  for (let i = 0; i < state.outreachTargets.length; i += 1) {
    const prev = state.outreachTargets[i];
    const next = nextTargets[i];
    if (prev.status === next.status && prev.currentStep === next.currentStep) continue;
    const at = new Date(nowMs).toISOString();
    if (next.status === 'stopped') {
      events.push({
        id: `evt-${nowMs}-${prev.id}-stop`,
        targetId: prev.id,
        targetName: prev.name,
        type: 'auto_stop',
        code: 'OUTREACH_AUTO_STOP',
        message: `Auto stopped after step ${prev.currentStep}`,
        at,
      });
    } else {
      events.push({
        id: `evt-${nowMs}-${prev.id}-step-${next.currentStep}`,
        targetId: prev.id,
        targetName: prev.name,
        type: 'auto_step',
        code: 'OUTREACH_AUTO_STEP',
        message: `Auto moved to step ${next.currentStep}`,
        at,
      });
    }
  }
  return {
    ...state,
    outreachTargets: nextTargets,
    outreachEvents: events.slice(-200),
  };
}
