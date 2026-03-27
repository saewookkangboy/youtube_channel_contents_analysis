export interface ReportCompleteness {
  ok: boolean;
  missingLabels: string[];
  algorithmSeoTableMissing: boolean;
  algorithmSeoChecklistColumnsIncomplete: boolean;
  algorithmSeoChecklistColumnGaps: string[];
}

const CHANNEL_SECTIONS: { label: string; keys: string[] }[] = [
  { label: '0. 🔍 팩트 체크 및 로우 데이터', keys: ['팩트 체크', 'fact check', 'raw data'] },
  { label: '1. 📊 채널 데이터 및 현황 분석', keys: ['채널 데이터', '현황 분석'] },
  { label: '2. 🚀 콘텐츠 성과 분석', keys: ['콘텐츠 성과'] },
  { label: '3. 💰 다각화된 수익화 전략', keys: ['수익화'] },
  { label: '4. 📈 구독자 증가를 위한 전략', keys: ['구독자 증가'] },
  { label: '5. 🕒 초기 24시간 성과 진단', keys: ['24시간', '초기 24'] },
  { label: '6. 🎯 만족도 중심 진단 카드', keys: ['만족도', '진단 카드'] },
  { label: '7. 🤖 유튜브 알고리즘 및 SEO 최적화', keys: ['알고리즘', 'seo'] },
  { label: '8. ✍️ 영상 제목 효율성 및 개선 제안', keys: ['영상 제목 효율성', '제목 효율성'] },
  { label: '9. 🤝 시청자 참여 및 커뮤니티 전략', keys: ['시청자 참여', '커뮤니티'] },
  { label: '10. ⏰ 최적의 업로드 시간 및 요일 제안', keys: ['업로드 시간', '요일'] },
  { label: '11. 💡 신규 콘텐츠 시리즈 아이디어', keys: ['시리즈 아이디어', '콘텐츠 시리즈'] },
  { label: '12. 🎥 영상 및 오디오 품질 개선 제안', keys: ['오디오 품질', '영상 및 오디오'] },
  { label: '13. 👀 타겟 시청자 교차 시청 채널 분석', keys: ['교차 시청', '크로스'] },
  { label: '14. 📱 유튜브 쇼츠', keys: ['쇼츠', 'shorts'] },
  { label: '## ✅ 우선 실행 액션 플랜 (7일)', keys: ['우선 실행', '액션 플랜', '7일'] },
];

const VIDEO_SECTIONS: { label: string; keys: string[] }[] = [
  { label: '0. 🔍 팩트 체크 및 로우 데이터', keys: ['팩트 체크', 'fact check', 'raw data'] },
  { label: '1. 📊 영상 상세 분석', keys: ['영상 상세'] },
  { label: '2. 📝 제목 및 설명란 추천', keys: ['제목 및 설명란', 'title & description'] },
  { label: '3. ✨ Nano Banana Pro 프롬프트', keys: ['nano banana', 'banana pro'] },
  { label: '4. 🕒 초기 24시간 성과 진단', keys: ['24시간', '초기 24'] },
  { label: '5. 🎯 만족도 중심 진단 카드', keys: ['만족도', '진단 카드'] },
  { label: '6. 🤖 알고리즘 및 SEO 최적화', keys: ['알고리즘', 'seo'] },
  { label: '7. 📱 쇼츠 콘텐츠 전략', keys: ['쇼츠', 'shorts'] },
  { label: '## ✅ 우선 실행 액션 플랜 (7일)', keys: ['우선 실행', '액션 플랜', '7일'] },
];

function isTableSeparatorLine(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith('|') || !t.endsWith('|')) return false;
  const cells = t.split('|').slice(1, -1).map((c) => c.trim());
  return cells.length >= 2 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function hasGfmTable(md: string): boolean {
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    const row = lines[i];
    const sep = lines[i + 1];
    if (/^\s*\|.*\|\s*$/.test(row) && isTableSeparatorLine(sep)) {
      return true;
    }
  }
  return false;
}

function extractMarkdownHeadings(markdown: string): string[] {
  const headings: string[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const m = line.match(/^#{1,6}\s+(.+)$/);
    if (m) headings.push(m[1].trim().replace(/\*\*/g, ''));
  }
  return headings;
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function headingMatchesKeys(headings: string[], keys: string[]): boolean {
  const flat = headings.map(normalizeForMatch).join(' | ');
  return keys.some((k) => flat.includes(normalizeForMatch(k)));
}

function hasAlgorithmSeoHeading(headings: string[]): boolean {
  return headings.some((h) => {
    const n = normalizeForMatch(h);
    return n.includes('알고리즘') && n.includes('seo');
  });
}

function sliceAfterAlgorithmSection(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const hm = lines[i].match(/^#{1,6}\s+(.+)$/);
    if (!hm) continue;
    const title = normalizeForMatch(hm[1]);
    if (title.includes('알고리즘') && title.includes('seo')) {
      start = i;
      break;
    }
  }
  if (start < 0) return markdown;
  return lines.slice(start).join('\n');
}

function firstMarkdownTableHeaderRow(sectionMd: string): string | null {
  const lines = sectionMd.split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (!/^\s*\|.*\|\s*$/.test(line)) continue;
    const next = lines[i + 1];
    if (next && isTableSeparatorLine(next)) {
      return line;
    }
  }
  return null;
}

const CHECKLIST_COLUMNS: { gapLabel: string; keys: string[] }[] = [
  { gapLabel: '최적화 항목 열', keys: ['최적화 항목', 'optimization item'] },
  { gapLabel: '현재 상태 진단 열', keys: ['현재 상태', 'current status'] },
  { gapLabel: '구체적인 개선 방안 열', keys: ['개선 방안', 'improvement'] },
];

function analyzeChecklistColumns(sectionMd: string): string[] {
  const header = firstMarkdownTableHeaderRow(sectionMd);
  if (!header) return CHECKLIST_COLUMNS.map((c) => c.gapLabel);
  const h = normalizeForMatch(header);
  const gaps: string[] = [];
  for (const col of CHECKLIST_COLUMNS) {
    if (!col.keys.some((k) => h.includes(normalizeForMatch(k)))) {
      gaps.push(col.gapLabel);
    }
  }
  return gaps;
}

export function analyzeReportCompleteness(
  reportType: 'channel' | 'video',
  markdown: string,
): ReportCompleteness {
  const headings = extractMarkdownHeadings(markdown);
  const template = reportType === 'channel' ? CHANNEL_SECTIONS : VIDEO_SECTIONS;

  const missingLabels: string[] = [];
  for (const sec of template) {
    if (!headingMatchesKeys(headings, sec.keys)) {
      missingLabels.push(sec.label);
    }
  }

  const algoHeading = hasAlgorithmSeoHeading(headings);
  const afterAlgo = sliceAfterAlgorithmSection(markdown);
  const tableInAlgoSection = hasGfmTable(afterAlgo);

  const algorithmSeoTableMissing = algoHeading && !tableInAlgoSection;

  let algorithmSeoChecklistColumnGaps: string[] = [];
  if (algoHeading && !algorithmSeoTableMissing) {
    algorithmSeoChecklistColumnGaps = analyzeChecklistColumns(afterAlgo);
  }

  const algorithmSeoChecklistColumnsIncomplete = algorithmSeoChecklistColumnGaps.length > 0;

  return {
    ok: missingLabels.length === 0,
    missingLabels,
    algorithmSeoTableMissing,
    algorithmSeoChecklistColumnsIncomplete,
    algorithmSeoChecklistColumnGaps,
  };
}

export interface ReportCompletenessAppendixOptions {
  algorithmSeoTableMissing: boolean;
  algorithmSeoChecklistColumnsIncomplete: boolean;
  algorithmSeoChecklistColumnGaps: string[];
}

export function buildReportCompletenessAppendix(
  missingLabels: string[],
  opts: ReportCompletenessAppendixOptions,
): string {
  const parts: string[] = [];
  if (missingLabels.length > 0) {
    parts.push('\n\n---\n\n### 자동 검증 부록 (템플릿 헤딩 누락)\n');
    parts.push('다음 섹션 제목이 보고서에서 찾기 어렵습니다:\n');
    for (const l of missingLabels) {
      parts.push(`- ${l}\n`);
    }
  }
  if (opts.algorithmSeoTableMissing) {
    parts.push('\n- [검증] 알고리즘/SEO 구간에 Markdown 표(헤더 + `|---|` 구분 행)가 감지되지 않았습니다.\n');
  }
  if (opts.algorithmSeoChecklistColumnsIncomplete && opts.algorithmSeoChecklistColumnGaps.length > 0) {
    parts.push('\n- [검증] 체크리스트 표 헤더 불완전:\n');
    for (const g of opts.algorithmSeoChecklistColumnGaps) {
      parts.push(`  - ${g}\n`);
    }
  }
  return parts.join('');
}
