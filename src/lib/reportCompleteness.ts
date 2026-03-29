import type { AppLocale } from '../i18n/types';
import { translate, type TranslationKey } from '../i18n/translations';

export type ChecklistGapId = 'optimization_item' | 'current_status' | 'improvement_actions';

export const CHECKLIST_GAP_TRANSLATION_KEY: Record<ChecklistGapId, TranslationKey> = {
  optimization_item: 'completenessGapOptimization',
  current_status: 'completenessGapStatus',
  improvement_actions: 'completenessGapActions',
};

export interface ReportCompleteness {
  ok: boolean;
  missingLabels: string[];
  algorithmSeoTableMissing: boolean;
  algorithmSeoChecklistColumnsIncomplete: boolean;
  algorithmSeoChecklistColumnGaps: ChecklistGapId[];
}

interface SectionDef {
  labelKo: string;
  labelEn: string;
  keys: string[];
}

const CHANNEL_SECTIONS: SectionDef[] = [
  {
    labelKo: '0. 🔍 팩트 체크 및 로우 데이터',
    labelEn: '0. 🔍 Fact check & raw data',
    keys: ['팩트 체크', 'fact check', 'raw data', 'fact check &'],
  },
  {
    labelKo: '1. 📊 채널 데이터 및 현황 분석',
    labelEn: '1. 📊 Channel data & status',
    keys: ['채널 데이터', '현황 분석', 'channel data', 'channel analysis', 'data analysis'],
  },
  {
    labelKo: '2. 🚀 콘텐츠 성과 분석',
    labelEn: '2. 🚀 Content performance',
    keys: ['콘텐츠 성과', 'content performance', 'performance analysis'],
  },
  {
    labelKo: '3. 💰 다각화된 수익화 전략',
    labelEn: '3. 💰 Monetization strategy',
    keys: ['수익화', 'monetization'],
  },
  {
    labelKo: '4. 📈 구독자 증가를 위한 전략',
    labelEn: '4. 📈 Subscriber growth',
    keys: ['구독자 증가', 'subscriber growth', 'subscriber'],
  },
  {
    labelKo: '5. 🕒 초기 24시간 성과 진단',
    labelEn: '5. 🕒 First 24h performance',
    keys: ['24시간', '초기 24', 'first 24', '24h', '24-hour'],
  },
  {
    labelKo: '6. 🎯 만족도 중심 진단 카드',
    labelEn: '6. 🎯 Satisfaction diagnostic card',
    keys: ['만족도', '진단 카드', 'satisfaction', 'diagnostic card'],
  },
  {
    labelKo: '7. 🤖 유튜브 알고리즘 및 SEO 최적화',
    labelEn: '7. 🤖 Algorithm & SEO optimization',
    keys: ['알고리즘', 'seo', 'algorithm'],
  },
  {
    labelKo: '8. ✍️ 영상 제목 효율성 및 개선 제안',
    labelEn: '8. ✍️ Title effectiveness & suggestions',
    keys: ['영상 제목 효율성', '제목 효율성', 'title effectiveness', 'video title'],
  },
  {
    labelKo: '9. 🤝 시청자 참여 및 커뮤니티 전략',
    labelEn: '9. 🤝 Engagement & community',
    keys: ['시청자 참여', '커뮤니티', 'engagement', 'community'],
  },
  {
    labelKo: '10. ⏰ 최적의 업로드 시간 및 요일 제안',
    labelEn: '10. ⏰ Upload schedule & timing',
    keys: ['업로드 시간', '요일', 'upload schedule', 'publishing', 'optimal time'],
  },
  {
    labelKo: '11. 💡 신규 콘텐츠 시리즈 아이디어',
    labelEn: '11. 💡 New content series ideas',
    keys: ['시리즈 아이디어', '콘텐츠 시리즈', 'series ideas', 'content series'],
  },
  {
    labelKo: '12. 🎥 영상 및 오디오 품질 개선 제안',
    labelEn: '12. 🎥 Video & audio quality',
    keys: ['오디오 품질', '영상 및 오디오', 'audio quality', 'video quality'],
  },
  {
    labelKo: '13. 👀 타겟 시청자 교차 시청 채널 분석',
    labelEn: '13. 👀 Cross-viewership & audience overlap',
    keys: ['교차 시청', '크로스', 'cross-viewership', 'cross viewership', 'audience overlap'],
  },
  {
    labelKo: '14. 📱 유튜브 쇼츠',
    labelEn: '14. 📱 YouTube Shorts',
    keys: ['쇼츠', 'shorts'],
  },
  {
    labelKo: '15. 📣 채널 분석 — 마케터·PD 심층 인사이트',
    labelEn: '15. 📣 Role-based channel analysis (Marketer & PD)',
    keys: ['마케터·pd', '역할별', 'role-based channel', 'producer / pd', 'marketer'],
  },
  {
    labelKo: '## ✅ 우선 실행 액션 플랜 (7일)',
    labelEn: '## ✅ Priority 7-day action plan',
    keys: ['우선 실행', '액션 플랜', '7일차', '7일', 'action plan', '7-day', '7 day'],
  },
];

const VIDEO_SECTIONS: SectionDef[] = [
  {
    labelKo: '0. 🔍 팩트 체크 및 로우 데이터',
    labelEn: '0. 🔍 Fact check & raw data',
    keys: ['팩트 체크', 'fact check', 'raw data', 'fact check &'],
  },
  {
    labelKo: '1. 📊 영상 상세 분석',
    labelEn: '1. 📊 Detailed video analysis',
    keys: ['영상 상세', 'detailed video', 'video analysis'],
  },
  {
    labelKo: '2. 📝 제목 및 설명란 추천',
    labelEn: '2. 📝 Title & description',
    keys: ['제목 및 설명란', 'title & description', 'title and description'],
  },
  {
    labelKo: '3. ✨ Nano Banana Pro 프롬프트',
    labelEn: '3. ✨ Nano Banana Pro prompts',
    keys: ['nano banana', 'banana pro'],
  },
  {
    labelKo: '4. 🕒 초기 24시간 성과 진단',
    labelEn: '4. 🕒 First 24h performance',
    keys: ['24시간', '초기 24', 'first 24', '24h'],
  },
  {
    labelKo: '5. 🎯 만족도 중심 진단 카드',
    labelEn: '5. 🎯 Satisfaction diagnostic card',
    keys: ['만족도', '진단 카드', 'satisfaction', 'diagnostic card'],
  },
  {
    labelKo: '6. 🤖 알고리즘 및 SEO 최적화',
    labelEn: '6. 🤖 Algorithm & SEO optimization',
    keys: ['알고리즘', 'seo', 'algorithm'],
  },
  {
    labelKo: '7. 📱 쇼츠 콘텐츠 전략',
    labelEn: '7. 📱 Shorts content strategy',
    keys: ['쇼츠', 'shorts'],
  },
  {
    labelKo: '8. 🎬 영상 분석 — 마케터·PD 심층 인사이트',
    labelEn: '8. 🎬 Role-based video analysis (Marketer & PD)',
    keys: ['마케터·pd', '역할별', 'role-based video', 'lesson learned', '레퍼런스'],
  },
  {
    labelKo: '## ✅ 우선 실행 액션 플랜 (7일)',
    labelEn: '## ✅ Priority 7-day action plan',
    keys: ['우선 실행', '액션 플랜', '7일차', '7일', 'action plan', '7-day', '7 day'],
  },
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
    return n.includes('seo') && (n.includes('알고리즘') || n.includes('algorithm'));
  });
}

function sliceAfterAlgorithmSection(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const hm = lines[i].match(/^#{1,6}\s+(.+)$/);
    if (!hm) continue;
    const title = normalizeForMatch(hm[1]);
    if (title.includes('seo') && (title.includes('알고리즘') || title.includes('algorithm'))) {
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

const CHECKLIST_COLUMNS: { id: ChecklistGapId; keys: string[] }[] = [
  { id: 'optimization_item', keys: ['최적화 항목', 'optimization item'] },
  { id: 'current_status', keys: ['현재 상태', 'current status'] },
  { id: 'improvement_actions', keys: ['개선 방안', 'improvement', 'specific improvement'] },
];

function analyzeChecklistColumns(sectionMd: string): ChecklistGapId[] {
  const header = firstMarkdownTableHeaderRow(sectionMd);
  if (!header) return CHECKLIST_COLUMNS.map((c) => c.id);
  const h = normalizeForMatch(header);
  const gaps: ChecklistGapId[] = [];
  for (const col of CHECKLIST_COLUMNS) {
    if (!col.keys.some((k) => h.includes(normalizeForMatch(k)))) {
      gaps.push(col.id);
    }
  }
  return gaps;
}

function sectionLabel(def: SectionDef, locale: AppLocale): string {
  return locale === 'en' ? def.labelEn : def.labelKo;
}

export function analyzeReportCompleteness(
  reportType: 'channel' | 'video',
  markdown: string,
  locale: AppLocale = 'ko',
): ReportCompleteness {
  const headings = extractMarkdownHeadings(markdown);
  const template = reportType === 'channel' ? CHANNEL_SECTIONS : VIDEO_SECTIONS;

  const missingLabels: string[] = [];
  for (const sec of template) {
    if (!headingMatchesKeys(headings, sec.keys)) {
      missingLabels.push(sectionLabel(sec, locale));
    }
  }

  const algoHeading = hasAlgorithmSeoHeading(headings);
  const afterAlgo = sliceAfterAlgorithmSection(markdown);
  const tableInAlgoSection = hasGfmTable(afterAlgo);

  const algorithmSeoTableMissing = algoHeading && !tableInAlgoSection;

  let algorithmSeoChecklistColumnGaps: ChecklistGapId[] = [];
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
  algorithmSeoChecklistColumnGaps: ChecklistGapId[];
}

export function buildReportCompletenessAppendix(
  missingLabels: string[],
  opts: ReportCompletenessAppendixOptions,
  locale: AppLocale = 'ko',
): string {
  const parts: string[] = [];
  if (missingLabels.length > 0) {
    parts.push('\n\n---\n\n');
    parts.push(translate(locale, 'appendixMissingTitle'));
    parts.push('\n');
    parts.push(translate(locale, 'appendixMissingIntro'));
    parts.push('\n');
    for (const l of missingLabels) {
      parts.push(`- ${l}\n`);
    }
  }
  if (opts.algorithmSeoTableMissing) {
    parts.push('\n');
    parts.push(translate(locale, 'appendixAlgoTableLine'));
    parts.push('\n');
  }
  if (opts.algorithmSeoChecklistColumnsIncomplete && opts.algorithmSeoChecklistColumnGaps.length > 0) {
    parts.push('\n');
    parts.push(translate(locale, 'appendixChecklistIntro'));
    parts.push('\n');
    for (const g of opts.algorithmSeoChecklistColumnGaps) {
      const key = CHECKLIST_GAP_TRANSLATION_KEY[g];
      parts.push(`  - ${translate(locale, key)}\n`);
    }
  }
  return parts.join('');
}
