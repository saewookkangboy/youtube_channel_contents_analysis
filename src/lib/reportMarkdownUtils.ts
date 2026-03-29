export interface AlgorithmInsight {
  label: string;
  status: 'green' | 'yellow' | 'red';
}

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
