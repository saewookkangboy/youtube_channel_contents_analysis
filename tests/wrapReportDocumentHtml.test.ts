import { describe, expect, it } from 'vitest';
import { wrapReportDocumentHtml } from '../src/lib/wrapReportDocumentHtml';

describe('wrapReportDocumentHtml', () => {
  it('embeds body HTML and sets lang/title', () => {
    const html = wrapReportDocumentHtml('<p id="x">hi</p>', { lang: 'en', title: 'T' });
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>T</title>');
    expect(html).toContain('<p id="x">hi</p>');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('escapes < in title for HTML safety', () => {
    const html = wrapReportDocumentHtml('', { title: 'a<b' });
    expect(html).toContain('<title>a&lt;b</title>');
    expect(html).not.toContain('<title>a<b</title>');
  });

  it('uses Korean defaults when options omitted', () => {
    const html = wrapReportDocumentHtml('');
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('채널인사이트');
  });
});
