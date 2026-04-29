import type {
  BetaAutomationClient,
  BetaMode,
} from './betaAutomationClient';
import {
  betaAutomationLiveClient,
  persistPreferredBetaWorkspaceKey,
  readPreferredBetaWorkspaceKey,
} from './betaAutomationLiveClient';
import { betaAutomationMockClient } from './betaAutomationMockClient';

export type {
  AppLocale,
  BetaAutomationClient,
  BetaAutomationState,
  BetaMode,
  IntentLabel,
  IntentPrediction,
  OutreachStatus,
  OutreachTarget,
  PublishCommitment,
  PublishStatus,
} from './betaAutomationClient';

const MODE_STORAGE_KEY = 'beta-automation-mode-v1';

export function readPreferredBetaMode(): BetaMode {
  if (typeof window === 'undefined') return 'mock';
  const raw = window.localStorage.getItem(MODE_STORAGE_KEY);
  return raw === 'live' ? 'live' : 'mock';
}

export function persistPreferredBetaMode(mode: BetaMode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MODE_STORAGE_KEY, mode);
}

export function createBetaAutomationClient(mode: BetaMode): BetaAutomationClient {
  switch (mode) {
    case 'mock':
      return betaAutomationMockClient;
    case 'live':
      return betaAutomationLiveClient;
    default: {
      const _never: never = mode;
      return _never;
    }
  }
}

export {
  persistPreferredBetaWorkspaceKey,
  readPreferredBetaWorkspaceKey,
};
