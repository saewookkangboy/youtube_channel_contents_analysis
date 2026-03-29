export interface WrapReportDocumentHtmlOptions {
  lang?: string;
  title?: string;
}

export function wrapReportDocumentHtml(
  bodyInnerHtml: string,
  options?: WrapReportDocumentHtmlOptions,
): string {
  const lang = options?.lang ?? "ko";
  const title = options?.title ?? "채널인사이트 · 분석 리포트";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title.replace(/</g, "&lt;")}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Pretendard", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.75;
      color: #334155;
      background: #f8fafc;
      padding: 2rem 1.25rem 3rem;
    }
    .report-document {
      --report-accent: #7c3aed;
      --report-accent-soft: rgba(124, 58, 237, 0.12);
      --report-highlight: rgba(253, 224, 71, 0.48);
      --report-em: #4f46e5;
      max-width: 48rem;
      margin-left: auto;
      margin-right: auto;
      font-feature-settings: "kern" 1, "liga" 1;
    }
    .report-document--surface {
      border-radius: 1rem;
      border: 1px solid #e8ecf1;
      background: linear-gradient(165deg, #ffffff 0%, #f9fafb 55%, #f4f5f7 100%);
      padding: 1.25rem 1.25rem 1.65rem;
      box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.85);
    }
    @media (min-width: 640px) {
      .report-document--surface { padding: 1.5rem 1.75rem 2rem; }
    }
    .report-document :where(h1) {
      margin-top: 0;
      margin-bottom: 1rem;
      padding-bottom: 0.65rem;
      border-bottom: 2px solid #e2e8f0;
      font-size: 1.625rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.25;
      color: #0f172a;
    }
    .report-document :where(h2) {
      scroll-margin-top: 4.5rem;
      margin-top: 2.25rem;
      margin-bottom: 0.85rem;
      padding: 0.45rem 0 0.45rem 1rem;
      border-left: 4px solid var(--report-accent);
      background: linear-gradient(90deg, var(--report-accent-soft), transparent 65%);
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      line-height: 1.35;
      color: #0f172a;
    }
    .report-document :where(h3) {
      margin-top: 1.75rem;
      margin-bottom: 0.6rem;
      padding-left: 0.65rem;
      border-left: 3px solid #cbd5e1;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #1e293b;
    }
    .report-document :where(h4) {
      margin-top: 1.35rem;
      margin-bottom: 0.45rem;
      font-size: 0.98rem;
      font-weight: 700;
      color: #334155;
    }
    .report-document :where(p) {
      margin: 0 0 1rem;
      line-height: 1.78;
      color: #334155;
    }
    .report-document :where(li p), .report-document :where(td p), .report-document :where(th p) {
      margin: 0 0 0.5rem;
    }
    .report-document :where(li p:last-child), .report-document :where(td p:last-child), .report-document :where(th p:last-child) {
      margin-bottom: 0;
    }
    .report-document :where(h2 + p, h3 + p, h4 + p) { margin-top: 0; }
    .report-document :where(strong) {
      font-weight: 700;
      color: #0f172a;
      background: linear-gradient(transparent 0%, transparent 52%, var(--report-highlight) 52%, var(--report-highlight) 100%);
      padding: 0 0.14em;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    .report-document :where(em) {
      font-style: italic;
      font-weight: 600;
      color: var(--report-em);
    }
    .report-document :where(hr) {
      margin: 2rem 0;
      border: none;
      height: 1px;
      background: linear-gradient(90deg, transparent, #cbd5e1 15%, #cbd5e1 85%, transparent);
    }
    .report-document :where(blockquote) {
      margin: 1.15rem 0;
      padding: 0.85rem 1rem 0.85rem 1.1rem;
      border-left: 4px solid #94a3b8;
      border-radius: 0 0.5rem 0.5rem 0;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color: #475569;
      font-size: 0.96em;
      line-height: 1.75;
    }
    .report-document :where(blockquote p) { margin: 0.35rem 0; }
    .report-document :where(.report-md-list) { margin: 0.65rem 0 1rem; }
    .report-document :where(.report-md-list--ul) { list-style: none; padding-left: 0; }
    .report-document :where(.report-md-list--ul > li) {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      list-style: none;
      padding-left: 0;
      margin: 0.45rem 0;
      min-height: 0;
    }
    .report-document :where(.report-md-list--ul > li)::before {
      content: "";
      flex: 0 0 auto;
      width: 0.42rem;
      height: 0.42rem;
      margin-top: 0.52rem;
      border-radius: 9999px;
      background: var(--report-accent);
      opacity: 0.88;
    }
    .report-document :where(.report-md-list--ul > li > .min-w-0) { flex: 1 1 auto; min-width: 0; }
    .report-document :where(.report-md-list--ul ul) { margin: 0.35rem 0 0.15rem; width: 100%; }
    .report-document :where(.report-md-list--ul ul > li)::before {
      width: 0.32rem;
      height: 0.32rem;
      margin-top: 0.55rem;
      opacity: 0.72;
    }
    .report-document :where(.report-md-list--ol) {
      list-style-type: decimal;
      list-style-position: outside;
      padding-left: 1.5rem;
    }
    .report-document :where(.report-md-list--ol > li) {
      margin: 0.45rem 0;
      padding-left: 0.2rem;
    }
    .report-document :where(.report-md-list--ol > li::marker) { font-weight: 700; color: #64748b; }
    .report-document :where(ul:not(.report-md-list--ul)) { list-style: none; padding-left: 0; }
    .report-document :where(ul:not(.report-md-list--ul) > li) {
      position: relative;
      padding-left: 1.35rem;
      margin: 0.45rem 0;
    }
    .report-document :where(ul:not(.report-md-list--ul) > li)::before {
      content: "";
      position: absolute;
      left: 0.15rem;
      top: 0.65em;
      width: 0.4rem;
      height: 0.4rem;
      border-radius: 9999px;
      background: var(--report-accent);
      opacity: 0.85;
    }
    .report-document :where(a) {
      color: #b91c1c;
      text-decoration: underline;
      text-underline-offset: 3px;
      font-weight: 500;
    }
    .report-document :where(a:hover) { color: #991b1b; }
    .report-document :where(table) { width: 100%; border-collapse: collapse; font-size: 0.94em; margin: 1em 0; }
    .report-document :where(th), .report-document :where(td) {
      border: 1px solid #e2e8f0;
      padding: 1rem 1.25rem;
      text-align: left;
      vertical-align: top;
      line-height: 1.65;
    }
    .report-document :where(thead th) {
      background: linear-gradient(180deg, #f1f5f9, #e2e8f0);
      color: #0f172a;
      font-weight: 700;
    }
    .report-document :where(tbody tr:nth-child(even)) { background: rgba(248, 250, 252, 0.85); }
    .report-document :where(code:not(pre code)) {
      font-size: 0.88em;
      font-weight: 600;
      color: #7c3aed;
      background: rgba(124, 58, 237, 0.08);
      padding: 0.12em 0.4em;
      border-radius: 0.3rem;
      border: 1px solid rgba(124, 58, 237, 0.12);
      font-family: ui-monospace, monospace;
    }
    .report-document :where(.report-copy-snippet) {
      margin: 1.15rem 0;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgb(51 65 85);
      background: #0f172a;
      box-shadow: 0 4px 14px rgb(15 23 42 / 0.22);
    }
    .report-document :where(.report-copy-snippet__toolbar) {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid rgb(51 65 85 / 0.85);
      background: rgb(30 41 59 / 0.96);
    }
    .report-document :where(.report-copy-snippet__toolbar-title) {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .report-document :where(.report-copy-snippet__copy-btn) {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      flex-shrink: 0;
      padding: 0.35rem 0.65rem;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      background: #475569;
      color: #f8fafc;
    }
    .report-document :where(.report-copy-snippet__copy-btn:hover) {
      background: #64748b;
    }
    .report-document :where(.report-copy-snippet__copy-btn--done) {
      background: rgb(5 150 105 / 0.28);
      color: #6ee7b7;
    }
    .report-document :where(.report-copy-snippet__copy-icon) {
      width: 14px;
      height: 14px;
    }
    .report-document :where(.report-copy-snippet__body) {
      max-height: min(70vh, 28rem);
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }
    .report-document :where(.report-copy-snippet pre) {
      margin: 0;
      max-width: 100%;
      padding: 1rem;
      font-size: 13px;
      line-height: 1.65;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: transparent;
      color: #f1f5f9;
      border: none;
      border-radius: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .report-document :where(pre code) {
      background: transparent;
      padding: 0;
      color: inherit;
      border: none;
      font-weight: 400;
    }
    .report-document .overflow-x-auto {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border-radius: 0.75rem;
      border: 1px solid #e5e7eb;
      background: #fff;
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
      margin: 1.25rem 0;
    }
    .report-document :where(img) {
      max-width: 100%;
      height: auto;
      border-radius: 0.5rem;
    }
    .report-toc {
      margin-bottom: 1.5rem;
      padding: 1rem 1.25rem;
      border-radius: 1rem;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      font-size: 0.9rem;
    }
    .report-toc ul { list-style: none; margin: 0; padding: 0; }
    .report-toc a { color: #b91c1c; text-decoration: none; }
    .report-toc a:hover { text-decoration: underline; }
    @media print {
      body {
        background: #fff;
        padding: 0;
        font-size: 11pt;
        color: #000;
      }
      .report-document { max-width: none; }
      .report-document :where(h2) {
        break-after: avoid;
        background: transparent;
        border-left-color: #333;
      }
      .report-document :where(.report-copy-snippet) {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="report-document report-document--surface prose prose-slate max-w-none">${bodyInnerHtml}</div>
</body>
</html>`;
}
