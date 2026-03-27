/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function wrapReportDocumentHtml(innerHtml: string): string {
  return `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>유튜브 분석 리포트</title>
        <style>
          body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif; padding: 2rem; max-width: 900px; margin: 0 auto; color: #374151; line-height: 1.8; }
          h1 { font-size: 2.25rem; font-weight: 900; margin-top: 3rem; margin-bottom: 1.5rem; border-bottom: 2px solid #f3f4f6; padding-bottom: 1rem; color: #111827; }
          h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; color: #111827; display: flex; align-items: center; gap: 0.5rem; }
          h3 { font-size: 1.25rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; color: #1f2937; }
          p { margin-bottom: 1.25rem; }
          ul { list-style-type: none; padding-left: 0; margin-bottom: 1.5rem; }
          li { position: relative; padding-left: 1.5rem; margin-bottom: 0.5rem; }
          li::before { content: ''; position: absolute; left: 0; top: 0.6rem; width: 6px; height: 6px; background-color: #f87171; border-radius: 50%; }
          table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.95rem; }
          th, td { border: 1px solid #e5e7eb; padding: 1rem; text-align: left; }
          th { background-color: #f9fafb; font-weight: 700; color: #111827; font-size: 0.85rem; letter-spacing: 0.02em; }
          tr:nth-child(even) { background-color: #fcfcfc; }
          blockquote { border-left: 4px solid #ef4444; padding: 1.5rem; color: #1f2937; background: #fef2f2; border-radius: 0 1rem 1rem 0; margin: 2rem 0; font-weight: 500; }
          strong { font-weight: 700; color: #111827; background-color: rgba(254, 226, 226, 0.5); padding: 0 0.25rem; border-bottom: 2px solid #fecaca; }
          a { color: #dc2626; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        ${innerHtml}
      </body>
      </html>
    `;
}
