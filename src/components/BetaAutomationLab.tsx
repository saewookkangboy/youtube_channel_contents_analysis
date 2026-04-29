import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  CircleX,
  ChevronRight,
  Clock3,
  FlaskConical,
  MessageSquareReply,
  Rocket,
  Send,
  Sparkles,
  Target,
  Workflow,
} from 'lucide-react';
import {
  CHANNEL_STRUCTURE_SECTION_COUNT,
  ORCHESTRATOR_ROLE_CARD,
  VIDEO_STRUCTURE_SECTION_COUNT,
} from '../dev/agentOrchestrationRoles';
import { BETA_SQL_GUIDE_SNIPPET, BETA_SQL_GUIDE_SUMMARY } from '../dev/betaSqlGuide';
import {
  createBetaAutomationClient,
  persistPreferredBetaMode,
  persistPreferredBetaWorkspaceKey,
  readPreferredBetaMode,
  readPreferredBetaWorkspaceKey,
  type BetaMode,
  type IntentLabel,
  type IntentPrediction,
  type OutreachStatus,
  type OutreachTarget,
  type PublishCommitment,
  type PublishStatus,
} from '../services/betaAutomationService';
import { getLastLivePersistenceStatusDetail } from '../services/betaAutomationLiveClient';
import { runLiveDiagnostics } from '../services/betaAutomationLiveClient';
import { getSupabaseClient, getSupabaseUser } from '../services/supabaseClient';

type AppLocale = 'ko' | 'en';

type BetaAutomationLabProps = {
  locale: AppLocale;
};

type BetaCopy = {
  badge: string;
  title: string;
  subtitle: string;
  roleCardTitle: string;
  roleCardFootnote: string;
  sectionSpecLabel: string;
  featuresTitle: string;
  roadmapTitle: string;
  kpisTitle: string;
  playgroundTitle: string;
  playgroundSubtitle: string;
  outreachTitle: string;
  intentTitle: string;
  publishTitle: string;
  addTarget: string;
  resetDemo: string;
  runClassifier: string;
  markPublished: string;
  runAutomationPass: string;
  ingestReplyWebhook: string;
  nextRunAtLabel: string;
  planDraftPrefix: string;
  modeMock: string;
  modeLive: string;
  liveAuthHint: string;
  liveAuthTitle: string;
  liveAuthEmailPlaceholder: string;
  liveAuthSendOtp: string;
  liveAuthSignOut: string;
  liveAuthSignedInAs: string;
  liveAuthSignedOut: string;
  liveAuthOtpSent: string;
  liveAuthOtpFailed: string;
  livePersistenceSupabase: string;
  livePersistenceFallback: string;
  livePersistenceUnknown: string;
  livePersistenceReasonTitle: string;
  liveReasonMissingEnv: string;
  liveReasonNoAuth: string;
  liveReasonReadFailed: string;
  liveReasonWriteFailed: string;
  liveReasonNoRow: string;
  liveReasonOk: string;
  workspaceKeyLabel: string;
  workspaceKeyPlaceholder: string;
  workspaceKeySave: string;
  liveErrorMessageLabel: string;
  liveGuideTitle: string;
  liveGuideAuth: string;
  liveGuideRls: string;
  liveGuideSchema: string;
  liveGuideEnv: string;
  liveGuideNetwork: string;
  liveGuideUnknown: string;
  runDiagnostics: string;
  diagnosticsTitle: string;
  diagnosticsRanAt: string;
  diagEnv: string;
  diagAuth: string;
  diagRead: string;
  diagWrite: string;
  diagActionSendOtp: string;
  diagActionSaveWorkspace: string;
  diagActionOpenSqlGuide: string;
  diagActionRetry: string;
  sqlGuideClose: string;
  autoTickStatus: string;
  autoTickLastRun: string;
  outreachEventsTitle: string;
  outreachEventsFilterType: string;
  outreachEventsFilterTarget: string;
  outreachEventsAllTypes: string;
  outreachEventsAllTargets: string;
  outreachEventsSearch: string;
  outreachEventsExportCsv: string;
  platformLabel: string;
  platformYoutube: string;
  platformInstagram: string;
  platformTiktok: string;
  targetHandlePlaceholder: string;
};

type FeatureCard = {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  status: 'in_progress' | 'ready' | 'planned';
};

type RoadmapItem = {
  week: string;
  work: string;
};

const COPY: Record<AppLocale, BetaCopy> = {
  ko: {
    badge: 'Beta Test',
    title: 'Automation Orchestration Lab',
    subtitle:
      '기존 분석 서비스는 유지한 채, 자동화 기능 3종(아웃리치·의도분석·게시추적)을 실험하는 전용 탭입니다.',
    roleCardTitle: 'Orchestrator 기준 (agentOrchestrationRoles.ts)',
    roleCardFootnote:
      '이 역할 카드는 리포트 생성 오케스트레이션 기준으로도 사용됩니다. 베타 자동화 플로우는 동일한 순차 실행 원칙을 따릅니다.',
    sectionSpecLabel: '리포트 구조 스펙',
    featuresTitle: '베타 기능 구성',
    roadmapTitle: '8주 베타 로드맵',
    kpisTitle: '검증 KPI',
    playgroundTitle: 'Interactive Beta Playground',
    playgroundSubtitle: '아래 패널은 실제 API 연결 전, 운영 흐름을 검증하기 위한 시뮬레이션입니다.',
    outreachTitle: 'Smart Outreach Flow 시뮬레이터',
    intentTitle: 'Reply Intent Copilot 시뮬레이터',
    publishTitle: 'Auto Publish Tracker 시뮬레이터',
    addTarget: '타깃 추가',
    resetDemo: '초기화',
    runClassifier: '의도 분류 실행',
    markPublished: '게시 완료 처리',
    runAutomationPass: '자동화 패스 실행',
    ingestReplyWebhook: 'Reply Webhook 수신',
    nextRunAtLabel: '다음 자동 실행',
    planDraftPrefix: '추천 답장 초안',
    modeMock: 'Mock',
    modeLive: 'Live',
    liveAuthHint: 'Live 모드는 Supabase 로그인(auth.uid())이 없으면 Mock 데이터로 자동 폴백됩니다.',
    liveAuthTitle: 'Live 인증',
    liveAuthEmailPlaceholder: '이메일 주소',
    liveAuthSendOtp: 'OTP 링크 발송',
    liveAuthSignOut: '로그아웃',
    liveAuthSignedInAs: '로그인됨',
    liveAuthSignedOut: '로그인 없음',
    liveAuthOtpSent: '로그인 링크를 이메일로 전송했습니다.',
    liveAuthOtpFailed: '로그인 링크 전송에 실패했습니다. Supabase 설정을 확인하세요.',
    livePersistenceSupabase: '저장 위치: Supabase Live',
    livePersistenceFallback: '저장 위치: Mock Fallback',
    livePersistenceUnknown: '저장 위치: 확인 중',
    livePersistenceReasonTitle: '상태 사유',
    liveReasonMissingEnv: 'Supabase URL/KEY 설정 없음',
    liveReasonNoAuth: '로그인 세션 없음',
    liveReasonReadFailed: '원격 조회 실패',
    liveReasonWriteFailed: '원격 저장 실패',
    liveReasonNoRow: '원격 row 없음(초기 상태 사용)',
    liveReasonOk: '정상 연결',
    workspaceKeyLabel: 'Workspace Key',
    workspaceKeyPlaceholder: '예: spray-beta',
    workspaceKeySave: '저장',
    liveErrorMessageLabel: '에러 메시지',
    liveGuideTitle: '해결 가이드',
    liveGuideAuth: 'Supabase 로그인 세션을 먼저 확인하고, OTP 로그인 후 다시 시도하세요.',
    liveGuideRls: 'RLS 정책에서 owner_id = auth.uid() 조건과 UPDATE용 SELECT 정책 존재 여부를 확인하세요.',
    liveGuideSchema: 'beta_automation_states 테이블/컬럼(owner_id, workspace_key, payload)이 SQL 스키마와 일치하는지 확인하세요.',
    liveGuideEnv: 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 설정되어 있는지 확인하세요.',
    liveGuideNetwork: '네트워크 연결 또는 Supabase 프로젝트 상태(일시 장애/타임아웃)를 확인하세요.',
    liveGuideUnknown: '콘솔 로그와 에러 메시지를 확인한 뒤, 테이블/정책/환경변수를 순서대로 점검하세요.',
    runDiagnostics: '진단 실행',
    diagnosticsTitle: '원클릭 진단 체크리스트',
    diagnosticsRanAt: '실행 시각',
    diagEnv: '환경변수',
    diagAuth: '인증세션',
    diagRead: '원격 조회',
    diagWrite: '원격 저장',
    diagActionSendOtp: 'OTP 발송',
    diagActionSaveWorkspace: '키 저장',
    diagActionOpenSqlGuide: 'SQL 가이드',
    diagActionRetry: '재시도',
    sqlGuideClose: '닫기',
    autoTickStatus: '자동 스케줄러',
    autoTickLastRun: '마지막 실행',
    outreachEventsTitle: 'Outreach 이벤트 타임라인',
    outreachEventsFilterType: '타입 필터',
    outreachEventsFilterTarget: '타깃 필터',
    outreachEventsAllTypes: '전체 타입',
    outreachEventsAllTargets: '전체 타깃',
    outreachEventsSearch: '이벤트 검색',
    outreachEventsExportCsv: 'CSV 다운로드',
    platformLabel: '플랫폼',
    platformYoutube: '유튜브',
    platformInstagram: '인스타그램',
    platformTiktok: '틱톡',
    targetHandlePlaceholder: '인플루언서 핸들',
  },
  en: {
    badge: 'Beta Test',
    title: 'Automation Orchestration Lab',
    subtitle:
      'This isolated tab validates outreach, intent, and publish-tracking automation while keeping the existing analysis experience unchanged.',
    roleCardTitle: 'Orchestrator baseline (agentOrchestrationRoles.ts)',
    roleCardFootnote:
      'The same role card used in report orchestration is reused here to keep the beta workflow sequencing consistent.',
    sectionSpecLabel: 'Report structure spec',
    featuresTitle: 'Beta feature scope',
    roadmapTitle: '8-week beta roadmap',
    kpisTitle: 'Validation KPIs',
    playgroundTitle: 'Interactive Beta Playground',
    playgroundSubtitle: 'Simulation panels validate operator flow before live API integration.',
    outreachTitle: 'Smart Outreach Flow Simulator',
    intentTitle: 'Reply Intent Copilot Simulator',
    publishTitle: 'Auto Publish Tracker Simulator',
    addTarget: 'Add target',
    resetDemo: 'Reset',
    runClassifier: 'Run intent classification',
    markPublished: 'Mark as published',
    runAutomationPass: 'Run automation pass',
    ingestReplyWebhook: 'Ingest reply webhook',
    nextRunAtLabel: 'Next auto run',
    planDraftPrefix: 'Suggested draft',
    modeMock: 'Mock',
    modeLive: 'Live',
    liveAuthHint: 'Live mode falls back to mock data when there is no Supabase auth session.',
    liveAuthTitle: 'Live authentication',
    liveAuthEmailPlaceholder: 'Email address',
    liveAuthSendOtp: 'Send OTP link',
    liveAuthSignOut: 'Sign out',
    liveAuthSignedInAs: 'Signed in',
    liveAuthSignedOut: 'Signed out',
    liveAuthOtpSent: 'Magic link sent to your email.',
    liveAuthOtpFailed: 'Failed to send magic link. Check Supabase settings.',
    livePersistenceSupabase: 'Persistence: Supabase Live',
    livePersistenceFallback: 'Persistence: Mock fallback',
    livePersistenceUnknown: 'Persistence: checking',
    livePersistenceReasonTitle: 'Reason',
    liveReasonMissingEnv: 'Missing Supabase URL/KEY',
    liveReasonNoAuth: 'No auth session',
    liveReasonReadFailed: 'Failed to read remote row',
    liveReasonWriteFailed: 'Failed to write remote row',
    liveReasonNoRow: 'Remote row not found (using defaults)',
    liveReasonOk: 'Connected',
    workspaceKeyLabel: 'Workspace Key',
    workspaceKeyPlaceholder: 'e.g. spray-beta',
    workspaceKeySave: 'Save',
    liveErrorMessageLabel: 'Error message',
    liveGuideTitle: 'Resolution guide',
    liveGuideAuth: 'Check Supabase auth session first, then retry after OTP sign-in.',
    liveGuideRls: 'Verify RLS policies include owner_id = auth.uid() and SELECT policy required for UPDATE.',
    liveGuideSchema: 'Confirm beta_automation_states table/columns (owner_id, workspace_key, payload) match the SQL schema.',
    liveGuideEnv: 'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.',
    liveGuideNetwork: 'Check network connectivity and Supabase project health (timeouts/outage).',
    liveGuideUnknown: 'Inspect console logs and validate schema, policies, and environment variables in order.',
    runDiagnostics: 'Run diagnostics',
    diagnosticsTitle: 'One-click diagnostics',
    diagnosticsRanAt: 'Ran at',
    diagEnv: 'Environment',
    diagAuth: 'Auth session',
    diagRead: 'Remote read',
    diagWrite: 'Remote write',
    diagActionSendOtp: 'Send OTP',
    diagActionSaveWorkspace: 'Save key',
    diagActionOpenSqlGuide: 'SQL guide',
    diagActionRetry: 'Retry',
    sqlGuideClose: 'Close',
    autoTickStatus: 'Auto scheduler',
    autoTickLastRun: 'Last run',
    outreachEventsTitle: 'Outreach event timeline',
    outreachEventsFilterType: 'Filter by type',
    outreachEventsFilterTarget: 'Filter by target',
    outreachEventsAllTypes: 'All types',
    outreachEventsAllTargets: 'All targets',
    outreachEventsSearch: 'Search events',
    outreachEventsExportCsv: 'Download CSV',
    platformLabel: 'Platform',
    platformYoutube: 'YouTube',
    platformInstagram: 'Instagram',
    platformTiktok: 'TikTok',
    targetHandlePlaceholder: 'Influencer handle',
  },
};

const STATUS_STYLE: Record<FeatureCard['status'], string> = {
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  planned: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_LABEL: Record<AppLocale, Record<FeatureCard['status'], string>> = {
  ko: {
    in_progress: '구현 진행',
    ready: '베타 준비',
    planned: '다음 단계',
  },
  en: {
    in_progress: 'In progress',
    ready: 'Ready for beta',
    planned: 'Next up',
  },
};

const FEATURE_CARDS: Record<AppLocale, FeatureCard[]> = {
  ko: [
    {
      id: 'smart-outreach-flow',
      title: 'Smart Outreach Flow',
      summary: '캠페인별 자동 발송 시퀀스와 응답 시 자동 중단 상태머신',
      bullets: [
        'Day 0/2/5 단계형 발송 스케줄 + 실패 재시도',
        '답장 이벤트 수신 시 시퀀스 자동 중지',
        '운영자 예외 처리 큐(실패/반송/수동 재시도)',
      ],
      status: 'in_progress',
    },
    {
      id: 'reply-intent-copilot',
      title: 'Reply Intent Copilot',
      summary: '인바운드 답장 의도 분류와 후속 액션 초안 자동화',
      bullets: [
        '관심/가격문의/보류/거절/기타 5분류 + confidence',
        '의도별 액션 추천 및 승인형 답장 초안',
        '운영자 정정 데이터로 분류 정확도 루프 구축',
      ],
      status: 'ready',
    },
    {
      id: 'auto-publish-tracker',
      title: 'Auto Publish Tracker',
      summary: '게시 약속 이행 감지 및 24h/72h/7d 성과 스냅샷 자동 수집',
      bullets: [
        'on-time/late/missed 자동 판별',
        '미게시 자동 리마인드 + 내부 알림',
        '캠페인 종료 시 요약 리포트 자동 생성',
      ],
      status: 'planned',
    },
  ],
  en: [
    {
      id: 'smart-outreach-flow',
      title: 'Smart Outreach Flow',
      summary: 'Automated sequence engine with auto-stop on reply.',
      bullets: [
        'Day 0/2/5 sequence scheduling with retry policy',
        'Auto-stop when a reply event is received',
        'Operator exception queue for failed deliveries',
      ],
      status: 'in_progress',
    },
    {
      id: 'reply-intent-copilot',
      title: 'Reply Intent Copilot',
      summary: 'Inbound intent classification with suggested next actions.',
      bullets: [
        '5 intent classes with confidence score',
        'Approval-based draft generation per intent',
        'Human correction loop for ongoing quality tuning',
      ],
      status: 'ready',
    },
    {
      id: 'auto-publish-tracker',
      title: 'Auto Publish Tracker',
      summary: 'Publish SLA tracking and periodic performance snapshots.',
      bullets: [
        'on-time/late/missed status detection',
        'Auto reminder and internal alert for missed posts',
        'Auto campaign closeout summary report',
      ],
      status: 'planned',
    },
  ],
};

const ROADMAP: Record<AppLocale, RoadmapItem[]> = {
  ko: [
    { week: '1-2주', work: '아웃리치 시퀀스 엔진 + 이벤트 웹훅 안정화' },
    { week: '3-4주', work: '의도 분류/추천 답장 + 운영 검수 큐' },
    { week: '5-6주', work: '게시 감지/누락 알림 + 성과 수집 파이프라인' },
    { week: '7-8주', work: '자동 리포트 + 파일럿 KPI 검증' },
  ],
  en: [
    { week: 'Weeks 1-2', work: 'Outreach sequence engine and webhook hardening' },
    { week: 'Weeks 3-4', work: 'Intent classification and approval queue' },
    { week: 'Weeks 5-6', work: 'Publish detection and performance collection' },
    { week: 'Weeks 7-8', work: 'Auto-reporting and pilot KPI validation' },
  ],
};

const KPI_ITEMS: Record<AppLocale, string[]> = {
  ko: [
    '응답 처리 시간 30% 단축',
    '의도 분류 정확도 80% 이상',
    '게시 누락 감지율 95% 이상',
    '자동 발송 실패율 2% 미만',
  ],
  en: [
    '30% faster inbound handling',
    'Intent classification accuracy >= 80%',
    'Publish miss detection >= 95%',
    'Auto-send failure rate < 2%',
  ],
};

const OUTREACH_STATUS_LABEL: Record<AppLocale, Record<OutreachStatus, string>> = {
  ko: {
    queued: '대기',
    sent: '발송됨',
    replied: '응답됨',
    stopped: '중단',
  },
  en: {
    queued: 'Queued',
    sent: 'Sent',
    replied: 'Replied',
    stopped: 'Stopped',
  },
};

const OUTREACH_STATUS_BADGE: Record<OutreachStatus, string> = {
  queued: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  replied: 'bg-emerald-100 text-emerald-700',
  stopped: 'bg-amber-100 text-amber-700',
};

const INTENT_LABEL_LABEL: Record<AppLocale, Record<IntentLabel, string>> = {
  ko: {
    interested: '관심 있음',
    pricing: '가격 문의',
    defer: '추후 검토',
    decline: '거절',
    other: '기타',
  },
  en: {
    interested: 'Interested',
    pricing: 'Pricing',
    defer: 'Defer',
    decline: 'Decline',
    other: 'Other',
  },
};

const PUBLISH_STATUS_LABEL: Record<AppLocale, Record<PublishStatus, string>> = {
  ko: {
    scheduled: '예정',
    on_time: '정시 게시',
    late: '지연 게시',
    missed: '미게시',
  },
  en: {
    scheduled: 'Scheduled',
    on_time: 'On time',
    late: 'Late',
    missed: 'Missed',
  },
};

const PUBLISH_STATUS_BADGE: Record<PublishStatus, string> = {
  scheduled: 'bg-slate-100 text-slate-600',
  on_time: 'bg-emerald-100 text-emerald-700',
  late: 'bg-amber-100 text-amber-700',
  missed: 'bg-rose-100 text-rose-700',
};

type OutreachPlatform = 'youtube' | 'instagram' | 'tiktok';

const PLATFORM_LABEL: Record<AppLocale, Record<OutreachPlatform, string>> = {
  ko: {
    youtube: '유튜브',
    instagram: '인스타그램',
    tiktok: '틱톡',
  },
  en: {
    youtube: 'YouTube',
    instagram: 'Instagram',
    tiktok: 'TikTok',
  },
};

const PLATFORM_BADGE_STYLE: Record<OutreachPlatform, string> = {
  youtube: 'bg-rose-100 text-rose-700',
  instagram: 'bg-fuchsia-100 text-fuchsia-700',
  tiktok: 'bg-cyan-100 text-cyan-700',
};

function extractPlatformFromTargetName(
  locale: AppLocale,
  rawName: string,
): { platform: OutreachPlatform | null; handle: string; platformLabel: string | null } {
  const trimmed = rawName.trim();
  const match = trimmed.match(/^\[(.+?)\]\s*(.*)$/);
  if (!match) {
    return { platform: null, handle: trimmed, platformLabel: null };
  }
  const rawPlatform = match[1].trim().toLowerCase();
  const handle = match[2]?.trim() ?? '';
  const platformMap: Record<string, OutreachPlatform> = {
    '유튜브': 'youtube',
    'youtube': 'youtube',
    '인스타그램': 'instagram',
    'instagram': 'instagram',
    '틱톡': 'tiktok',
    'tiktok': 'tiktok',
  };
  const platform = platformMap[rawPlatform] ?? null;
  if (!platform) {
    return { platform: null, handle: trimmed, platformLabel: null };
  }
  return {
    platform,
    handle: handle || trimmed,
    platformLabel: PLATFORM_LABEL[locale][platform],
  };
}

function classifyLiveErrorMessage(message: string | null): 'auth' | 'rls' | 'schema' | 'env' | 'network' | 'unknown' {
  if (!message) return 'unknown';
  const lower = message.toLowerCase();
  if (lower.includes('jwt') || lower.includes('auth') || lower.includes('session')) return 'auth';
  if (lower.includes('policy') || lower.includes('row-level') || lower.includes('permission denied')) return 'rls';
  if (
    lower.includes('relation') ||
    lower.includes('column') ||
    lower.includes('does not exist') ||
    lower.includes('schema')
  ) {
    return 'schema';
  }
  if (lower.includes('invalid api key') || lower.includes('anon') || lower.includes('url')) return 'env';
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('fetch')) return 'network';
  return 'unknown';
}

export function BetaAutomationLab({ locale }: BetaAutomationLabProps) {
  const copy = COPY[locale];
  const cards = FEATURE_CARDS[locale];
  const roadmap = ROADMAP[locale];
  const kpis = KPI_ITEMS[locale];
  const [betaMode, setBetaMode] = useState<BetaMode>(() => readPreferredBetaMode());
  const client = useMemo(() => createBetaAutomationClient(betaMode), [betaMode]);
  const [targetName, setTargetName] = useState('');
  const [targetPlatform, setTargetPlatform] = useState<OutreachPlatform>('youtube');
  const [outreachTargets, setOutreachTargets] = useState<OutreachTarget[]>([]);
  const [outreachEvents, setOutreachEvents] = useState<
    Array<{
      id: string;
      targetId: string;
      targetName: string;
      type: 'auto_step' | 'auto_stop' | 'reply_webhook' | 'manual_action';
      code:
        | 'OUTREACH_AUTO_STEP'
        | 'OUTREACH_AUTO_STOP'
        | 'OUTREACH_REPLY_WEBHOOK'
        | 'OUTREACH_MANUAL_ACTION';
      message: string;
      at: string;
    }>
  >([]);
  const [eventTypeFilter, setEventTypeFilter] = useState<
    'all' | 'auto_step' | 'auto_stop' | 'reply_webhook' | 'manual_action'
  >('all');
  const [eventTargetFilter, setEventTargetFilter] = useState<string>('all');
  const [eventSearch, setEventSearch] = useState('');
  const [replyInput, setReplyInput] = useState('');
  const [intentResult, setIntentResult] = useState<IntentPrediction | null>(null);
  const [commitments, setCommitments] = useState<PublishCommitment[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [liveEmail, setLiveEmail] = useState('');
  const [liveUserId, setLiveUserId] = useState<string | null>(null);
  const [liveAuthNotice, setLiveAuthNotice] = useState<string | null>(null);
  const [livePersistence, setLivePersistence] = useState<'unknown' | 'supabase' | 'fallback'>('unknown');
  const [liveReason, setLiveReason] = useState<
    | 'unknown'
    | 'ok'
    | 'missing_supabase_env'
    | 'no_auth_session'
    | 'read_failed'
    | 'write_failed'
    | 'remote_row_not_found'
  >('unknown');
  const [workspaceKeyInput, setWorkspaceKeyInput] = useState(() => readPreferredBetaWorkspaceKey());
  const [liveReasonMessage, setLiveReasonMessage] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Array<{ key: 'env' | 'auth' | 'read' | 'write'; ok: boolean; detail: string }>>([]);
  const [diagnosticsRanAt, setDiagnosticsRanAt] = useState<string | null>(null);
  const [sqlGuideOpen, setSqlGuideOpen] = useState(false);
  const [autoTickLastRunAt, setAutoTickLastRunAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    client.load(locale)
      .then((state) => {
        if (!active) return;
        setOutreachTargets(state.outreachTargets);
        setOutreachEvents(state.outreachEvents ?? []);
        setReplyInput(state.replyInput);
        setIntentResult(state.intentResult);
        setCommitments(state.commitments);
        const detail = getLastLivePersistenceStatusDetail();
        setLivePersistence(detail.status);
        setLiveReason(detail.reason);
        setLiveReasonMessage(detail.message ?? null);
      })
      .catch((err) => {
        if (!active) return;
        console.error('[BetaAutomationLab] load failed:', err);
      });
    return () => {
      active = false;
    };
  }, [client, locale]);

  useEffect(() => {
    let active = true;
    const timer = window.setInterval(() => {
      void client.runOutreachAutomationPass(locale).then((next) => {
        if (!active) return;
        syncState(next);
        setAutoTickLastRunAt(new Date().toISOString());
      });
    }, 20000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [client, locale]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLiveUserId(null);
      return;
    }
    void getSupabaseUser().then((user) => setLiveUserId(user?.id ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLiveUserId(session?.user?.id ?? null);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const outreachKpi = useMemo(() => {
    const total = outreachTargets.length;
    const replied = outreachTargets.filter((t) => t.status === 'replied').length;
    const sent = outreachTargets.filter((t) => t.status === 'sent' || t.status === 'replied').length;
    const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
    return { total, sent, replied, replyRate };
  }, [outreachTargets]);

  const publishKpi = useMemo(() => {
    const total = commitments.length;
    const onTime = commitments.filter((item) => item.status === 'on_time').length;
    const missed = commitments.filter((item) => item.status === 'missed').length;
    const onTimeRate = total > 0 ? Math.round((onTime / total) * 100) : 0;
    return { total, onTime, missed, onTimeRate };
  }, [commitments]);

  const syncState = (next: {
    outreachTargets: OutreachTarget[];
    outreachEvents: Array<{
      id: string;
      targetId: string;
      targetName: string;
      type: 'auto_step' | 'auto_stop' | 'reply_webhook' | 'manual_action';
      code:
        | 'OUTREACH_AUTO_STEP'
        | 'OUTREACH_AUTO_STOP'
        | 'OUTREACH_REPLY_WEBHOOK'
        | 'OUTREACH_MANUAL_ACTION';
      message: string;
      at: string;
    }>;
    replyInput: string;
    intentResult: IntentPrediction | null;
    commitments: PublishCommitment[];
  }) => {
    setOutreachTargets(next.outreachTargets);
    setOutreachEvents(next.outreachEvents ?? []);
    setReplyInput(next.replyInput);
    setIntentResult(next.intentResult);
    setCommitments(next.commitments);
  };

  const withSync = async (action: () => Promise<{
    outreachTargets: OutreachTarget[];
    outreachEvents: Array<{
      id: string;
      targetId: string;
      targetName: string;
      type: 'auto_step' | 'auto_stop' | 'reply_webhook' | 'manual_action';
      code:
        | 'OUTREACH_AUTO_STEP'
        | 'OUTREACH_AUTO_STOP'
        | 'OUTREACH_REPLY_WEBHOOK'
        | 'OUTREACH_MANUAL_ACTION';
      message: string;
      at: string;
    }>;
    replyInput: string;
    intentResult: IntentPrediction | null;
    commitments: PublishCommitment[];
  }>) => {
    setSyncing(true);
    try {
      const next = await action();
      syncState(next);
      const detail = getLastLivePersistenceStatusDetail();
      setLivePersistence(detail.status);
      setLiveReason(detail.reason);
      setLiveReasonMessage(detail.message ?? null);
    } finally {
      setSyncing(false);
    }
  };

  const addTarget = () => {
    void withSync(async () => {
      const normalizedName = targetName.trim();
      if (!normalizedName) return await client.load(locale);
      const decoratedName = `[${PLATFORM_LABEL[locale][targetPlatform]}] ${normalizedName}`;
      const next = await client.addOutreachTarget(locale, decoratedName);
      setTargetName('');
      return next;
    });
  };

  const advanceOutreach = (id: string) => {
    void withSync(() => client.moveOutreachToNextStep(locale, id));
  };

  const markReplied = (id: string) => {
    void withSync(() => client.markOutreachReplied(locale, id));
  };

  const ingestReplyWebhook = (id: string) => {
    void withSync(() => client.ingestOutreachReplyEvent(locale, id));
  };

  const stopSequence = (id: string) => {
    void withSync(() => client.stopOutreachSequence(locale, id));
  };

  const onChangeReply = (value: string) => {
    setReplyInput(value);
    void client.setReplyInput(locale, value);
  };

  const runIntentClassifier = () => {
    void withSync(() => client.runIntentClassification(locale));
  };

  const runAutomationPass = () => {
    void withSync(() => client.runOutreachAutomationPass(locale));
  };

  const markPublished = (id: string) => {
    void withSync(() => client.markPublishOnTime(locale, id));
  };

  const markLate = (id: string) => {
    void withSync(() => client.markPublishLate(locale, id));
  };

  const resetDemo = () => {
    void withSync(() => client.reset(locale));
  };

  const onChangeMode = (nextMode: BetaMode) => {
    persistPreferredBetaMode(nextMode);
    setBetaMode(nextMode);
  };

  const handleSendOtp = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !liveEmail.trim()) return;
    const { error } = await supabase.auth.signInWithOtp({
      email: liveEmail.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}?tab=beta`,
      },
    });
    if (error) {
      setLiveAuthNotice(copy.liveAuthOtpFailed);
      return;
    }
    setLiveAuthNotice(copy.liveAuthOtpSent);
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[BetaAutomationLab] signOut failed:', error);
      return;
    }
    setLiveAuthNotice(null);
  };

  const saveWorkspaceKey = () => {
    persistPreferredBetaWorkspaceKey(workspaceKeyInput);
    setWorkspaceKeyInput(readPreferredBetaWorkspaceKey());
    if (betaMode === 'live') {
      void withSync(() => client.load(locale));
    }
  };

  const runDiagnosticsNow = async () => {
    setSyncing(true);
    try {
      const result = await runLiveDiagnostics(locale);
      setDiagnostics(result.items);
      setDiagnosticsRanAt(result.ranAt);
      const detail = getLastLivePersistenceStatusDetail();
      setLivePersistence(detail.status);
      setLiveReason(detail.reason);
      setLiveReasonMessage(detail.message ?? null);
    } finally {
      setSyncing(false);
    }
  };

  const openSqlGuide = () => setSqlGuideOpen(true);

  const liveReasonLabel = (() => {
    switch (liveReason) {
      case 'ok':
        return copy.liveReasonOk;
      case 'missing_supabase_env':
        return copy.liveReasonMissingEnv;
      case 'no_auth_session':
        return copy.liveReasonNoAuth;
      case 'read_failed':
        return copy.liveReasonReadFailed;
      case 'write_failed':
        return copy.liveReasonWriteFailed;
      case 'remote_row_not_found':
        return copy.liveReasonNoRow;
      case 'unknown':
      default:
        return copy.livePersistenceUnknown;
    }
  })();

  const liveGuide = (() => {
    if (liveReason === 'missing_supabase_env') return copy.liveGuideEnv;
    if (liveReason === 'no_auth_session') return copy.liveGuideAuth;
    if (liveReason === 'read_failed' || liveReason === 'write_failed') {
      const category = classifyLiveErrorMessage(liveReasonMessage);
      switch (category) {
        case 'auth':
          return copy.liveGuideAuth;
        case 'rls':
          return copy.liveGuideRls;
        case 'schema':
          return copy.liveGuideSchema;
        case 'env':
          return copy.liveGuideEnv;
        case 'network':
          return copy.liveGuideNetwork;
        case 'unknown':
        default:
          return copy.liveGuideUnknown;
      }
    }
    if (liveReason === 'remote_row_not_found') return copy.liveGuideSchema;
    return copy.liveGuideUnknown;
  })();

  const eventTargets = useMemo(() => {
    const set = new Set<string>();
    for (const evt of outreachEvents) set.add(evt.targetName);
    return ['all', ...Array.from(set)];
  }, [outreachEvents]);

  const filteredEvents = useMemo(() => {
    return [...outreachEvents]
      .reverse()
      .filter((evt) => (eventTypeFilter === 'all' ? true : evt.type === eventTypeFilter))
      .filter((evt) => (eventTargetFilter === 'all' ? true : evt.targetName === eventTargetFilter))
      .filter((evt) => {
        if (!eventSearch.trim()) return true;
        const q = eventSearch.trim().toLowerCase();
        return (
          evt.targetName.toLowerCase().includes(q) ||
          evt.type.toLowerCase().includes(q) ||
          evt.code.toLowerCase().includes(q) ||
          evt.message.toLowerCase().includes(q)
        );
      })
      .slice(0, 40);
  }, [outreachEvents, eventTypeFilter, eventTargetFilter, eventSearch]);

  const exportEventsCsv = () => {
    if (filteredEvents.length === 0) return;
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const header = ['at', 'targetId', 'targetName', 'type', 'code', 'message'].join(',');
    const rows = filteredEvents.map((evt) =>
      [
        escapeCsv(evt.at),
        escapeCsv(evt.targetId),
        escapeCsv(evt.targetName),
        escapeCsv(evt.type),
        escapeCsv(evt.code),
        escapeCsv(evt.message),
      ].join(','),
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'outreach-events.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="order-1 rounded-3xl border border-violet-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          <FlaskConical className="h-3.5 w-3.5" />
          {copy.badge}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{copy.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600">{copy.subtitle}</p>
      </div>

      <div className="order-3 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Bot className="h-4 w-4 text-violet-600" />
          {copy.roleCardTitle}
        </h3>
        <p className="rounded-2xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
          {ORCHESTRATOR_ROLE_CARD}
        </p>
        <p className="mt-3 text-xs text-gray-500">{copy.roleCardFootnote}</p>
        <p className="mt-2 text-xs font-medium text-gray-500">
          {copy.sectionSpecLabel}: Channel {CHANNEL_STRUCTURE_SECTION_COUNT} / Video{' '}
          {VIDEO_STRUCTURE_SECTION_COUNT}
        </p>
      </div>

      <div className="order-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Workflow className="h-4 w-4 text-sky-600" />
          {copy.featuresTitle}
        </h3>
        <div className="grid gap-4 lg:grid-cols-3">
          {cards.map((card) => (
            <article key={card.id} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-gray-900">{card.title}</h4>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[card.status]}`}
                >
                  {STATUS_LABEL[locale][card.status]}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-gray-600">{card.summary}</p>
              <ul className="mt-3 space-y-1.5 text-xs text-gray-600">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-gray-400" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <div className="order-5 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Rocket className="h-4 w-4 text-emerald-600" />
            {copy.roadmapTitle}
          </h3>
          <ol className="space-y-3">
            {roadmap.map((item) => (
              <li key={item.week} className="flex items-start gap-3 rounded-2xl border border-gray-100 p-3">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="text-xs font-semibold text-gray-500">{item.week}</p>
                  <p className="text-sm text-gray-700">{item.work}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CheckCircle2 className="h-4 w-4 text-orange-500" />
            {copy.kpisTitle}
          </h3>
          <ul className="space-y-3">
            {kpis.map((kpi) => (
              <li key={kpi} className="rounded-2xl border border-orange-100 bg-orange-50/70 p-3 text-sm text-orange-900">
                {kpi}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="order-2 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Sparkles className="h-5 w-5 text-violet-600" />
              {copy.playgroundTitle}
            </h3>
            <p className="text-sm text-gray-600">{copy.playgroundSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
              <button
                type="button"
                onClick={() => onChangeMode('mock')}
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                  betaMode === 'mock' ? 'bg-gray-900 text-white' : 'text-gray-600'
                }`}
              >
                {copy.modeMock}
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('live')}
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                  betaMode === 'live' ? 'bg-gray-900 text-white' : 'text-gray-600'
                }`}
              >
                {copy.modeLive}
              </button>
            </div>
            <button
              type="button"
              onClick={resetDemo}
              disabled={syncing}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              {copy.resetDemo}
            </button>
          </div>
        </div>
        {betaMode === 'live' && (
          <div className="mb-4 space-y-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
            <p className="text-xs text-amber-700">{copy.liveAuthHint}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-amber-900">
                <span className="font-semibold">{copy.liveAuthTitle}: </span>
                {liveUserId ? `${copy.liveAuthSignedInAs} (${liveUserId.slice(0, 8)}...)` : copy.liveAuthSignedOut}
              </div>
              <div
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  livePersistence === 'supabase'
                    ? 'bg-emerald-100 text-emerald-700'
                    : livePersistence === 'fallback'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {livePersistence === 'supabase'
                  ? copy.livePersistenceSupabase
                  : livePersistence === 'fallback'
                    ? copy.livePersistenceFallback
                    : copy.livePersistenceUnknown}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={workspaceKeyInput}
                onChange={(e) => setWorkspaceKeyInput(e.target.value)}
                placeholder={copy.workspaceKeyPlaceholder}
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 sm:max-w-[180px]"
              />
              <button
                type="button"
                onClick={saveWorkspaceKey}
                className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                {copy.workspaceKeySave}
              </button>
              <input
                value={liveEmail}
                onChange={(e) => setLiveEmail(e.target.value)}
                placeholder={copy.liveAuthEmailPlaceholder}
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                {copy.liveAuthSendOtp}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                {copy.liveAuthSignOut}
              </button>
            </div>
            <p className="text-[11px] text-amber-800">
              <span className="font-semibold">{copy.workspaceKeyLabel}:</span> {readPreferredBetaWorkspaceKey()}
            </p>
            <p className="text-[11px] text-amber-800">
              <span className="font-semibold">{copy.livePersistenceReasonTitle}:</span> {liveReasonLabel}
            </p>
            {liveReasonMessage && (
              <p className="text-[11px] text-amber-800">
                <span className="font-semibold">{copy.liveErrorMessageLabel}:</span> {liveReasonMessage}
              </p>
            )}
            <p className="text-[11px] text-amber-800">
              <span className="font-semibold">{copy.liveGuideTitle}:</span> {liveGuide}
            </p>
            <div className="space-y-2 rounded-xl border border-amber-200 bg-white/70 p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-amber-900">{copy.diagnosticsTitle}</p>
                <button
                  type="button"
                  onClick={runDiagnosticsNow}
                  disabled={syncing}
                  className="rounded-lg border border-amber-300 px-2 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
                >
                  {copy.runDiagnostics}
                </button>
              </div>
              {diagnosticsRanAt && (
                <p className="text-[10px] text-amber-700">
                  {copy.diagnosticsRanAt}: {new Date(diagnosticsRanAt).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')}
                </p>
              )}
              {diagnostics.length > 0 && (
                <ul className="space-y-1">
                  {diagnostics.map((item) => {
                    const label =
                      item.key === 'env'
                        ? copy.diagEnv
                        : item.key === 'auth'
                          ? copy.diagAuth
                          : item.key === 'read'
                            ? copy.diagRead
                            : copy.diagWrite;
                    return (
                      <li key={item.key} className="space-y-1 rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-[11px]">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-amber-900">
                            {label}: {item.ok ? 'OK' : 'Fail'}
                          </span>
                          <span className="text-amber-800">{item.detail}</span>
                        </div>
                        {!item.ok && (
                          <div className="flex flex-wrap gap-1">
                            {item.key === 'auth' && (
                              <button
                                type="button"
                                onClick={handleSendOtp}
                                className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
                              >
                                {copy.diagActionSendOtp}
                              </button>
                            )}
                            {(item.key === 'read' || item.key === 'write') && (
                              <button
                                type="button"
                                onClick={saveWorkspaceKey}
                                className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
                              >
                                {copy.diagActionSaveWorkspace}
                              </button>
                            )}
                            {item.key === 'env' && (
                              <button
                                type="button"
                                onClick={openSqlGuide}
                                className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
                              >
                                {copy.diagActionOpenSqlGuide}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={runDiagnosticsNow}
                              className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
                            >
                              {copy.diagActionRetry}
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {liveAuthNotice && <p className="text-xs text-amber-800">{liveAuthNotice}</p>}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          <article className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Send className="h-4 w-4 text-sky-600" />
              {copy.outreachTitle}
            </h4>
            <div className="mb-3 flex items-center gap-2">
              <select
                value={targetPlatform}
                onChange={(e) => setTargetPlatform(e.target.value as OutreachPlatform)}
                className="shrink-0 rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-sky-400"
                aria-label={copy.platformLabel}
              >
                <option value="youtube">{copy.platformYoutube}</option>
                <option value="instagram">{copy.platformInstagram}</option>
                <option value="tiktok">{copy.platformTiktok}</option>
              </select>
              <input
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder={copy.targetHandlePlaceholder}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={addTarget}
                disabled={syncing}
                className="shrink-0 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700"
              >
                {copy.addTarget}
              </button>
              <button
                type="button"
                onClick={runAutomationPass}
                disabled={syncing}
                className="shrink-0 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50"
              >
                {copy.runAutomationPass}
              </button>
            </div>
            <p className="mb-2 text-[11px] text-gray-500">
              {copy.autoTickStatus}: 20s interval · {copy.autoTickLastRun}:{' '}
              {autoTickLastRunAt
                ? new Date(autoTickLastRunAt).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')
                : '—'}
            </p>
            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-gray-200 bg-white p-2">
                <p className="text-gray-500">{locale === 'ko' ? '발송 대상' : 'Targets'}</p>
                <p className="text-sm font-semibold text-gray-900">{outreachKpi.total}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-2">
                <p className="text-gray-500">{locale === 'ko' ? '응답률' : 'Reply rate'}</p>
                <p className="text-sm font-semibold text-gray-900">{outreachKpi.replyRate}%</p>
              </div>
            </div>
            <ul className="space-y-2">
              {outreachTargets.map((target) => (
                <li key={target.id} className="rounded-xl border border-gray-200 bg-white p-2">
                  {(() => {
                    const parsed = extractPlatformFromTargetName(locale, target.name);
                    return (
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {parsed.platform && parsed.platformLabel && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PLATFORM_BADGE_STYLE[parsed.platform]}`}
                            >
                              {parsed.platformLabel}
                            </span>
                          )}
                          <p className="text-xs font-semibold text-gray-900">{parsed.handle}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${OUTREACH_STATUS_BADGE[target.status]}`}
                        >
                          {OUTREACH_STATUS_LABEL[locale][target.status]}
                        </span>
                      </div>
                    );
                  })()}
                  <p className="mb-2 text-[11px] text-gray-500">
                    {locale === 'ko' ? `현재 단계: Day ${target.currentStep}` : `Current step: Day ${target.currentStep}`}
                  </p>
                  <p className="mb-2 text-[11px] text-gray-500">
                    {copy.nextRunAtLabel}:{' '}
                    {target.nextRunAt
                      ? new Date(target.nextRunAt).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')
                      : '—'}
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => advanceOutreach(target.id)}
                      disabled={syncing}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      {locale === 'ko' ? '다음 단계' : 'Next step'}
                    </button>
                    <button
                      type="button"
                      onClick={() => markReplied(target.id)}
                      disabled={syncing}
                      className="rounded-lg border border-emerald-200 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      {locale === 'ko' ? '응답 수신' : 'Reply'}
                    </button>
                    <button
                      type="button"
                      onClick={() => ingestReplyWebhook(target.id)}
                      disabled={syncing}
                      className="rounded-lg border border-indigo-200 px-2 py-1 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      {copy.ingestReplyWebhook}
                    </button>
                    <button
                      type="button"
                      onClick={() => stopSequence(target.id)}
                      disabled={syncing}
                      className="rounded-lg border border-amber-200 px-2 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-50"
                    >
                      {locale === 'ko' ? '중단' : 'Stop'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MessageSquareReply className="h-4 w-4 text-violet-600" />
              {copy.intentTitle}
            </h4>
            <textarea
              value={replyInput}
              onChange={(e) => onChangeReply(e.target.value)}
              className="h-24 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:border-violet-400"
            />
            <button
              type="button"
              onClick={runIntentClassifier}
              disabled={syncing}
              className="mt-2 w-full rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
            >
              {copy.runClassifier}
            </button>
            {intentResult && (
              <div className="mt-3 space-y-2 rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-violet-900">{INTENT_LABEL_LABEL[locale][intentResult.label]}</span>
                  <span className="text-violet-700">{Math.round(intentResult.confidence * 100)}%</span>
                </div>
                <p className="text-violet-800">{intentResult.nextAction}</p>
                <div className="rounded-lg border border-violet-200 bg-white p-2 text-violet-900">
                  <p className="mb-1 font-semibold">{copy.planDraftPrefix}</p>
                  <p>{intentResult.draft}</p>
                </div>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Target className="h-4 w-4 text-emerald-600" />
              {copy.publishTitle}
            </h4>
            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-gray-200 bg-white p-2">
                <p className="text-gray-500">{locale === 'ko' ? '정시 게시율' : 'On-time rate'}</p>
                <p className="text-sm font-semibold text-gray-900">{publishKpi.onTimeRate}%</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-2">
                <p className="text-gray-500">{locale === 'ko' ? '미게시 건수' : 'Missed'}</p>
                <p className="text-sm font-semibold text-gray-900">{publishKpi.missed}</p>
              </div>
            </div>
            <ul className="space-y-2">
              {commitments.map((item) => (
                <li key={item.id} className="rounded-xl border border-gray-200 bg-white p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-900">{item.creator}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PUBLISH_STATUS_BADGE[item.status]}`}>
                      {PUBLISH_STATUS_LABEL[locale][item.status]}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">{item.due}</p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    24h Views: {item.views24h > 0 ? item.views24h.toLocaleString() : '—'}
                  </p>
                  <div className="mt-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => markPublished(item.id)}
                      disabled={syncing}
                      className="rounded-lg border border-emerald-200 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      {copy.markPublished}
                    </button>
                    <button
                      type="button"
                      onClick={() => markLate(item.id)}
                      disabled={syncing}
                      className="rounded-lg border border-amber-200 px-2 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-50"
                    >
                      {locale === 'ko' ? '지연 처리' : 'Mark late'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </div>
        <p className="mt-4 flex items-center gap-1 text-[11px] text-gray-500">
          <ChevronRight className="h-3 w-3" />
          {locale === 'ko'
            ? '다음 단계: 실제 API/DB 연결 시 현재 시뮬레이션 액션을 서비스 레이어 이벤트로 교체합니다.'
            : 'Next step: replace these simulation actions with real service-layer events backed by API/DB.'}
        </p>
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-700">{copy.outreachEventsTitle}</p>
            <button
              type="button"
              onClick={exportEventsCsv}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-[10px] font-semibold text-gray-700 hover:bg-gray-100"
            >
              {copy.outreachEventsExportCsv}
            </button>
          </div>
          <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-[11px] text-gray-600">
              <span className="mb-1 block font-semibold">{copy.outreachEventsFilterType}</span>
              <select
                value={eventTypeFilter}
                onChange={(e) =>
                  setEventTypeFilter(
                    e.target.value as 'all' | 'auto_step' | 'auto_stop' | 'reply_webhook' | 'manual_action',
                  )
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px]"
              >
                <option value="all">{copy.outreachEventsAllTypes}</option>
                <option value="auto_step">auto_step</option>
                <option value="auto_stop">auto_stop</option>
                <option value="reply_webhook">reply_webhook</option>
                <option value="manual_action">manual_action</option>
              </select>
            </label>
            <label className="text-[11px] text-gray-600">
              <span className="mb-1 block font-semibold">{copy.outreachEventsFilterTarget}</span>
              <select
                value={eventTargetFilter}
                onChange={(e) => setEventTargetFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px]"
              >
                {eventTargets.map((target) => (
                  <option key={target} value={target}>
                    {target === 'all' ? copy.outreachEventsAllTargets : target}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mb-2 block text-[11px] text-gray-600">
            <span className="mb-1 block font-semibold">{copy.outreachEventsSearch}</span>
            <input
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px]"
            />
          </label>
          {outreachEvents.length === 0 ? (
            <p className="text-[11px] text-gray-500">—</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-auto">
              {filteredEvents.map((evt) => (
                <li key={evt.id} className="rounded-lg border border-gray-200 bg-white p-2 text-[11px] text-gray-700">
                  {(() => {
                    const parsed = extractPlatformFromTargetName(locale, evt.targetName);
                    return (
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {parsed.platform && parsed.platformLabel && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PLATFORM_BADGE_STYLE[parsed.platform]}`}
                            >
                              {parsed.platformLabel}
                            </span>
                          )}
                          <p className="font-semibold">{parsed.handle}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            evt.code === 'OUTREACH_AUTO_STEP'
                              ? 'bg-blue-100 text-blue-700'
                              : evt.code === 'OUTREACH_AUTO_STOP'
                                ? 'bg-amber-100 text-amber-700'
                                : evt.code === 'OUTREACH_REPLY_WEBHOOK'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-violet-100 text-violet-700'
                          }`}
                        >
                          {evt.code}
                        </span>
                      </div>
                    );
                  })()}
                  <p>{evt.message}</p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(evt.at).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {sqlGuideOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h4 className="text-sm font-semibold text-gray-900">{BETA_SQL_GUIDE_SUMMARY[locale].title}</h4>
              <button
                type="button"
                onClick={() => setSqlGuideOpen(false)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label={copy.sqlGuideClose}
              >
                <CircleX className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <ul className="list-disc space-y-1 pl-5 text-xs text-gray-700">
                {BETA_SQL_GUIDE_SUMMARY[locale].bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <pre className="max-h-64 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3 text-[11px] text-gray-800">
                <code>{BETA_SQL_GUIDE_SNIPPET}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
