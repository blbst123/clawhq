"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
const mdComponents: Record<string, React.FC<any>> = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: any) => <strong className="font-semibold text-white/90">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-white/70">{children}</em>,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-400/80 hover:text-orange-400 underline underline-offset-2 decoration-orange-400/30 hover:decoration-orange-400/60 transition-colors">
      {children}
    </a>
  ),
  ul: ({ children }: any) => <ul className="list-disc list-outside ml-4 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-outside ml-4 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
  li: ({ children }: any) => <li className="text-white/70 leading-relaxed">{children}</li>,
  h1: ({ children }: any) => <h1 className="text-[16px] font-bold text-white/90 mb-2 mt-3 first:mt-0">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-[15px] font-semibold text-white/85 mb-1.5 mt-2.5 first:mt-0">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-[14px] font-semibold text-white/80 mb-1 mt-2 first:mt-0">{children}</h3>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-orange-500/30 pl-3 my-2 text-white/50 italic">{children}</blockquote>
  ),
  hr: () => <hr className="border-white/10 my-3" />,
  code: ({ className, children, ...props }: any) => {
    const isBlock = className?.includes("language-");
    const lang = className?.replace("language-", "") || "";
    if (isBlock) {
      return (
        <div className="my-2 rounded-lg overflow-hidden border border-white/[0.08] bg-black/30">
          {lang && <div className="px-3 py-1 text-[10px] text-white/25 bg-white/[0.03] border-b border-white/[0.06] font-mono">{lang}</div>}
          <pre className="px-3 py-2 overflow-x-auto">
            <code className="text-[12px] font-mono text-emerald-300/70 leading-relaxed" {...props}>{children}</code>
          </pre>
        </div>
      );
    }
    return <code className="text-[12.5px] font-mono text-orange-300/80 bg-white/[0.06] px-1.5 py-0.5 rounded-md" {...props}>{children}</code>;
  },
  pre: ({ children }: any) => <>{children}</>,
  table: ({ children }: any) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-white/[0.08]">
      <table className="w-full text-[12px]">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-white/[0.03] border-b border-white/[0.08]">{children}</thead>,
  th: ({ children }: any) => <th className="text-left px-3 py-1.5 text-white/50 font-medium">{children}</th>,
  td: ({ children }: any) => <td className="px-3 py-1.5 text-white/60 border-t border-white/[0.04]">{children}</td>,
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function MarkdownContent({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("text-[14px] leading-relaxed break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
