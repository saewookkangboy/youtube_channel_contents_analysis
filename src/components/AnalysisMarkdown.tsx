import React, { useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../lib/cn';

export interface AnalysisMarkdownProps {
  content: string;
}

/** 목록 항목·표 셀 내부 문단은 상위 블록과 이중 페이드되지 않도록 함 */
const InsideListItemContext = React.createContext(false);
const InsideTableCellContext = React.createContext(false);

const fadeInViewProps = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '0px 0px -8% 0px' as const, amount: 0.12 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

function FadeInBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div className={className} {...fadeInViewProps}>
      {children}
    </motion.div>
  );
}

/**
 * ul/ol의 직계 자식은 반드시 li. 페이드는 li가 아니라 내부 래퍼에만 적용해
 * li::before(bullet)·ol 마커가 motion opacity에 묻히지 않게 함.
 */
function FadeInListItem({ children, ...props }: React.ComponentPropsWithoutRef<'li'>) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return (
      <li {...props}>
        <InsideListItemContext.Provider value={true}>{children}</InsideListItemContext.Provider>
      </li>
    );
  }
  return (
    <li {...props}>
      <InsideListItemContext.Provider value={true}>
        <motion.div className="min-w-0" {...fadeInViewProps}>
          {children}
        </motion.div>
      </InsideListItemContext.Provider>
    </li>
  );
}

function AnimatedParagraph({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) {
  const inListItem = useContext(InsideListItemContext);
  const inTableCell = useContext(InsideTableCellContext);
  if (inListItem || inTableCell) {
    return <p {...props}>{children}</p>;
  }
  return (
    <FadeInBlock>
      <p {...props}>{children}</p>
    </FadeInBlock>
  );
}

function AnimatedImage({
  alt,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'img'>) {
  const inTableCell = useContext(InsideTableCellContext);
  const img = (
    <img
      {...props}
      alt={alt ?? ''}
      className={cn('h-auto max-w-full rounded-lg', className)}
      loading="lazy"
    />
  );
  if (inTableCell) {
    return img;
  }
  return <FadeInBlock>{img}</FadeInBlock>;
}

function replaceBrInMarkdownSegment(segment: string): string {
  return segment
    .replace(/&lt;br\s*\/?&gt;/gi, '  \n')
    .replace(/<br\s*\/?>/gi, '  \n');
}

/** LLM이 가끔 넣는 유니코드 줄바꿈 문자 — remark 파서가 깨지지 않게 일반 개행으로 바꿈 */
function normalizeUnicodeLineBreaks(text: string): string {
  return text.replace(/\u2028/g, "\n").replace(/\u2029/g, "\n\n");
}

/** 모델이 삽입한 HTML br을 마크다운 하드 브레이크로 변환(펜스 코드 블록 내부는 유지) */
function normalizeModelLineBreaks(text: string): string {
  const fence = /```[\s\S]*?```/g;
  const out: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    out.push(replaceBrInMarkdownSegment(text.slice(last, m.index)));
    out.push(m[0]);
    last = m.index + m[0].length;
  }
  out.push(replaceBrInMarkdownSegment(text.slice(last)));
  return out.join('');
}

export function AnalysisMarkdown({ content }: AnalysisMarkdownProps) {
  const normalized = normalizeModelLineBreaks(normalizeUnicodeLineBreaks(content));

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children, ...props }) => (
          <FadeInBlock>
            <h1 {...props}>{children}</h1>
          </FadeInBlock>
        ),
        h2: ({ children, ...props }) => (
          <FadeInBlock>
            <h2 {...props}>{children}</h2>
          </FadeInBlock>
        ),
        h3: ({ children, ...props }) => (
          <FadeInBlock>
            <h3 {...props}>{children}</h3>
          </FadeInBlock>
        ),
        h4: ({ children, ...props }) => (
          <FadeInBlock>
            <h4 {...props}>{children}</h4>
          </FadeInBlock>
        ),
        h5: ({ children, ...props }) => (
          <FadeInBlock>
            <h5 {...props}>{children}</h5>
          </FadeInBlock>
        ),
        h6: ({ children, ...props }) => (
          <FadeInBlock>
            <h6 {...props}>{children}</h6>
          </FadeInBlock>
        ),
        p: ({ children, ...props }) => (
          <AnimatedParagraph {...props}>{children}</AnimatedParagraph>
        ),
        ul: ({ children, ...props }) => <ul {...props}>{children}</ul>,
        ol: ({ children, ...props }) => <ol {...props}>{children}</ol>,
        li: ({ children, ...props }) => (
          <FadeInListItem {...props}>{children}</FadeInListItem>
        ),
        td: ({ children, ...props }) => (
          <InsideTableCellContext.Provider value={true}>
            <td {...props}>{children}</td>
          </InsideTableCellContext.Provider>
        ),
        th: ({ children, ...props }) => (
          <InsideTableCellContext.Provider value={true}>
            <th {...props}>{children}</th>
          </InsideTableCellContext.Provider>
        ),
        blockquote: ({ children, ...props }) => <blockquote {...props}>{children}</blockquote>,
        hr: (props) => (
          <FadeInBlock>
            <hr {...props} />
          </FadeInBlock>
        ),
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
          <FadeInBlock>
            <div className="my-5 w-full max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
              <table
                {...props}
                className="w-max min-w-full border-collapse text-left text-[13px] sm:text-[15px] [&_th]:px-5 [&_th]:py-4 [&_td]:px-5 [&_td]:py-4 [&_th]:align-top [&_td]:align-top [&_td]:leading-relaxed"
              >
                {children}
              </table>
            </div>
          </FadeInBlock>
        ),
        pre: ({ children, ...props }) => (
          <FadeInBlock>
            <pre
              {...props}
              className="max-w-full overflow-x-auto rounded-xl bg-slate-900 p-4 text-[13px] leading-relaxed text-slate-100 [-webkit-overflow-scrolling:touch]"
            >
              {children}
            </pre>
          </FadeInBlock>
        ),
        img: ({ alt, className, ...props }) => (
          <AnimatedImage alt={alt} className={className} {...props} />
        ),
      }}
    >
      {normalized}
    </ReactMarkdown>
  );
}
