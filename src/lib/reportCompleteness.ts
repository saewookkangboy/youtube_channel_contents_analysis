export interface ReportSectionSpec {
  /** UI에 표시할 짧은 라벨 */
  label: string;
  /** 제목 한 줄이 이 조건 중 하나라도 만족하면 해당 섹션으로 족적 */
  matchAny: (headingNorm: string) => boolean;
}

function normalizeHeading(raw: string): string {
  return raw
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNormalizedHeadings(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const m = line.match(/^#{1,6}\s+(.+)$/);
    if (m?.[1]) {
      out.push(normalizeHeading(m[1]));
    }
  }
  return out;
}

function isAlgorithmSeoHeadingNormalized(h: string): boolean {
  return (
    (/알고리즘/.test(h) && /seo/i.test(h)) || /algorithm.*seo|seo.*algorithm/i.test(h)
  );
}

function isMarkdownTableDividerLine(line: string): boolean {
  const s = line.trim();
  if (!s.includes('|')) {
    return false;
  }
  const cells = s
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  return cells.length >= 2 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function looksLikeMarkdownTableRow(line: string): boolean {
  const s = line.trim();
  if (!s.includes('|')) {
    return false;
  }
  const pipeCount = (s.match(/\|/g) ?? []).length;
  return pipeCount >= 2;
}

/** GFM: 표头 행 다음 줄이 |---| 형태의 구분 행이면 표로 간주 */
export function hasGitHubFlavoredMarkdownTable(markdown: string): boolean {
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    if (looksLikeMarkdownTableRow(lines[i]) && isMarkdownTableDividerLine(lines[i + 1])) {
      return true;
    }
  }
  return false;
}

/** 본문에서 첫 번째 GFM 표의 헤더 행 원문(트림) */
export function getFirstGitHubFlavoredMarkdownTableHeader(markdown: string): string | null {
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    if (looksLikeMarkdownTableRow(lines[i]) && isMarkdownTableDividerLine(lines[i + 1])) {
      return lines[i].trim();
    }
  }
  return null;
}

function normalizeTableHeaderRow(row: string): string {
  return row.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

/** 프롬프트 기준 3열: 최적화 항목 / 현재 상태(진단) / 개선 방안 */
const ALGORITHM_SEO_CHECKLIST_HEADER_GROUPS: readonly {
  gapLabel: string;
  match: (s: string) => boolean;
}[] = [
  {
    gapLabel: '최적화 항목',
    match: (s) => /최적화\s*항목/i.test(s) || /optimization\s*item/i.test(s),
  },
  {
    gapLabel: '현재 상태 진단',
    match: (s) =>
      /현재\s*상태/i.test(s) ||
      /current\s*status/i.test(s) ||
      /status\s*assessment/i.test(s),
  },
  {
    gapLabel: '구체적인 개선 방안',
    match: (s) =>
      /개선\s*방안/i.test(s) ||
      /specific\s*improvement/i.test(s) ||
      /improvement\s*actions/i.test(s),
  },
];

export function analyzeAlgorithmSeoChecklistHeader(headerRow: string): {
  complete: boolean;
  columnGaps: string[];
} {
  const s = normalizeTableHeaderRow(headerRow);
  const columnGaps: string[] = [];
  for (const g of ALGORITHM_SEO_CHECKLIST_HEADER_GROUPS) {
    if (!g.match(s)) {
      columnGaps.push(g.gapLabel);
    }
  }
  return { complete: columnGaps.length === 0, columnGaps };
}

/**
 * 첫 번째 알고리즘/SEO 헤딩부터, 동일 또는 더 상위 레벨(# 개수 작거나 같음) 헤딩 직전까지 본문만 추출.
 */
function extractAlgorithmSeoSectionBody(markdown: string): string | null {
  const lines = markdown.split(/\r?\n/);
  let startBody = -1;
  let sectionLevel = 6;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (!m) {
      continue;
    }
    const level = m[1].length;
    const norm = normalizeHeading(m[2]);
    if (isAlgorithmSeoHeadingNormalized(norm)) {
      sectionLevel = level;
      startBody = i + 1;
      break;
    }
  }

  if (startBody < 0) {
    return null;
  }

  const bodyLines: string[] = [];
  for (let j = startBody; j < lines.length; j++) {
    const hm = lines[j].match(/^(#{1,6})\s+/);
    if (hm && hm[1].length <= sectionLevel) {
      break;
    }
    bodyLines.push(lines[j]);
  }

  return bodyLines.join('\n');
}

const CHANNEL_SECTIONS: ReportSectionSpec[] = [
  {
    label: '🔍 팩트 체크 및 로우 데이터',
    matchAny: (h) =>
      (/팩트/.test(h) && /로우|raw/i.test(h)) ||
      /fact check/i.test(h) ||
      /raw data/i.test(h),
  },
  {
    label: '📊 채널 데이터 및 현황 분석',
    matchAny: (h) => /채널.*현황|채널 데이터/.test(h) || /channel data analysis/i.test(h),
  },
  {
    label: '🚀 콘텐츠 성과 분석',
    matchAny: (h) => /콘텐츠 성과|content performance/i.test(h),
  },
  {
    label: '💰 다각화된 수익화 전략',
    matchAny: (h) => /수익화|monetiz/i.test(h),
  },
  {
    label: '📈 구독자 증가 전략',
    matchAny: (h) => /구독자.*증가|subscriber growth/i.test(h),
  },
  {
    label: '🕒 초기 24시간 성과 진단',
    matchAny: (h) =>
      /초기\s*24시간|24h|first\s*24|first 24|성과 진단|diagnostics/i.test(h),
  },
  {
    label: '🎯 만족도 중심 진단 카드',
    matchAny: (h) =>
      /만족도|satisfaction|정합성|fit card|진단 카드/i.test(h),
  },
  {
    label: '🤖 알고리즘/SEO 최적화 가이드',
    matchAny: (h) =>
      (/알고리즘/.test(h) && /seo/i.test(h)) ||
      /algorithm.*seo|seo.*algorithm/i.test(h),
  },
  {
    label: '✍️ 영상 제목 개선안',
    matchAny: (h) =>
      (/제목/.test(h) && /개선|효율|effectiveness|suggestions/i.test(h)) ||
      /video title/i.test(h),
  },
  {
    label: '🤝 시청자 참여/커뮤니티 전략',
    matchAny: (h) =>
      /시청자 참여|Engagement|커뮤니티|community|user engagement/i.test(h),
  },
  {
    label: '⏰ 업로드 스케줄 제안',
    matchAny: (h) =>
      (/업로드|publish|publishing/i.test(h) &&
        (/시간|요일|스케줄|schedule|optimal/i.test(h))) ||
      /optimal publishing/i.test(h),
  },
  {
    label: '💡 신규 시리즈 아이디어',
    matchAny: (h) =>
      /신규.*시리즈|시리즈 아이디어|new content series|content series ideas/i.test(h),
  },
  {
    label: '🎥 영상/오디오 품질 개선',
    matchAny: (h) =>
      /영상.*오디오|video.*audio|품질 개선|quality improvement/i.test(h),
  },
  {
    label: '👀 교차 시청 채널 분석',
    matchAny: (h) =>
      /교차 시청|cross-viewership|cross viewership|벤치마킹|benchmark/i.test(h),
  },
  {
    label: '📱 쇼츠 연계 전략',
    matchAny: (h) => /쇼츠|shorts/i.test(h),
  },
  {
    label: '✅ 우선 실행 액션 플랜 (7일)',
    matchAny: (h) =>
      /우선 실행|액션 플랜|7일|7-day|priority action/i.test(h),
  },
];

const VIDEO_SECTIONS: ReportSectionSpec[] = [
  {
    label: '🔍 팩트 체크 및 로우 데이터',
    matchAny: (h) =>
      (/팩트/.test(h) && /로우|raw/i.test(h)) ||
      /fact check/i.test(h) ||
      /raw data/i.test(h),
  },
  {
    label: '📊 영상 상세 분석',
    matchAny: (h) => /영상 상세|detailed video/i.test(h),
  },
  {
    label: '📝 제목/설명란 추천',
    matchAny: (h) =>
      (/제목/.test(h) && /설명|description/i.test(h)) ||
      /title.*description|description recommendations/i.test(h),
  },
  {
    label: '✨ 썸네일 생성 프롬프트',
    matchAny: (h) =>
      /nano banana/i.test(h) ||
      (/썸네일|thumbnail/i.test(h) && /프롬프트|prompt/i.test(h)),
  },
  {
    label: '🕒 초기 24시간 성과 진단',
    matchAny: (h) =>
      /초기\s*24시간|24h|first\s*24|first 24|성과 진단|diagnostics/i.test(h),
  },
  {
    label: '🎯 만족도 중심 진단 카드',
    matchAny: (h) =>
      /만족도|satisfaction|정합성|fit card|진단 카드/i.test(h),
  },
  {
    label: '🤖 알고리즘/SEO 최적화 가이드',
    matchAny: (h) =>
      (/알고리즘/.test(h) && /seo/i.test(h)) ||
      /algorithm.*seo|seo.*algorithm/i.test(h),
  },
  {
    label: '📱 쇼츠 전략',
    matchAny: (h) => /쇼츠|shorts/i.test(h),
  },
  {
    label: '✅ 우선 실행 액션 플랜 (7일)',
    matchAny: (h) =>
      /우선 실행|액션 플랜|7일|7-day|priority action/i.test(h),
  },
];

export interface ReportCompletenessResult {
  ok: boolean;
  missingLabels: string[];
  headingsCount: number;
  totalRequired: number;
  /**
   * 알고리즘/SEO 섹션 헤딩은 있는데 GFM Markdown 표가 없을 때 true.
   * 섹션 자체가 없으면 false (섹션 누락은 missingLabels로 처리).
   */
  algorithmSeoTableMissing: boolean;
  /**
   * 알고리즘/SEO 본문에 표는 있으나, 첫 표 헤더에 필수 열 키워드가 빠졌을 때 true.
   * `algorithmSeoTableMissing`이 true면 항상 false.
   */
  algorithmSeoChecklistColumnsIncomplete: boolean;
  /** 누락된 열 안내(비어 있으면 문제 없음) */
  algorithmSeoChecklistColumnGaps: string[];
}

export function analyzeReportCompleteness(
  tab: 'channel' | 'video',
  markdown: string,
): ReportCompletenessResult {
  const specs = tab === 'channel' ? CHANNEL_SECTIONS : VIDEO_SECTIONS;
  const headings = extractNormalizedHeadings(markdown);
  const missingLabels: string[] = [];

  for (const spec of specs) {
    const found = headings.some((h) => spec.matchAny(h));
    if (!found) {
      missingLabels.push(spec.label);
    }
  }

  const algorithmHeadingPresent = headings.some((h) => isAlgorithmSeoHeadingNormalized(h));
  const algorithmBody = extractAlgorithmSeoSectionBody(markdown);
  const algorithmSeoTableMissing =
    algorithmHeadingPresent &&
    algorithmBody !== null &&
    !hasGitHubFlavoredMarkdownTable(algorithmBody);

  let algorithmSeoChecklistColumnsIncomplete = false;
  let algorithmSeoChecklistColumnGaps: string[] = [];

  if (algorithmHeadingPresent && algorithmBody !== null && hasGitHubFlavoredMarkdownTable(algorithmBody)) {
    const headerLine = getFirstGitHubFlavoredMarkdownTableHeader(algorithmBody);
    if (headerLine) {
      const { complete, columnGaps } = analyzeAlgorithmSeoChecklistHeader(headerLine);
      algorithmSeoChecklistColumnsIncomplete = !complete;
      algorithmSeoChecklistColumnGaps = columnGaps;
    } else {
      algorithmSeoChecklistColumnsIncomplete = true;
      algorithmSeoChecklistColumnGaps = ['표 헤더 행을 파싱하지 못했습니다'];
    }
  }

  return {
    ok: missingLabels.length === 0,
    missingLabels,
    headingsCount: headings.length,
    totalRequired: specs.length,
    algorithmSeoTableMissing,
    algorithmSeoChecklistColumnsIncomplete,
    algorithmSeoChecklistColumnGaps,
  };
}

export function buildReportCompletenessAppendix(
  missingLabels: string[],
  opts?: {
    algorithmSeoTableMissing?: boolean;
    algorithmSeoChecklistColumnsIncomplete?: boolean;
    algorithmSeoChecklistColumnGaps?: string[];
  },
): string {
  const blocks: string[] = [];

  if (missingLabels.length > 0) {
    const lines = missingLabels.map((l) => `- ${l}`);
    blocks.push(
      '### 누락된 필수 섹션(헤딩)',
      '',
      '아래 섹션이 마크다운 헤딩에서 감지되지 않았습니다. `Agent.md` 고정 템플릿에 맞게 다시 분석하거나 수동으로 보완하세요.',
      '',
      ...lines,
      '',
    );
  }

  if (opts?.algorithmSeoTableMissing) {
    blocks.push(
      '### 알고리즘/SEO 체크리스트 표',
      '',
      '`알고리즘`/`SEO` 섹션 본문에 GitHub Flavored Markdown 표(헤더 행 + `| --- | --- |` 형태의 구분 행)가 없습니다. 프롬프트의 체크리스트 표를 추가하거나 다시 분석하세요.',
      '',
    );
  }

  if (opts?.algorithmSeoChecklistColumnsIncomplete && opts.algorithmSeoChecklistColumnGaps?.length) {
    const gapLines = opts.algorithmSeoChecklistColumnGaps.map((g) => `- ${g}`);
    blocks.push(
      '### 알고리즘/SEO 표 열(헤더) 점검',
      '',
      '첫 번째 Markdown 표 헤더에 프롬프트에서 요구한 열 이름이 모두 포함되지 않았습니다. 아래 항목을 헤더 행에 명시하세요.',
      '',
      ...gapLines,
      '',
    );
  }

  if (blocks.length === 0) {
    return '';
  }

  return ['', '---', '', '## ⚠️ 보고서 형식 점검 (자동 생성)', '', ...blocks].join('\n');
}
