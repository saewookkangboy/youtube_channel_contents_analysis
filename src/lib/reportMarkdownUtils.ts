export interface AlgorithmInsight {
  label: string;
  status: 'green' | 'yellow' | 'red';
}

export type KoreanNaturalnessTone = 'default' | 'formal' | 'casual';
export type KoreanNaturalnessIntensity = 'low' | 'medium' | 'high';

function slugifyHeading(s: string): string {
  const base = s
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return (base.slice(0, 48) || 'section').replace(/^-|-$/g, '');
}

/** 긴 리포트용 앵커 네비: `##` 줄만 스캔 */
export function extractMarkdownH2Nav(
  markdown: string,
  maxItems = 24,
): { id: string; title: string }[] {
  const lines = markdown.split('\n');
  const out: { id: string; title: string }[] = [];
  let idx = 0;
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (!m) continue;
    const title = m[1].trim();
    out.push({ id: `report-h2-${idx}-${slugifyHeading(title)}`, title });
    idx += 1;
    if (out.length >= maxItems) break;
  }
  return out;
}

function parseAlgorithmInsightsPayload(parsed: unknown): AlgorithmInsight[] | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const raw = (parsed as Record<string, unknown>).algorithmInsights;
  if (!Array.isArray(raw)) return null;
  const out: AlgorithmInsight[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.label !== 'string' || !rec.label.trim()) continue;
    const st = rec.status;
    if (st !== 'green' && st !== 'yellow' && st !== 'red') continue;
    out.push({ label: rec.label.trim(), status: st });
  }
  return out.length > 0 ? out : null;
}

function tryParseAlgorithmInsightsJsonBody(body: string): AlgorithmInsight[] | null {
  try {
    return parseAlgorithmInsightsPayload(JSON.parse(body));
  } catch {
    return null;
  }
}

/**
 * 모델이 삽입한 코드 펜스에서 algorithmInsights JSON을 파싱한다.
 */
export function extractAlgorithmInsightsFromMarkdown(markdown: string): {
  text: string;
  algorithmInsights?: AlgorithmInsight[];
} {
  const fencePattern = /```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  const matches: RegExpExecArray[] = [];
  while ((m = fencePattern.exec(markdown)) !== null) {
    matches.push(m);
  }
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const body = match[1].trim();
    const insights = tryParseAlgorithmInsightsJsonBody(body);
    if (insights) {
      const stripped = markdown.replace(match[0], '').replace(/\n{3,}/g, '\n\n').trim();
      return { text: stripped, algorithmInsights: insights };
    }
  }
  return { text: markdown };
}

export function appendOutputTruncateNotice(
  markdown: string,
  locale: 'ko' | 'en',
  truncated: boolean,
): string {
  if (!truncated) return markdown;
  const note =
    locale === 'en'
      ? '\n\n> **Note:** Output hit the model length limit. The end of the report (7-day plan, table, or JSON block) may be incomplete — run **Analyze** again.'
      : '\n\n> **안내:** 출력 길이 한도에 도달해 응답이 중간에 끊겼을 수 있습니다. 끝부분(7일 플랜·표·JSON)이 없으면 **다시 분석**을 실행해 주세요.';
  return `${markdown.trimEnd()}${note}`;
}

const KOREAN_NATURALNESS_REWRITES_BASE: ReadonlyArray<[RegExp, string]> = [
  [/이에 있어서/g, '여기서'],
  [/을 통해/g, '으로'],
  [/를 통해/g, '로'],
  [/시사하는 바가 크다/g, '의미가 크다'],
  [/결론적으로[, ]*/g, ''],
  [/주목할 만하다/g, '눈여겨볼 만하다'],
  [/을 의미가 크다/g, '의 의미가 크다'],
  [/를 의미가 크다/g, '의 의미가 크다'],
];

const KOREAN_NATURALNESS_REWRITES_BY_INTENSITY: Record<
  KoreanNaturalnessIntensity,
  ReadonlyArray<[RegExp, string]>
> = {
  low: [],
  medium: KOREAN_NATURALNESS_REWRITES_BASE,
  high: [
    ...KOREAN_NATURALNESS_REWRITES_BASE,
    [/할 수 있다/g, '한다'],
    [/할 수 있습니다/g, '합니다'],
    [/있습니다\./g, '있어요.'],
  ],
};

const KOREAN_NATURALNESS_TONE_REWRITES: Record<
  KoreanNaturalnessTone,
  ReadonlyArray<[RegExp, string]>
> = {
  default: [],
  formal: [
    [/해요\./g, '합니다.'],
    [/줘요\./g, '주세요.'],
  ],
  casual: [
    [/합니다\./g, '해요.'],
    [/하십시오\./g, '해주세요.'],
    [/하십시오/g, '해주세요'],
  ],
};

function applyKoreanNaturalnessRewrites(
  segment: string,
  tone: KoreanNaturalnessTone,
  intensity: KoreanNaturalnessIntensity,
): string {
  let out = segment;
  const inlineCodeTokens: string[] = [];
  out = out.replace(/`[^`\n]+`/g, (m) => {
    const token = `__INLINE_CODE_TOKEN_${inlineCodeTokens.length}__`;
    inlineCodeTokens.push(m);
    return token;
  });

  for (const [pattern, replacement] of KOREAN_NATURALNESS_REWRITES_BY_INTENSITY[intensity]) {
    out = out.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of KOREAN_NATURALNESS_TONE_REWRITES[tone]) {
    out = out.replace(pattern, replacement);
  }

  out = out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([,.!?])/g, '$1');

  for (let i = 0; i < inlineCodeTokens.length; i += 1) {
    out = out.replace(`__INLINE_CODE_TOKEN_${i}__`, inlineCodeTokens[i]);
  }
  return out;
}

/**
 * 한국어 리포트 가독성을 높이는 보수적 후처리.
 * - 코드 펜스 내부는 변경하지 않는다.
 * - 영문 리포트(en)는 그대로 반환한다.
 */
export function postProcessKoreanNaturalness(markdown: string, locale: 'ko' | 'en'): string {
  return postProcessKoreanNaturalnessWithTone(markdown, locale, 'default');
}

export function postProcessKoreanNaturalnessWithTone(
  markdown: string,
  locale: 'ko' | 'en',
  tone: KoreanNaturalnessTone,
  intensity: KoreanNaturalnessIntensity = 'medium',
): string {
  if (locale !== 'ko' || !markdown.trim()) return markdown;
  const codeFencePattern = /```[\s\S]*?```/g;
  let cursor = 0;
  let out = '';
  let match: RegExpExecArray | null;

  while ((match = codeFencePattern.exec(markdown)) !== null) {
    const idx = match.index;
    if (idx > cursor) {
      out += applyKoreanNaturalnessRewrites(markdown.slice(cursor, idx), tone, intensity);
    }
    out += match[0];
    cursor = idx + match[0].length;
  }

  if (cursor < markdown.length) {
    out += applyKoreanNaturalnessRewrites(markdown.slice(cursor), tone, intensity);
  }
  return out;
}
