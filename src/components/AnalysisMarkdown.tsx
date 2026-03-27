/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'motion/react';

export function AnalysisMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ node: _n, ...props }) => (
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="text-2xl md:text-3xl font-black text-gray-900 border-b-2 border-gray-100 pb-4 mb-10 mt-20 first:mt-0"
            {...(props as any)}
          />
        ),
        h2: ({ node: _n, ...props }) => (
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="text-xl md:text-2xl font-bold text-gray-900 mt-16 mb-6 flex items-center gap-2.5 before:content-[''] before:block before:w-1.5 before:h-6 before:bg-red-500 before:rounded-full"
            {...(props as any)}
          />
        ),
        h3: ({ node: _n, ...props }) => (
          <motion.h3
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="text-lg font-bold text-gray-800 mt-10 mb-4"
            {...(props as any)}
          />
        ),
        strong: ({ node: _n, ...props }) => (
          <strong className="font-bold text-gray-900 bg-red-50/80 border-b-2 border-red-200 px-1" {...props} />
        ),
        ul: ({ node: _n, ...props }) => (
          <motion.ul
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="list-none space-y-4 my-8 pl-0"
            {...(props as any)}
          />
        ),
        li: ({ node: _n, ...props }) => (
          <li className="flex items-start gap-3 text-gray-700 leading-relaxed">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            <span className="flex-1">{props.children}</span>
          </li>
        ),
        p: ({ node: _n, ...props }) => (
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 text-gray-700 leading-[1.8] text-[15px] md:text-base break-keep"
            {...(props as any)}
          />
        ),
        blockquote: ({ node: _n, ...props }) => (
          <motion.blockquote
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="border-l-4 border-red-500 bg-red-50/50 p-6 rounded-r-2xl my-10 text-gray-800 font-medium not-italic"
            {...(props as any)}
          />
        ),
        table: ({ node: _n, ...props }) => (
          <div className="overflow-x-auto my-10 rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm md:text-base" {...props} />
          </div>
        ),
        thead: ({ node: _n, ...props }) => <thead className="bg-gray-50" {...props} />,
        tbody: ({ node: _n, ...props }) => <tbody className="divide-y divide-gray-200 bg-white" {...props} />,
        tr: ({ node: _n, ...props }) => <tr className="hover:bg-gray-50 transition-colors" {...props} />,
        th: ({ node: _n, ...props }) => (
          <th className="px-6 py-4 text-left font-bold text-gray-900 tracking-wide whitespace-nowrap" {...props} />
        ),
        td: ({ node: _n, ...props }) => (
          <td className="px-6 py-4 text-gray-700 leading-relaxed break-keep" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
