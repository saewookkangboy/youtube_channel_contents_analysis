import { describe, expect, it } from 'vitest';
import {
  appendOutputTruncateNotice,
  extractAlgorithmInsightsFromMarkdown,
  extractMarkdownH2Nav,
  postProcessKoreanNaturalness,
  postProcessKoreanNaturalnessWithTone,
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

describe('postProcessKoreanNaturalness', () => {
  it('rewrites selected Korean AI-style phrases outside code fences', () => {
    const md = [
      '결론적으로, 이 기능은 성능 개선을 시사하는 바가 크다.',
      '사용자는 이 기능을 통해 업무 시간을 줄일 수 있다.',
      '',
      '```json',
      '{"text":"결론적으로, ~를 통해"}',
      '```',
    ].join('\n');

    const out = postProcessKoreanNaturalness(md, 'ko');
    expect(out).toContain('이 기능은 성능 개선의 의미가 크다.');
    expect(out).toContain('이 기능으로 업무 시간을 줄일 수 있다.');
    expect(out).toContain('{"text":"결론적으로, ~를 통해"}');
  });

  it('returns original markdown for English locale', () => {
    const md = '결론적으로, A를 통해 B를 만든다.';
    expect(postProcessKoreanNaturalness(md, 'en')).toBe(md);
  });

  it('applies formal tone when requested', () => {
    const md = '이 기능은 빠르게 안내해요.';
    const out = postProcessKoreanNaturalnessWithTone(md, 'ko', 'formal');
    expect(out).toContain('안내합니다.');
  });

  it('applies casual tone when requested', () => {
    const md = '이 기능은 빠르게 안내합니다.';
    const out = postProcessKoreanNaturalnessWithTone(md, 'ko', 'casual');
    expect(out).toContain('안내해요.');
  });

  it('applies low intensity conservatively', () => {
    const md = '결론적으로, 이 기능을 통해 처리할 수 있다.';
    const out = postProcessKoreanNaturalnessWithTone(md, 'ko', 'default', 'low');
    expect(out).toBe(md);
  });

  it('applies high intensity aggressively', () => {
    const md = '결론적으로, 이 기능을 통해 처리할 수 있다.';
    const out = postProcessKoreanNaturalnessWithTone(md, 'ko', 'default', 'high');
    expect(out).toContain('이 기능으로 처리한다.');
  });
});
