export function wrapReportDocumentHtml(bodyInnerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>채널인사이트 · 분석 리포트</title>
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
      margin-top: 0.65em;
      margin-bottom: 0.65em;
      line-height: 1.82;
      color: #334155;
    }
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
    .report-document :where(blockquote p) { margin: 0.35em 0; }
    .report-document :where(ul) { list-style: none; padding-left: 0; }
    .report-document :where(ul > li) {
      position: relative;
      padding-left: 1.35rem;
      margin: 0.4em 0;
    }
    .report-document :where(ul > li)::before {
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
    .report-document :where(ol) { padding-left: 1.35rem; }
    .report-document :where(ol > li) { margin: 0.4em 0; padding-left: 0.25rem; }
    .report-document :where(ol > li::marker) { font-weight: 700; color: #64748b; }
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
    .report-document :where(pre) {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 8px;
      overflow: auto;
      font-size: 13px;
      line-height: 1.65;
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
  </style>
</head>
<body>
  <div class="report-document prose prose-slate max-w-none">${bodyInnerHtml}</div>
</body>
</html>`;
}
