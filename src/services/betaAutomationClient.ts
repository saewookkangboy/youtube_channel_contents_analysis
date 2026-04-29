export type AppLocale = 'ko' | 'en';

export type BetaMode = 'mock' | 'live';

export type OutreachStatus = 'queued' | 'sent' | 'replied' | 'stopped';
export const OUTREACH_STATUS_VALUES = ['queued', 'sent', 'replied', 'stopped'] as const;

export type OutreachTarget = {
  id: string;
  name: string;
  status: OutreachStatus;
  currentStep: number;
  nextRunAt: string | null;
};

export type IntentLabel = 'interested' | 'pricing' | 'defer' | 'decline' | 'other';
export const INTENT_LABEL_VALUES = ['interested', 'pricing', 'defer', 'decline', 'other'] as const;

export type IntentPrediction = {
  label: IntentLabel;
  confidence: number;
  nextAction: string;
  draft: string;
};

export type PublishStatus = 'scheduled' | 'on_time' | 'late' | 'missed';
export const PUBLISH_STATUS_VALUES = ['scheduled', 'on_time', 'late', 'missed'] as const;

export type PublishCommitment = {
  id: string;
  creator: string;
  due: string;
  status: PublishStatus;
  views24h: number;
};

export type OutreachEventType = 'auto_step' | 'auto_stop' | 'reply_webhook' | 'manual_action';
export const OUTREACH_EVENT_TYPE_VALUES = ['auto_step', 'auto_stop', 'reply_webhook', 'manual_action'] as const;

export type OutreachEventCode =
  | 'OUTREACH_AUTO_STEP'
  | 'OUTREACH_AUTO_STOP'
  | 'OUTREACH_REPLY_WEBHOOK'
  | 'OUTREACH_MANUAL_ACTION';
export const OUTREACH_EVENT_CODE_VALUES = [
  'OUTREACH_AUTO_STEP',
  'OUTREACH_AUTO_STOP',
  'OUTREACH_REPLY_WEBHOOK',
  'OUTREACH_MANUAL_ACTION',
] as const;

export type OutreachEvent = {
  id: string;
  targetId: string;
  targetName: string;
  type: OutreachEventType;
  code: OutreachEventCode;
  message: string;
  at: string;
};

export type BetaAutomationState = {
  outreachTargets: OutreachTarget[];
  outreachEvents: OutreachEvent[];
  replyInput: string;
  intentResult: IntentPrediction | null;
  commitments: PublishCommitment[];
};

export type BetaAutomationClient = {
  load(locale: AppLocale): Promise<BetaAutomationState>;
  reset(locale: AppLocale): Promise<BetaAutomationState>;
  runOutreachAutomationPass(locale: AppLocale): Promise<BetaAutomationState>;
  ingestOutreachReplyEvent(locale: AppLocale, targetId: string): Promise<BetaAutomationState>;
  addOutreachTarget(locale: AppLocale, name: string): Promise<BetaAutomationState>;
  moveOutreachToNextStep(locale: AppLocale, targetId: string): Promise<BetaAutomationState>;
  markOutreachReplied(locale: AppLocale, targetId: string): Promise<BetaAutomationState>;
  stopOutreachSequence(locale: AppLocale, targetId: string): Promise<BetaAutomationState>;
  setReplyInput(locale: AppLocale, reply: string): Promise<BetaAutomationState>;
  runIntentClassification(locale: AppLocale): Promise<BetaAutomationState>;
  markPublishOnTime(locale: AppLocale, commitmentId: string): Promise<BetaAutomationState>;
  markPublishLate(locale: AppLocale, commitmentId: string): Promise<BetaAutomationState>;
};
