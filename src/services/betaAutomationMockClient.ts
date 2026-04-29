import type {
  AppLocale,
  BetaAutomationClient,
  BetaAutomationState,
  IntentPrediction,
} from './betaAutomationClient';
import { runOutreachAutomation } from './betaAutomationEngine';
import {
  buildBetaAutomationDefaultState,
  normalizeBetaAutomationState,
} from './betaAutomationStateNormalizer';

const STORAGE_KEY = 'beta-automation-state-v1';
type OutreachEvent = BetaAutomationState['outreachEvents'][number];

function buildInitialState(locale: AppLocale): BetaAutomationState {
  return buildBetaAutomationDefaultState(locale);
}

function readState(locale: AppLocale): BetaAutomationState {
  if (typeof window === 'undefined') return buildInitialState(locale);
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return buildInitialState(locale);
  try {
    return normalizeBetaAutomationState(JSON.parse(raw), locale);
  } catch {
    // fallback to defaults
  }
  return buildInitialState(locale);
}

function writeState(next: BetaAutomationState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function classifyIntent(message: string, locale: AppLocale): IntentPrediction {
  const lower = message.toLowerCase();
  if (lower.includes('단가') || lower.includes('비용') || lower.includes('price')) {
    return {
      label: 'pricing',
      confidence: 0.88,
      nextAction: locale === 'ko' ? '단가 가이드 + 협의 옵션 전달' : 'Share rate card and negotiation options',
      draft:
        locale === 'ko'
          ? '문의 주셔서 감사합니다. 예산 범위에 맞는 2가지 패키지를 제안드릴게요.'
          : 'Thanks for reaching out. We can share two package options that fit your budget.',
    };
  }
  if (lower.includes('다음') || lower.includes('later') || lower.includes('다음에')) {
    return {
      label: 'defer',
      confidence: 0.79,
      nextAction: locale === 'ko' ? '리마인드 일정 등록' : 'Schedule reminder follow-up',
      draft:
        locale === 'ko'
          ? '좋습니다. 요청 주신 일정에 맞춰 다시 연락드리겠습니다.'
          : 'Sounds good. We will follow up again at the timing you requested.',
    };
  }
  if (lower.includes('어렵') || lower.includes('거절') || lower.includes('decline')) {
    return {
      label: 'decline',
      confidence: 0.91,
      nextAction: locale === 'ko' ? '감사 메시지 후 종료 태깅' : 'Send closure note and tag as declined',
      draft:
        locale === 'ko'
          ? '검토해주셔서 감사합니다. 다음 캠페인에서 다시 제안드리겠습니다.'
          : 'Thank you for considering this. We will reconnect for a better-fit campaign.',
    };
  }
  if (lower.includes('관심') || lower.includes('좋') || lower.includes('interested')) {
    return {
      label: 'interested',
      confidence: 0.86,
      nextAction: locale === 'ko' ? '콘텐츠 가이드 + 미팅 제안' : 'Share brief and suggest meeting slots',
      draft:
        locale === 'ko'
          ? '관심 주셔서 감사합니다. 콘텐츠 가이드와 일정 옵션을 함께 전달드릴게요.'
          : 'Great to hear your interest. We can send the content brief and proposed schedule.',
    };
  }
  return {
    label: 'other',
    confidence: 0.62,
    nextAction: locale === 'ko' ? '운영자 검토 큐로 전달' : 'Route to operator review queue',
    draft:
      locale === 'ko'
        ? '메시지 의도가 명확하지 않아 운영자 검토 후 회신할 예정입니다.'
        : 'Intent is unclear, so this message is routed for manual review.',
  };
}

export const betaAutomationMockClient: BetaAutomationClient = {
  async load(locale) {
    const next = runOutreachAutomation(readState(locale));
    writeState(next);
    return next;
  },
  async reset(locale) {
    const next = buildInitialState(locale);
    writeState(next);
    return next;
  },
  async runOutreachAutomationPass(locale) {
    const next = runOutreachAutomation(readState(locale));
    writeState(next);
    return next;
  },
  async ingestOutreachReplyEvent(locale, targetId) {
    const state = readState(locale);
    const target = state.outreachTargets.find((t) => t.id === targetId);
    const replyEvent: OutreachEvent | null = target
      ? {
          id: `evt-${Date.now()}-reply-${target.id}`,
          targetId: target.id,
          targetName: target.name,
          type: 'reply_webhook',
          code: 'OUTREACH_REPLY_WEBHOOK',
          message: 'Reply webhook received. Sequence stopped.',
          at: new Date().toISOString(),
        }
      : null;
    const next: BetaAutomationState = {
      ...state,
      outreachTargets: state.outreachTargets.map((target) =>
        target.id === targetId
          ? { ...target, status: 'replied', currentStep: 3, nextRunAt: null }
          : target,
      ),
      outreachEvents: (replyEvent ? [...state.outreachEvents, replyEvent] : state.outreachEvents).slice(-200),
    };
    writeState(next);
    return next;
  },
  async addOutreachTarget(locale, name) {
    const state = readState(locale);
    const trimmed = name.trim();
    if (!trimmed) return state;
    const targetId = `t-${Date.now()}`;
    const targetAddedEvent: OutreachEvent = {
      id: `evt-${Date.now()}-manual-add-${targetId}`,
      targetId,
      targetName: trimmed,
      type: 'manual_action',
      code: 'OUTREACH_MANUAL_ACTION',
      message: 'Target added manually.',
      at: new Date().toISOString(),
    };
    const next: BetaAutomationState = {
      ...state,
      outreachTargets: [
        ...state.outreachTargets,
        {
          id: targetId,
          name: trimmed,
          status: 'queued',
          currentStep: 0,
          nextRunAt: new Date().toISOString(),
        },
      ],
      outreachEvents: [...state.outreachEvents, targetAddedEvent].slice(-200),
    };
    writeState(next);
    return next;
  },
  async moveOutreachToNextStep(locale, targetId) {
    const state = readState(locale);
    const nextTargets: BetaAutomationState['outreachTargets'] = state.outreachTargets.map((target) => {
      if (target.id !== targetId) return target;
      if (target.status === 'queued') {
        return {
          ...target,
          status: 'sent',
          currentStep: 1,
          nextRunAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
      if (target.status === 'sent' && target.currentStep < 3) {
        return {
          ...target,
          currentStep: target.currentStep + 1,
          nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
      }
      return target;
    });
    const original = state.outreachTargets.find((t) => t.id === targetId);
    const changed = nextTargets.find((t) => t.id === targetId);
    const didChange = original && changed && (original.status !== changed.status || original.currentStep !== changed.currentStep);
    const stepEvent: OutreachEvent | null = didChange
      ? {
          id: `evt-${Date.now()}-manual-step-${changed.id}`,
          targetId: changed.id,
          targetName: changed.name,
          type: 'manual_action',
          code: 'OUTREACH_MANUAL_ACTION',
          message: `Manual move to step ${changed.currentStep}.`,
          at: new Date().toISOString(),
        }
      : null;
    const next: BetaAutomationState = {
      ...state,
      outreachTargets: nextTargets,
      outreachEvents: (stepEvent ? [...state.outreachEvents, stepEvent] : state.outreachEvents).slice(-200),
    };
    writeState(next);
    return next;
  },
  async markOutreachReplied(locale, targetId) {
    const state = readState(locale);
    const next: BetaAutomationState = {
      ...state,
      outreachTargets: state.outreachTargets.map((target) =>
        target.id === targetId
          ? { ...target, status: 'replied', currentStep: 3, nextRunAt: null }
          : target,
      ),
    };
    writeState(next);
    return next;
  },
  async stopOutreachSequence(locale, targetId) {
    const state = readState(locale);
    const target = state.outreachTargets.find((t) => t.id === targetId);
    const stoppedEvent: OutreachEvent | null = target
      ? {
          id: `evt-${Date.now()}-manual-stop-${target.id}`,
          targetId: target.id,
          targetName: target.name,
          type: 'manual_action',
          code: 'OUTREACH_MANUAL_ACTION',
          message: 'Sequence stopped manually.',
          at: new Date().toISOString(),
        }
      : null;
    const next: BetaAutomationState = {
      ...state,
      outreachTargets: state.outreachTargets.map((target) =>
        target.id === targetId ? { ...target, status: 'stopped', nextRunAt: null } : target,
      ),
      outreachEvents: (stoppedEvent ? [...state.outreachEvents, stoppedEvent] : state.outreachEvents).slice(-200),
    };
    writeState(next);
    return next;
  },
  async setReplyInput(locale, reply) {
    const state = readState(locale);
    const next: BetaAutomationState = { ...state, replyInput: reply };
    writeState(next);
    return next;
  },
  async runIntentClassification(locale) {
    const state = readState(locale);
    const next: BetaAutomationState = {
      ...state,
      intentResult: classifyIntent(state.replyInput, locale),
    };
    writeState(next);
    return next;
  },
  async markPublishOnTime(locale, commitmentId) {
    const state = readState(locale);
    const next: BetaAutomationState = {
      ...state,
      commitments: state.commitments.map((item) =>
        item.id === commitmentId
          ? { ...item, status: 'on_time', views24h: randomInt(12000, 20000) }
          : item,
      ),
    };
    writeState(next);
    return next;
  },
  async markPublishLate(locale, commitmentId) {
    const state = readState(locale);
    const next: BetaAutomationState = {
      ...state,
      commitments: state.commitments.map((item) =>
        item.id === commitmentId
          ? { ...item, status: 'late', views24h: randomInt(6000, 11000) }
          : item,
      ),
    };
    writeState(next);
    return next;
  },
};
