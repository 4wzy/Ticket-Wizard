"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

// Helper function to fix common markdown formatting issues from AI responses
const preprocessMarkdown = (content: string): string => {
  // Safety check: if content is undefined, null, or not a string, return empty string
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  let processedContent = content;
  
  // Fix list items that are concatenated without newlines
  // Handle asterisk lists (e.g., "* Item 1 * Item 2" -> "* Item 1\n* Item 2")
  processedContent = processedContent.replace(/(\*\s+[^*\n]+?)(?=\s+\*\s+)/g, '$1\n');
  
  // Handle numbered lists (e.g., "1. Item 1 2. Item 2" -> "1. Item 1\n2. Item 2") 
  processedContent = processedContent.replace(/(\d+\.\s+[^0-9\n]+?)(?=\s+\d+\.\s+)/g, '$1\n');
  
  // Handle dash lists (e.g., "- Item 1 - Item 2" -> "- Item 1\n- Item 2")
  processedContent = processedContent.replace(/(-\s+[^-\n]+?)(?=\s+-\s+)/g, '$1\n');
  
  // Handle plus lists (e.g., "+ Item 1 + Item 2" -> "+ Item 1\n+ Item 2")
  processedContent = processedContent.replace(/(\+\s+[^+\n]+?)(?=\s+\+\s+)/g, '$1\n');
  
  // Fix headers that are run together (ensure newlines before headers)
  processedContent = processedContent.replace(/([^#\n])(#+\s+)/g, '$1\n$2');
  
  // Ensure proper spacing around blockquotes
  processedContent = processedContent.replace(/([^>\n])(>\s+)/g, '$1\n$2');
  
  // Fix code blocks without proper newlines
  processedContent = processedContent.replace(/([^`\n])(`{3})/g, '$1\n$2');
  processedContent = processedContent.replace(/(`{3})([^`\n])/g, '$1\n$2');
  
  // Clean up excessive whitespace but preserve intentional formatting
  processedContent = processedContent.replace(/[ \t]{2,}/g, ' ');
  
  // Remove excessive newlines (more than 2 consecutive)
  processedContent = processedContent.replace(/\n{3,}/g, '\n\n');
  
  return processedContent;
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  children, 
  className = '' 
}) => {
  const processedContent = preprocessMarkdown(children);
  
  return (
    <div className={`markdown-content max-w-full overflow-hidden ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      components={{
        // Customize code blocks with syntax highlighting
        code: ({ inline, children, ...props }) => {
          return inline ? (
            <code
              className="px-1.5 py-0.5 bg-neutral-800/60 text-purple-300 rounded text-sm font-mono break-all"
              {...props}
            >
              {children}
            </code>
          ) : (
            <pre className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-4 overflow-x-auto my-3 max-w-full">
              <code
                className="text-sm font-mono text-neutral-200 block whitespace-pre-wrap break-words"
                {...props}
              >
                {children}
              </code>
            </pre>
          );
        },
        // Style blockquotes
        blockquote: ({ children, ...props }) => (
          <blockquote
            className="border-l-4 border-purple-500/50 pl-4 py-2 my-3 bg-purple-900/10 italic text-purple-100"
            {...props}
          >
            {children}
          </blockquote>
        ),
        // Style headers
        h1: ({ children, ...props }) => (
          <h1 className="text-xl font-bold text-neutral-100 mt-4 mb-2" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }) => (
          <h2 className="text-lg font-semibold text-neutral-100 mt-3 mb-2" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="text-base font-medium text-neutral-200 mt-2 mb-1" {...props}>
            {children}
          </h3>
        ),
        // Style lists
        ul: ({ children, ...props }) => (
          <ul className="list-disc list-inside space-y-1 my-2 ml-4 text-neutral-200" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="list-decimal list-inside space-y-1 my-2 ml-4 text-neutral-200" {...props}>
            {children}
          </ol>
        ),
        li: ({ children, ...props }) => (
          <li className="text-neutral-200" {...props}>
            {children}
          </li>
        ),
        // Style links
        a: ({ children, href, ...props }) => (
          <a
            href={href}
            className="text-purple-400 hover:text-purple-300 underline transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        ),
        // Style tables
        table: ({ children, ...props }) => (
          <div className="overflow-x-auto my-3 max-w-full">
            <table className="w-full border border-neutral-700 rounded-lg table-fixed" {...props}>
              {children}
            </table>
          </div>
        ),
        thead: ({ children, ...props }) => (
          <thead className="bg-neutral-800/50" {...props}>
            {children}
          </thead>
        ),
        th: ({ children, ...props }) => (
          <th className="px-3 py-2 text-left text-neutral-200 font-medium border-b border-neutral-700 break-words" {...props}>
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td className="px-3 py-2 text-neutral-300 border-b border-neutral-700/50 break-words" {...props}>
            {children}
          </td>
        ),
        // Style horizontal rules
        hr: ({ ...props }) => (
          <hr className="border-neutral-700 my-4" {...props} />
        ),
        // Style paragraphs
        p: ({ children, ...props }) => (
          <p className="text-neutral-200 leading-relaxed my-2" {...props}>
            {children}
          </p>
        ),
        // Style emphasis
        em: ({ children, ...props }) => (
          <em className="text-purple-300 italic" {...props}>
            {children}
          </em>
        ),
        strong: ({ children, ...props }) => (
          <strong className="text-neutral-100 font-semibold" {...props}>
            {children}
          </strong>
        ),
      }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;