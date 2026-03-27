import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/cn';

export interface AnalysisMarkdownProps {
  content: string;
}

export function AnalysisMarkdown({ content }: AnalysisMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children, ...props }) => {
          const external = href?.startsWith('http');
          return (
            <a
              href={href}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              {...props}
            >
              {children}
            </a>
          );
        },
        table: ({ children, ...props }) => (
          <div className="my-5 w-full max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
            <table
              {...props}
              className="w-max min-w-full border-collapse text-left text-[13px] sm:text-[15px]"
            >
              {children}
            </table>
          </div>
        ),
        pre: ({ children, ...props }) => (
          <pre
            {...props}
            className="max-w-full overflow-x-auto rounded-xl bg-slate-900 p-4 text-[13px] leading-relaxed text-slate-100 [-webkit-overflow-scrolling:touch]"
          >
            {children}
          </pre>
        ),
        img: ({ alt, className, ...props }) => (
          <img
            {...props}
            alt={alt ?? ''}
            className={cn('h-auto max-w-full rounded-lg', className)}
            loading="lazy"
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
