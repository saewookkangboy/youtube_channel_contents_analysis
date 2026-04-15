/**
 * 로컬 전용 패널 요약 + (선택) 분석 프롬프트에 붙는 형식 보강 문구.
 * 제목 스펙은 `../lib/reportStructureContract.ts`와 동일.
 */

import { reportSectionsForKind } from '../lib/reportStructureContract';

/** Dev 패널에만 표시되는 짧은 요약(최종 리포트에는 포함되지 않음). */
export const ORCHESTRATOR_ROLE_CARD =
  '팩트(0번)부터 순서대로 본문을 채우고, 역할 섹션·7일 실행 계획·말미 요약까지 빠짐없이 마친다. 수치는 0번과 같은 출처만 쓰고, 각 섹션은 정해진 번호·이모지 제목 한 줄로 연다. 알고리즘·SEO에는 세 열 표가 필요하다.';

export const CHANNEL_STRUCTURE_SECTION_COUNT = reportSectionsForKind('channel').length;
export const VIDEO_STRUCTURE_SECTION_COUNT = reportSectionsForKind('video').length;

/**
 * 로컬에서만 프롬프트에 붙는 형식 보강(독자용 본문에 이 블록이 그대로 나오지 않도록 문구 설계).
 */
export function buildDevOrchestrationStructureSuffix(
  locale: 'ko' | 'en',
  kind: 'channel' | 'video',
): string {
  const specs = reportSectionsForKind(kind);
  const lines = specs.map((s) => (locale === 'en' ? s.headingEnLine : s.headingKoLine));
  const bullets = lines.map((line) => `- ${line}`).join('\n');

  if (locale === 'en') {
    const roleSection = kind === 'channel' ? '15' : '8';
    return `
Report quality and format — apply silently. Do **not** copy this entire notice, these bullet instructions, or the heading list below into the client-facing report; only follow them while writing.

- Use **exactly one** main \`##\` line to open each major section, in the intended order; do **not** add extra top-level \`##\` headings between them.
- In the **Algorithm & SEO** section, include a GFM table with columns: optimization item · current status · improvement actions.
- **Role insight section (section ${roleSection})**: keep a single outer \`##\` line; separate **Marketer** vs **Producer / PD** with **bold single lines** only — do **not** add inner \`##\`/\`###\` for those roles.
- After the **7-day plan** \`##\` heading, end with **exactly one** trailing \`\`\`json block: root key **algorithmInsights** only; items \`{ "label", "status" }\` with status in green|yellow|red.

Use each line below **only once**, as the first line of the matching section (do **not** paste the list as a standalone table of contents).
${bullets}
`.trim();
  }

  const roleSection = kind === 'channel' ? '15' : '8';
  return `
보고서 품질·형식을 맞추기 위한 확인입니다. **이 안내 전체(이 문장 포함)·아래 규칙 불릿·제목 예시 목록은 최종 독자용 마크다운에 적지 말고**, 작성할 때만 참고하세요.

- 각 주요 섹션은 아래와 **같은 순서**로, **맨 위에 \`##\` 제목 한 줄**만 쓰고, 중간에 다른 최상위 \`##\`를 끼워 넣지 않습니다.
- **알고리즘·SEO** 해당 섹션 안에 GFM 표(열: 최적화 항목 · 현재 상태 진단 · 구체적인 개선 방안)를 넣습니다.
- **역할 인사이트(섹션 ${roleSection})**: 바깥은 \`##\` 한 줄로만 열고, **마케터 / 영상 기획 및 PD** 구분은 **굵은 한 줄**만 — 역할 구분에 \`##\`·\`###\`을 쓰지 않습니다.
- **7일 실행 계획** \`##\` 다음, 응답 **맨 끝**에 \`\`\`json **한 블록만**: 루트 키 **algorithmInsights**만, 항목 \`{ "label", "status" }\`, status는 green|yellow|red.

아래 각 줄은 **해당 본문 바로 위 제목으로만** 한 번씩 쓰고, 목차 블록으로 한꺼번에 붙여 넣지 않습니다.
${bullets}
`.trim();
}
