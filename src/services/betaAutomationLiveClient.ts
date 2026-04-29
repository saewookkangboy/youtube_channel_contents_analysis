import type {
  AppLocale,
  BetaAutomationClient,
  BetaAutomationState,
  IntentPrediction,
} from './betaAutomationClient';
import { betaAutomationMockClient } from './betaAutomationMockClient';
import { runOutreachAutomation } from './betaAutomationEngine';
import { normalizeBetaAutomationState } from './betaAutomationStateNormalizer';
import { getSupabaseClient } from './supabaseClient';

/**
 * Live adapter.
 * Supabase 환경변수가 없거나 쿼리 실패 시에는 mock fallback으로 안전하게 동작한다.
 */
type LiveRow = {
  id: string;
  owner_id: string | null;
  workspace_key: string;
  payload: BetaAutomationState;
  updated_at?: string;
};

const TABLE_NAME = import.meta.env.VITE_SUPABASE_BETA_TABLE || 'beta_automation_states';
const WORKSPACE_STORAGE_KEY = 'beta-automation-workspace-key-v1';
const DEFAULT_WORKSPACE_KEY = import.meta.env.VITE_SUPABASE_BETA_WORKSPACE_KEY || 'default-workspace';

export type LivePersistenceStatusDetail = {
  status: 'unknown' | 'supabase' | 'fallback';
  reason:
    | 'unknown'
    | 'ok'
    | 'missing_supabase_env'
    | 'no_auth_session'
    | 'read_failed'
    | 'write_failed'
    | 'remote_row_not_found';
  message?: string;
};

export type LiveDiagnosticItem = {
  key: 'env' | 'auth' | 'read' | 'write';
  ok: boolean;
  detail: string;
};

export type LiveDiagnosticResult = {
  items: LiveDiagnosticItem[];
  ranAt: string;
};

let lastLivePersistenceStatusDetail: LivePersistenceStatusDetail = {
  status: 'unknown',
  reason: 'unknown',
  message: undefined,
};

type LiveActor = {
  ownerId: string;
  rowId: string;
  workspaceKey: string;
};

export function readPreferredBetaWorkspaceKey(): string {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_KEY;
  return window.localStorage.getItem(WORKSPACE_STORAGE_KEY) || DEFAULT_WORKSPACE_KEY;
}

export function persistPreferredBetaWorkspaceKey(nextKey: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = nextKey.trim();
  if (!trimmed) {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, trimmed);
}

type LiveActorResult =
  | { ok: true; actor: LiveActor }
  | { ok: false; reason: 'missing_supabase_env' | 'no_auth_session' };
type OutreachEvent = BetaAutomationState['outreachEvents'][number];

async function resolveLiveActor(): Promise<LiveActorResult> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, reason: 'missing_supabase_env' };
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.id) {
    return { ok: false, reason: 'no_auth_session' };
  }
  const ownerId = data.user.id;
  const workspaceKey = readPreferredBetaWorkspaceKey();
  return {
    ok: true,
    actor: {
      ownerId,
      workspaceKey,
      rowId: `${workspaceKey}:${ownerId}`,
    },
  };
}

async function readRemote(actor: LiveActor, locale: AppLocale): Promise<BetaAutomationState | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('id,owner_id,workspace_key,payload,updated_at')
    .eq('id', actor.rowId)
    .eq('owner_id', actor.ownerId)
    .eq('workspace_key', actor.workspaceKey)
    .maybeSingle<LiveRow>();
  if (error) {
    console.warn('[beta-live] failed to load from supabase:', error.message);
    lastLivePersistenceStatusDetail = {
      status: 'fallback',
      reason: 'read_failed',
      message: error.message,
    };
    return null;
  }
  if (!data?.payload) return null;
  return normalizeBetaAutomationState(data.payload, locale);
}

async function writeRemote(actor: LiveActor, state: BetaAutomationState): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const { error } = await client
    .from(TABLE_NAME)
    .upsert({
      id: actor.rowId,
      owner_id: actor.ownerId,
      workspace_key: actor.workspaceKey,
      payload: state,
      updated_at: new Date().toISOString(),
    })
    .eq('id', actor.rowId);
  if (error) {
    console.warn('[beta-live] failed to upsert to supabase:', error.message);
    lastLivePersistenceStatusDetail = {
      status: 'fallback',
      reason: 'write_failed',
      message: error.message,
    };
    return false;
  }
  return true;
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

async function withRemoteFallback(
  locale: AppLocale,
  mutate: (current: BetaAutomationState) => BetaAutomationState,
): Promise<BetaAutomationState> {
  const actorResult = await resolveLiveActor();
  if (!actorResult.ok) {
    const { reason } = actorResult as Extract<LiveActorResult, { ok: false }>;
    lastLivePersistenceStatusDetail = { status: 'fallback', reason, message: undefined };
    return betaAutomationMockClient.load(locale);
  }
  const actor = actorResult.actor;
  const remote = await readRemote(actor, locale);
  if (!remote) {
    if (lastLivePersistenceStatusDetail.reason !== 'read_failed') {
      lastLivePersistenceStatusDetail = {
        status: 'fallback',
        reason: 'remote_row_not_found',
        message: undefined,
      };
    }
  }
  const base = remote ?? (await betaAutomationMockClient.load(locale));
  const next = mutate(base);
  if (await writeRemote(actor, next)) {
    lastLivePersistenceStatusDetail = { status: 'supabase', reason: 'ok', message: undefined };
    return next;
  }
  // 쓰기 실패 시에도 로컬 변경 사항은 유지하여 사용자 경험 개선
  return next;
}

export const betaAutomationLiveClient: BetaAutomationClient = {
  async load(locale: AppLocale): Promise<BetaAutomationState> {
    const actorResult = await resolveLiveActor();
    if (!actorResult.ok) {
      const { reason } = actorResult as Extract<LiveActorResult, { ok: false }>;
      lastLivePersistenceStatusDetail = { status: 'fallback', reason, message: undefined };
      return betaAutomationMockClient.load(locale);
    }
    const actor = actorResult.actor;
    const remote = await readRemote(actor, locale);
    if (remote) {
      const automated = runOutreachAutomation(remote);
      if (JSON.stringify(automated) !== JSON.stringify(remote)) {
        await writeRemote(actor, automated);
      }
      lastLivePersistenceStatusDetail = { status: 'supabase', reason: 'ok', message: undefined };
      return automated;
    }
    if (lastLivePersistenceStatusDetail.reason !== 'read_failed') {
      lastLivePersistenceStatusDetail = {
        status: 'fallback',
        reason: 'remote_row_not_found',
        message: undefined,
      };
    }
    return betaAutomationMockClient.load(locale);
  },
  async reset(locale: AppLocale): Promise<BetaAutomationState> {
    const next = await betaAutomationMockClient.reset(locale);
    const actorResult = await resolveLiveActor();
    if (actorResult.ok) {
      const actor = actorResult.actor;
      const ok = await writeRemote(actor, next);
      lastLivePersistenceStatusDetail = {
        status: ok ? 'supabase' : 'fallback',
        reason: ok ? 'ok' : 'write_failed',
        message: undefined,
      };
    } else {
      const { reason } = actorResult as Extract<LiveActorResult, { ok: false }>;
      lastLivePersistenceStatusDetail = { status: 'fallback', reason, message: undefined };
    }
    return next;
  },
  async runOutreachAutomationPass(locale: AppLocale): Promise<BetaAutomationState> {
    return withRemoteFallback(locale, (current) => runOutreachAutomation(current));
  },
  async ingestOutreachReplyEvent(locale: AppLocale, targetId: string): Promise<BetaAutomationState> {
    return withRemoteFallback(locale, (current) => {
      const target = current.outreachTargets.find((t) => t.id === targetId);
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
      return {
        ...current,
        outreachTargets: current.outreachTargets.map((row) =>
          row.id === targetId ? { ...row, status: 'replied', currentStep: 3, nextRunAt: null } : row,
        ),
        outreachEvents: (replyEvent
          ? [...(current.outreachEvents ?? []), replyEvent]
          : (current.outreachEvents ?? [])
        ).slice(-200),
      };
    });
  },
  async addOutreachTarget(locale: AppLocale, name: string): Promise<BetaAutomationState> {
    return withRemoteFallback(locale, (current) => {
      const trimmed = name.trim();
      if (!trimmed) return current;
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
      return {
        ...current,
        outreachTargets: [
          ...current.outreachTargets,
          {
            id: targetId,
            name: trimmed,
            status: 'queued',
            currentStep: 0,
            nextRunAt: new Date().toISOString(),
          },
        ],
        outreachEvents: [...(current.outreachEvents ?? []), targetAddedEvent].slice(-200),
      };
    });
  },
  async moveOutreachToNextStep(locale: AppLocale, targetId: string): Promise<BetaAutomationState> {
    return withRemoteFallback(locale, (current) => {
      const nextTargets: BetaAutomationState['outreachTargets'] = current.outreachTargets.map((target) => {
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
      const changed = nextTargets.find((t) => t.id === targetId);
      const stepEvent: OutreachEvent | null = changed
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
      return {
        ...current,
        outreachTargets: nextTargets,
        outreachEvents: (stepEvent
          ? [...(current.outreachEvents ?? []), stepEvent]
          : (current.outreachEvents ?? [])
        ).slice(-200),
      };
    });
  },
  async markOutreachReplied(locale: AppLocale, targetId: string): Promise<BetaAutomationState> {
    return withRemoteFallback(locale, (current) => ({
      ...current,
      outreachTargets: current.outreachTargets.map((target) =>
        target.id === targetId
          ? { ...target, status: 'replied', currentStep: 3, nextRunAt: null }
          : target,
      ),
    }));
  },
  async stopOutreachSequence(locale: AppLocale, targetId: string): Promise<BetaAutomationState> {
    return withRemoteFallback(locale, (current) => {
      const target = current.outreachTargets.find((t) => t.id === targetId);
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
      return {
        ...current,
        outreachTargets: current.outreachTargets.map((row) =>
          row.id === targetId ? { ...row, status: 'stopped', nextRunAt: null } : row,
        ),
        outreachEvents: (stoppedEvent
          ? [...(current.outreachEvents ?? []), stoppedEvent]
          : (current.outreachEvents ?? [])
        ).slice(-200),
      };
    });
  },
  async setReplyInput(locale: AppLocale, reply: string): Promise<BetaAutomationState> {
    return withRemoteFallback(locale, (current) => ({
      ...current,
      replyInput: reply,
    }));
  },
  async runIntentClassification(locale: AppLocale): Promise<BetaAutomationState> {
    return withRemoteFallback(locale, (current) => ({
      ...current,
      intentResult: classifyIntent(current.replyInput, locale),
    }));
  },
  async markPublishOnTime(locale: AppLocale, commitmentId: string): Promise<BetaAutomationState> {
    return withRemoteFallback(locale, (current) => ({
      ...current,
      commitments: current.commitments.map((item) =>
        item.id === commitmentId
          ? { ...item, status: 'on_time', views24h: randomInt(12000, 20000) }
          : item,
      ),
    }));
  },
  async markPublishLate(locale: AppLocale, commitmentId: string): Promise<BetaAutomationState> {
    return withRemoteFallback(locale, (current) => ({
      ...current,
      commitments: current.commitments.map((item) =>
        item.id === commitmentId
          ? { ...item, status: 'late', views24h: randomInt(6000, 11000) }
          : item,
      ),
    }));
  },
};

export function getLastLivePersistenceStatus(): 'unknown' | 'supabase' | 'fallback' {
  return lastLivePersistenceStatusDetail.status;
}

export function getLastLivePersistenceStatusDetail(): LivePersistenceStatusDetail {
  return lastLivePersistenceStatusDetail;
}

export async function runLiveDiagnostics(locale: AppLocale): Promise<LiveDiagnosticResult> {
  const items: LiveDiagnosticItem[] = [];
  const client = getSupabaseClient();

  if (!client) {
    items.push({ key: 'env', ok: false, detail: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY' });
    items.push({ key: 'auth', ok: false, detail: 'Skipped: env not configured' });
    items.push({ key: 'read', ok: false, detail: 'Skipped: env not configured' });
    items.push({ key: 'write', ok: false, detail: 'Skipped: env not configured' });
    return { items, ranAt: new Date().toISOString() };
  }

  items.push({ key: 'env', ok: true, detail: 'Supabase env looks configured' });

  const actorResult = await resolveLiveActor();
  if (!actorResult.ok) {
    const { reason } = actorResult as Extract<LiveActorResult, { ok: false }>;
    items.push({ key: 'auth', ok: false, detail: reason === 'no_auth_session' ? 'No auth session' : 'Auth unavailable' });
    items.push({ key: 'read', ok: false, detail: 'Skipped: auth session missing' });
    items.push({ key: 'write', ok: false, detail: 'Skipped: auth session missing' });
    return { items, ranAt: new Date().toISOString() };
  }

  const actor = actorResult.actor;
  items.push({ key: 'auth', ok: true, detail: `auth.uid present (${actor.ownerId.slice(0, 8)}...)` });

  const readResult = await readRemote(actor, locale);
  const readDetailSnapshot = getLastLivePersistenceStatusDetail();
  if (readResult) {
    items.push({
      key: 'read',
      ok: true,
      detail: 'Remote row readable',
    });
  } else if (readDetailSnapshot.reason === 'read_failed') {
    items.push({
      key: 'read',
      ok: false,
      detail: readDetailSnapshot.message || 'Failed to read remote row',
    });
  } else {
    items.push({
      key: 'read',
      ok: true,
      detail: 'Remote row not found (table reachable)',
    });
  }

  items.push({
    key: 'write',
    ok: true,
    detail: 'Skipped: diagnostics run in read-only mode to avoid mutating live rows',
  });

  return { items, ranAt: new Date().toISOString() };
}
