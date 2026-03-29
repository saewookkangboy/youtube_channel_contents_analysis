import React, { useContext, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Copy } from 'lucide-react';
import { cn } from '../lib/cn';
import { useI18n } from '../i18n/I18nContext';
import { extractMarkdownH2Nav } from '../lib/reportMarkdownUtils';

export interface AnalysisMarkdownProps {
  content: string;
}

/** remark/react-markdown이 DOM에 넘기면 안 되는 메타 props */
type MdPassThrough = { node?: unknown };

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

function extractPlainText(children: React.ReactNode): string {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractPlainText).join('');
  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    return extractPlainText(props.children);
  }
  return '';
}

/** Nano Banana 등 영문 썸네일·이미지 프롬프트가 일반 문단으로 올 때 복사 블록으로 승격 */
function isLikelyEnglishCopyBlock(text: string): boolean {
  const t = text.trim();
  if (t.length < 100) return false;
  const nonSpace = t.replace(/\s/g, '');
  if (nonSpace.length < 80) return false;
  const latinChars = nonSpace.replace(/[^A-Za-z]/g, '').length;
  if (latinChars / nonSpace.length < 0.33) return false;
  return /thumbnail|YouTube|featuring|hyper-?realistic|4K|cinematic|lighting|earbuds|prompt|Nano Banana|CTA|overlay|composition|reflective|dynamic|high-contrast|wireless|image\b/i.test(
    t,
  );
}

/** 한국어 안내 뒤에 붙는 긴 이미지/썸네일 프롬프트 등 — 복사 UI로 고정 */
function isLikelyPromptCopyBlock(text: string): boolean {
  const t = text.trim();
  if (t.length < 72) return false;
  if (
    /Nano\s*Banana|썸네일\s*프롬프트|이미지\s*프롬프트|영문\s*프롬프트|프롬프트\s*[:：]|Thumbnail\s*prompt|image\s*generation|프롬프트\s*\(|생성\s*프롬프트|프롬프트\s*예시/i.test(
      t,
    )
  ) {
    return true;
  }
  const nonSpace = t.replace(/\s/g, '');
  if (nonSpace.length < 90) return false;
  const latinRatio = nonSpace.replace(/[^A-Za-z]/g, '').length / nonSpace.length;
  if (latinRatio < 0.26) return false;
  return /lighting|composition|cinematic|4K|YouTube|overlay|hook|subject|background|portrait|studio|lens|bokeh|dramatic|vibrant/i.test(
    t,
  );
}

type CopySnippetToolbar = 'code' | 'prompt';

function CopyableSnippet({
  text,
  children,
  toolbar,
}: {
  text: string;
  children: React.ReactNode;
  toolbar: CopySnippetToolbar;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const toolbarTitle = toolbar === 'prompt' ? t('reportCopyBlockTitlePrompt') : t('reportCopyBlockTitle');

  return (
    <div className="report-copy-snippet">
      <div className="report-copy-snippet__toolbar">
        <span className="report-copy-snippet__toolbar-title">{toolbarTitle}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={t('reportCopyAria')}
          className={cn('report-copy-snippet__copy-btn', copied && 'report-copy-snippet__copy-btn--done')}
        >
          {copied ? <Check className="report-copy-snippet__copy-icon" strokeWidth={2.5} /> : <Copy className="report-copy-snippet__copy-icon" strokeWidth={2.5} />}
          {copied ? t('reportCopied') : t('reportCopyButton')}
        </button>
      </div>
      <div className="report-copy-snippet__body">{children}</div>
    </div>
  );
}

function AnimatedParagraph({ children, className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
  const inListItem = useContext(InsideListItemContext);
  const inTableCell = useContext(InsideTableCellContext);
  if (inListItem || inTableCell) {
    return (
      <p className={className} {...props}>
        {children}
      </p>
    );
  }
  return (
    <FadeInBlock>
      <p className={className} {...props}>
        {children}
      </p>
    </FadeInBlock>
  );
}

function MarkdownParagraph({ children, className, node: _n, ...rest }: React.ComponentPropsWithoutRef<'p'> & MdPassThrough) {
  const inListItem = useContext(InsideListItemContext);
  const inTableCell = useContext(InsideTableCellContext);
  const plain = extractPlainText(children).trim();

  const copyKind =
    !inListItem && !inTableCell
      ? isLikelyPromptCopyBlock(plain)
        ? 'prompt'
        : isLikelyEnglishCopyBlock(plain)
          ? 'english'
          : null
      : null;

  if (copyKind === 'prompt' || copyKind === 'english') {
    return (
      <FadeInBlock>
        <CopyableSnippet text={plain} toolbar={copyKind === 'prompt' ? 'prompt' : 'code'}>
          <pre
            className={cn(
              'm-0 max-w-full whitespace-pre-wrap break-words border-0 bg-transparent p-4',
              'font-mono text-[13px] leading-relaxed text-slate-100',
              className,
            )}
          >
            {plain}
          </pre>
        </CopyableSnippet>
      </FadeInBlock>
    );
  }

  return (
    <AnimatedParagraph className={className} {...rest}>
      {children}
    </AnimatedParagraph>
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

/** 연속 빈 줄·행 끝 공백을 줄여 문단 간격이 응답마다 들쭉날쭉해지지 않게 함 */
function normalizeMarkdownWhitespace(text: string): string {
  return text
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  const { t } = useI18n();
  const normalized = normalizeModelLineBreaks(
    normalizeUnicodeLineBreaks(normalizeMarkdownWhitespace(content)),
  );
  const h2Nav = useMemo(() => extractMarkdownH2Nav(normalized), [normalized]);
  const showToc = h2Nav.length >= 5 && normalized.length >= 3500;
  const h2IndexRef = useRef(0);
  h2IndexRef.current = 0;

  return (
    <>
      {showToc && (
        <nav
          className="report-toc not-prose mb-6 rounded-2xl border border-gray-200 bg-gray-50/90 p-4 shadow-sm"
          aria-label={t('reportTocAria')}
        >
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            {t('reportTocTitle')}
          </p>
          <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto text-sm text-gray-700">
            {h2Nav.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="block rounded-lg px-2 py-1 hover:bg-white hover:text-red-700"
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children, node: _n, ...props }) => (
          <FadeInBlock>
            <h1 {...props}>{children}</h1>
          </FadeInBlock>
        ),
        h2: ({ children, node: _n, ...props }) => {
          const i = h2IndexRef.current;
          h2IndexRef.current += 1;
          const id = h2Nav[i]?.id;
          return (
            <FadeInBlock>
              <h2 id={id} {...props}>
                {children}
              </h2>
            </FadeInBlock>
          );
        },
        h3: ({ children, node: _n, ...props }) => (
          <FadeInBlock>
            <h3 {...props}>{children}</h3>
          </FadeInBlock>
        ),
        h4: ({ children, node: _n, ...props }) => (
          <FadeInBlock>
            <h4 {...props}>{children}</h4>
          </FadeInBlock>
        ),
        h5: ({ children, node: _n, ...props }) => (
          <FadeInBlock>
            <h5 {...props}>{children}</h5>
          </FadeInBlock>
        ),
        h6: ({ children, node: _n, ...props }) => (
          <FadeInBlock>
            <h6 {...props}>{children}</h6>
          </FadeInBlock>
        ),
        p: ({ children, className, node: _n, ...props }) => (
          <MarkdownParagraph className={className} {...props}>
            {children}
          </MarkdownParagraph>
        ),
        ul: ({ children, className, ...props }) => (
          <ul {...props} className={cn('report-md-list report-md-list--ul', className)}>
            {children}
          </ul>
        ),
        ol: ({ children, className, ...props }) => (
          <ol {...props} className={cn('report-md-list report-md-list--ol', className)}>
            {children}
          </ol>
        ),
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
        hr: ({ node: _n, ...props }) => (
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
        pre: ({ children, className, node: _n, ...props }) => {
          const text = extractPlainText(children);
          return (
            <FadeInBlock>
              <CopyableSnippet text={text} toolbar="code">
                <pre
                  {...props}
                  className={cn(
                    'm-0 max-w-full border-0 bg-transparent p-4 text-[13px] leading-relaxed text-slate-100',
                    '[-webkit-overflow-scrolling:touch]',
                    className,
                  )}
                >
                  {children}
                </pre>
              </CopyableSnippet>
            </FadeInBlock>
          );
        },
        img: ({ alt, className, ...props }) => (
          <AnimatedImage alt={alt} className={className} {...props} />
        ),
      }}
    >
      {normalized}
    </ReactMarkdown>
    </>
  );
}
