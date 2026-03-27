export function wrapReportDocumentHtml(bodyInnerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>채널인사이트 · 분석 리포트</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.75;
      color: #334155;
      background: #f8fafc;
      padding: 2rem 1.25rem 3rem;
    }
    .prose {
      max-width: 56rem;
      margin: 0 auto;
    }
    .prose h1, .prose h2, .prose h3, .prose h4 {
      color: #0f172a;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    .prose h1 { font-size: 1.75rem; }
    .prose h2 { font-size: 1.35rem; }
    .prose h3 { font-size: 1.15rem; }
    .prose p { margin: 0.75em 0; }
    .prose ul, .prose ol { margin: 0.75em 0; padding-left: 1.35em; }
    .prose li { margin: 0.25em 0; }
    .prose strong { color: #0f172a; font-weight: 700; }
    .prose a { color: #dc2626; text-decoration: underline; text-underline-offset: 2px; }
    .prose a:hover { color: #b91c1c; }
    .prose table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      margin: 1em 0;
    }
    .prose th, .prose td {
      border: 1px solid #e2e8f0;
      padding: 0.5rem 0.75rem;
      text-align: left;
      vertical-align: top;
    }
    .prose th { background: #f1f5f9; font-weight: 700; color: #0f172a; }
    .prose code {
      font-family: ui-monospace, monospace;
      font-size: 0.9em;
      background: #f1f5f9;
      padding: 0.1em 0.35em;
      border-radius: 4px;
    }
    .prose pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 8px;
      overflow: auto;
    }
    .prose pre code { background: transparent; padding: 0; color: inherit; }
    .prose blockquote {
      margin: 1em 0;
      padding-left: 1em;
      border-left: 4px solid #cbd5e1;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="prose prose-slate max-w-none">${bodyInnerHtml}</div>
</body>
</html>`;
}
