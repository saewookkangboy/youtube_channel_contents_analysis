import type { AppLocale } from '../i18n/types';
import { translate, type TranslationKey } from '../i18n/translations';
import {
  CHANNEL_REPORT_SECTIONS,
  VIDEO_REPORT_SECTIONS,
  type ReportSectionSpec,
} from './reportStructureContract';

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

function specToSectionDef(spec: ReportSectionSpec): SectionDef {
  const strip = (line: string) => line.replace(/^##\s+/, '');
  return {
    labelKo: strip(spec.headingKoLine),
    labelEn: strip(spec.headingEnLine),
    keys: [...spec.matchKeys],
  };
}

const CHANNEL_SECTIONS: SectionDef[] = CHANNEL_REPORT_SECTIONS.map(specToSectionDef);
const VIDEO_SECTIONS: SectionDef[] = VIDEO_REPORT_SECTIONS.map(specToSectionDef);

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
