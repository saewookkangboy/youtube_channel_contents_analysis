/**
 * 개발 전용: 멀티역할 오케스트레이션 힌트(선택).
 * 기본은 빈 문자열 — 필요 시 여기서 접미 프롬프트만 채우면 됨.
 */
export function getCompactOrchestrationPromptSuffix(
  _locale: 'ko' | 'en',
  _kind: 'channel' | 'video',
): string {
  return '';
}
