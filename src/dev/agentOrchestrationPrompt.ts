/**
 * 로컬 전용: 분석 프롬프트에 덧붙는 형식 보강(선택).
 * 활성화 조건은 geminiService `loadDevOrchestrationPromptSuffix`와 동일.
 */

import { buildDevOrchestrationStructureSuffix } from './agentOrchestrationRoles';

export function getCompactOrchestrationPromptSuffix(
  locale: 'ko' | 'en',
  kind: 'channel' | 'video',
): string {
  return buildDevOrchestrationStructureSuffix(locale, kind);
}
