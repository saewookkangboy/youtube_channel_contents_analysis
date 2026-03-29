import { describe, expect, it } from 'vitest';
import {
  appendOutputTruncateNotice,
  extractAlgorithmInsightsFromMarkdown,
  extractMarkdownH2Nav,
} from '../src/lib/reportMarkdownUtils';

describe('extractMarkdownH2Nav', () => {
  it('lists ## headings with stable ids', () => {
    const md = '# no\n\n## 0. First\n\nbody\n## 1. Second section\n';
    const nav = extractMarkdownH2Nav(md);
    expect(nav).toHaveLength(2);
    expect(nav[0].title).toContain('First');
    expect(nav[0].id).toMatch(/^report-h2-0-/);
    expect(nav[1].id).toMatch(/^report-h2-1-/);
  });
});

describe('extractAlgorithmInsightsFromMarkdown', () => {
  it('returns original text when no JSON fence', () => {
    const md = '## Hi\n\nno fence';
    expect(extractAlgorithmInsightsFromMarkdown(md)).toEqual({ text: md });
  });

  it('strips fence and returns algorithmInsights', () => {
    const md = 'Intro\n\n```json\n{"algorithmInsights":[{"label":"A","status":"green"}]}\n```\n\nTail';
    const r = extractAlgorithmInsightsFromMarkdown(md);
    expect(r.algorithmInsights).toEqual([{ label: 'A', status: 'green' }]);
    expect(r.text).toContain('Intro');
    expect(r.text).toContain('Tail');
    expect(r.text).not.toContain('algorithmInsights');
  });
});

describe('appendOutputTruncateNotice', () => {
  it('returns unchanged when not truncated', () => {
    expect(appendOutputTruncateNotice('x', 'ko', false)).toBe('x');
  });

  it('appends Korean notice when truncated', () => {
    const out = appendOutputTruncateNotice('body', 'ko', true);
    expect(out.startsWith('body')).toBe(true);
    expect(out).toContain('다시 분석');
  });

  it('appends English notice when truncated', () => {
    const out = appendOutputTruncateNotice('body', 'en', true);
    expect(out).toContain('Analyze');
  });
});
