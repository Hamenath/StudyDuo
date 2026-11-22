import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  BookMarked,
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Sparkles,
  Zap,
} from 'lucide-react';
import type {
  BujjiRouteDecision,
  MathVerificationResult,
  RetrievedSource,
} from '../../types/bujji';

interface BujjiResponseRendererProps {
  content: string;
  isStreaming?: boolean;
  route?: BujjiRouteDecision;
  sources?: RetrievedSource[];
  mathCheck?: MathVerificationResult | null;
  followUps?: string[];
  cacheHit?: boolean;
  firstTokenMs?: number;
  totalMs?: number;
  onSelectFollowUp?: (question: string) => void;
}

function isSafeExternalHref(href?: string): boolean {
  if (!href) return false;
  try {
    const parsed = new URL(href);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

const CodeBlock: React.FC<{ language?: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be restricted in sandboxed iframes
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-[#E6E0F5] bg-[#1E1D2B] text-[#F5F3FF]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#272538] px-3.5 py-2 text-[11px]">
        <span className="font-mono font-semibold uppercase tracking-wider text-[#C6B8FF]">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
        >
          {copied ? <Check className="h-3 w-3 text-[#6FE3A0]" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-xs sm:text-[13px] leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const BujjiResponseRenderer: React.FC<BujjiResponseRendererProps> = ({
  content,
  isStreaming = false,
  route,
  sources = [],
  mathCheck,
  followUps = [],
  cacheHit = false,
  firstTokenMs,
  totalMs,
  onSelectFollowUp,
}) => {
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [showMathSteps, setShowMathSteps] = useState(false);

  // Strip incomplete FOLLOW_UPS tail while streaming so user never sees raw delimiter lines
  const displayContent = content.replace(/\n?FOLLOW_UPS:[\s\S]*$/i, '').trim();

  return (
    <div className="space-y-3 min-w-0">
      {/* Deterministic Math Verification Banner */}
      {mathCheck && (
        <div className="rounded-2xl border border-[#C6EBD5] bg-[#E2F5E9] px-3.5 py-2.5 text-xs text-[#194D30]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Calculator className="h-4 w-4 text-[#1F874D] shrink-0" />
              <span className="font-extrabold">Verified Calculation:</span>
              <span className="font-mono font-bold text-[#145C33] break-words">
                {mathCheck.expression}{' '}
                {mathCheck.expression.includes('=') || mathCheck.expression.includes('→')
                  ? '⇒'
                  : '='}{' '}
                {mathCheck.verifiedAnswer}
              </span>
            </div>
            {mathCheck.steps.length > 0 && (
              <button
                type="button"
                onClick={() => setShowMathSteps((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-bold text-[#1F874D] hover:bg-white cursor-pointer"
              >
                {showMathSteps ? 'Hide steps' : 'Check steps'}
                {showMathSteps ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>
          {showMathSteps && mathCheck.steps.length > 0 && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[11px] text-[#1D5436]">
              {mathCheck.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Structured Markdown + KaTeX Content */}
      <div className="bujji-markdown text-sm text-[#20202A] leading-relaxed break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h1: ({ children }) => (
              <h2 className="mt-4 mb-2 font-display text-lg font-black text-[#20202A] first:mt-0">
                {children}
              </h2>
            ),
            h2: ({ children }) => (
              <h3 className="mt-4 mb-1.5 font-display text-base font-extrabold text-[#20202A] first:mt-0">
                {children}
              </h3>
            ),
            h3: ({ children }) => (
              <h4 className="mt-3 mb-1 font-display text-sm font-extrabold text-[#7651E8] first:mt-0">
                {children}
              </h4>
            ),
            p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
            strong: ({ children }) => (
              <strong className="font-extrabold text-[#191825]">{children}</strong>
            ),
            ul: ({ children }) => (
              <ul className="my-2 list-disc space-y-1.5 pl-5 marker:text-[#7651E8]">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="my-2 list-decimal space-y-1.5 pl-5 marker:font-bold marker:text-[#7651E8]">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="my-3 rounded-r-2xl border-l-4 border-[#7651E8] bg-[#F8F5FF] px-3.5 py-2.5 text-[#3F3D56]">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="my-3 border-[#F0EDF5]" />,
            a: ({ href, children }) =>
              isSafeExternalHref(href) ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#7651E8] underline decoration-[#C5B3FA] underline-offset-2 hover:text-[#5B38C8]"
                >
                  {children}
                </a>
              ) : (
                <span className="font-semibold text-[#7651E8]">{children}</span>
              ),
            table: ({ children }) => (
              <div className="my-3 overflow-x-auto rounded-2xl border border-[#F0EDF5]">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-[#F8F5FF] text-[#20202A] font-bold">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="border-b border-[#E9DFFF] px-3 py-2 font-extrabold">{children}</th>
            ),
            td: ({ children }) => (
              <td className="border-b border-[#F0EDF5] px-3 py-2 align-top">{children}</td>
            ),
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              const text = String(children ?? '').replace(/\n$/, '');
              const isBlock = Boolean(match) || text.includes('\n');
              if (isBlock) {
                return <CodeBlock language={match?.[1]} code={text} />;
              }
              return (
                <code
                  className="rounded-md bg-[#F3EEFF] px-1.5 py-0.5 font-mono text-[12px] font-semibold text-[#5C38C9]"
                  {...props}
                >
                  {children}
                </code>
              );
            },
          }}
        >
          {displayContent || (isStreaming ? 'Thinking...' : '')}
        </ReactMarkdown>

        {isStreaming && (
          <span
            aria-label="Streaming response"
            className="inline-block ml-1 h-4 w-1.5 rounded-full bg-[#7651E8] animate-pulse align-middle"
          />
        )}
      </div>

      {/* Grounded Uploaded Curriculum Sources */}
      {sources.length > 0 && (
        <div className="pt-2 border-t border-[#F0EDF5] space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#7651E8]">
            <BookMarked className="h-3.5 w-3.5" />
            Grounded Study Sources ({sources.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((src, idx) => {
              const isOpen = expandedSourceId === src.chunkId;
              return (
                <button
                  key={src.chunkId}
                  type="button"
                  onClick={() => setExpandedSourceId(isOpen ? null : src.chunkId)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                    isOpen
                      ? 'border-[#7651E8] bg-[#E9DFFF] text-[#5633C2]'
                      : 'border-[#E9DFFF] bg-[#F8F5FF] text-[#4C4B5C] hover:bg-[#E9DFFF]/70'
                  }`}
                >
                  <span className="font-mono text-[#7651E8]">[{idx + 1}]</span>
                  <span className="max-w-[180px] truncate">{src.docTitle}</span>
                  {src.chapter && (
                    <span className="text-[#777783] hidden sm:inline">· {src.chapter}</span>
                  )}
                  <span className="rounded-full bg-white px-1.5 py-0.2 text-[10px] font-mono text-[#1F874D]">
                    {Math.round(src.score * 100)}%
                  </span>
                </button>
              );
            })}
          </div>
          {expandedSourceId && (
            <div className="rounded-2xl border border-[#E9DFFF] bg-[#FAF8FF] p-3 text-xs text-[#3C3B4D] leading-relaxed">
              {(() => {
                const active = sources.find((s) => s.chunkId === expandedSourceId);
                if (!active) return null;
                return (
                  <>
                    <p className="font-extrabold text-[#20202A] mb-1">
                      {active.docTitle}
                      {active.chapter ? ` — ${active.chapter}` : ''} ({active.subject})
                    </p>
                    <p className="whitespace-pre-wrap">{active.excerpt}</p>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Contextual Follow-Up Suggestions */}
      {!isStreaming && followUps.length > 0 && onSelectFollowUp && (
        <div className="pt-2 border-t border-[#F0EDF5] space-y-1.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#777783]">
            Continue learning
          </p>
          <div className="flex flex-wrap gap-1.5">
            {followUps.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onSelectFollowUp(q)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-[#E9DFFF] bg-[#F8F5FF] px-3 py-1.5 text-left text-xs font-semibold text-[#47338C] hover:bg-[#E9DFFF] transition-colors cursor-pointer"
              >
                <Sparkles className="h-3 w-3 shrink-0 text-[#7651E8]" />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Compact Route & Speed Footer */}
      {route && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-[#777783]">
          <span className="rounded-full bg-[#F8F5FF] border border-[#F0EDF5] px-2.5 py-0.5 font-semibold text-[#5C5C6C]">
            {route.subject}
          </span>
          <span className="rounded-full bg-[#F8F5FF] border border-[#F0EDF5] px-2.5 py-0.5 font-semibold text-[#5C5C6C] capitalize">
            {route.intent.replace(/_/g, ' ')}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF0C9]/70 px-2.5 py-0.5 font-bold text-[#8A5A00]">
            <Zap className="h-3 w-3" />
            {cacheHit
              ? 'Instant Cache'
              : route.model === 'gemini-3.1-flash-lite'
              ? 'Fast Route'
              : 'Reasoning Route'}
          </span>
          {typeof firstTokenMs === 'number' && firstTokenMs > 0 && (
            <span className="font-mono text-[10px] text-[#8E8D9E] tabular-nums">
              TTFT {firstTokenMs}ms{totalMs ? ` · Total ${(totalMs / 1000).toFixed(1)}s` : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
