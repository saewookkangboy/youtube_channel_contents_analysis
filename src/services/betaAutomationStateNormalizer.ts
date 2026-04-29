import {
  INTENT_LABEL_VALUES,
  OUTREACH_EVENT_CODE_VALUES,
  OUTREACH_EVENT_TYPE_VALUES,
  OUTREACH_STATUS_VALUES,
  PUBLISH_STATUS_VALUES,
} from './betaAutomationClient';
import type { AppLocale, BetaAutomationState } from './betaAutomationClient';

const VALID_OUTREACH_STATUS = new Set<string>(OUTREACH_STATUS_VALUES);
const VALID_EVENT_TYPE = new Set<string>(OUTREACH_EVENT_TYPE_VALUES);
const VALID_EVENT_CODE = new Set<string>(OUTREACH_EVENT_CODE_VALUES);
const VALID_PUBLISH_STATUS = new Set<string>(PUBLISH_STATUS_VALUES);
const VALID_INTENT_LABEL = new Set<string>(INTENT_LABEL_VALUES);

export function buildBetaAutomationDefaultState(locale: AppLocale): BetaAutomationState {
  return {
    outreachTargets: [
      {
        id: 't-1',
        name: 'minji_creator',
        status: 'sent',
        currentStep: 1,
        nextRunAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 't-2',
        name: 'july_studio',
        status: 'queued',
        currentStep: 0,
        nextRunAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    ],
    outreachEvents: [],
    replyInput:
      locale === 'ko'
        ? '관심은 있는데 단가 범위를 먼저 알려주세요.'
        : 'I am interested but need pricing first.',
    intentResult: null,
    commitments: [
      { id: 'p-1', creator: 'mondayvlog', due: '2026-04-27 12:00', status: 'scheduled', views24h: 0 },
      { id: 'p-2', creator: 'fit_jane', due: '2026-04-25 18:00', status: 'missed', views24h: 0 },
    ],
  };
}

export function normalizeBetaAutomationState(raw: unknown, locale: AppLocale): BetaAutomationState {
  const fallback = buildBetaAutomationDefaultState(locale);
  if (!raw || typeof raw !== 'object') return fallback;
  const parsed = raw as Record<string, unknown>;

  const outreachTargets = Array.isArray(parsed.outreachTargets)
    ? parsed.outreachTargets
        .map((item): BetaAutomationState['outreachTargets'][number] | null => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Record<string, unknown>;
          if (typeof row.id !== 'string' || typeof row.name !== 'string') return null;
          const status = VALID_OUTREACH_STATUS.has(String(row.status)) ? String(row.status) : 'queued';
          return {
            id: row.id,
            name: row.name,
            status: status as BetaAutomationState['outreachTargets'][number]['status'],
            currentStep: typeof row.currentStep === 'number' ? row.currentStep : 0,
            nextRunAt:
              typeof row.nextRunAt === 'string'
                ? row.nextRunAt
                : row.nextRunAt === null
                  ? null
                  : null,
          };
        })
        .filter((item): item is BetaAutomationState['outreachTargets'][number] => item !== null)
    : fallback.outreachTargets;

  const outreachEvents = Array.isArray(parsed.outreachEvents)
    ? parsed.outreachEvents
        .map((item): BetaAutomationState['outreachEvents'][number] | null => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Record<string, unknown>;
          if (
            typeof row.id !== 'string' ||
            typeof row.targetId !== 'string' ||
            typeof row.targetName !== 'string' ||
            typeof row.message !== 'string' ||
            typeof row.at !== 'string' ||
            !VALID_EVENT_TYPE.has(String(row.type)) ||
            !VALID_EVENT_CODE.has(String(row.code))
          ) {
            return null;
          }
          return {
            id: row.id,
            targetId: row.targetId,
            targetName: row.targetName,
            type: row.type as BetaAutomationState['outreachEvents'][number]['type'],
            code: row.code as BetaAutomationState['outreachEvents'][number]['code'],
            message: row.message,
            at: row.at,
          };
        })
        .filter((item): item is BetaAutomationState['outreachEvents'][number] => item !== null)
    : fallback.outreachEvents;

  const commitments = Array.isArray(parsed.commitments)
    ? parsed.commitments
        .map((item): BetaAutomationState['commitments'][number] | null => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Record<string, unknown>;
          if (typeof row.id !== 'string' || typeof row.creator !== 'string' || typeof row.due !== 'string') {
            return null;
          }
          const status = VALID_PUBLISH_STATUS.has(String(row.status)) ? String(row.status) : 'scheduled';
          return {
            id: row.id,
            creator: row.creator,
            due: row.due,
            status: status as BetaAutomationState['commitments'][number]['status'],
            views24h: typeof row.views24h === 'number' ? row.views24h : 0,
          };
        })
        .filter((item): item is BetaAutomationState['commitments'][number] => item !== null)
    : fallback.commitments;

  const intentRaw = parsed.intentResult;
  const intentResult =
    intentRaw && typeof intentRaw === 'object'
      ? (() => {
          const row = intentRaw as Record<string, unknown>;
          if (
            !VALID_INTENT_LABEL.has(String(row.label)) ||
            typeof row.confidence !== 'number' ||
            typeof row.nextAction !== 'string' ||
            typeof row.draft !== 'string'
          ) {
            return null;
          }
          return {
            label: row.label as NonNullable<BetaAutomationState['intentResult']>['label'],
            confidence: row.confidence,
            nextAction: row.nextAction,
            draft: row.draft,
          };
        })()
      : null;

  return {
    outreachTargets,
    outreachEvents,
    replyInput: typeof parsed.replyInput === 'string' ? parsed.replyInput : fallback.replyInput,
    intentResult,
    commitments,
  };
}
