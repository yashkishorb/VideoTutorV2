import { AlertCircle, Clock, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage as ChatMessageType } from "../types/chat";

interface ChatMessageProps {
  message: ChatMessageType;
}

// Assistant replies may use Markdown (bold, lists, headings, tables, code).
// User questions are rendered as plain text since they're never formatted.
const markdownComponents = {
  p: (props: any) => <p className="mb-2 last:mb-0" {...props} />,
  ul: (props: any) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0" {...props} />,
  ol: (props: any) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0" {...props} />,
  h1: (props: any) => <h3 className="mb-1.5 mt-2 text-sm font-semibold first:mt-0" {...props} />,
  h2: (props: any) => <h3 className="mb-1.5 mt-2 text-sm font-semibold first:mt-0" {...props} />,
  h3: (props: any) => <h4 className="mb-1 mt-2 text-sm font-semibold first:mt-0" {...props} />,
  strong: (props: any) => <strong className="font-semibold" {...props} />,
  code: (props: any) => (
    <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs" {...props} />
  ),
  pre: (props: any) => (
    <pre className="mb-2 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100 last:mb-0" {...props} />
  ),
  table: (props: any) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-left font-medium" {...props} />
  ),
  td: (props: any) => <td className="border border-zinc-200 px-2 py-1" {...props} />,
  a: (props: any) => (
    <a className="text-indigo-600 underline hover:text-indigo-700" target="_blank" rel="noreferrer" {...props} />
  ),
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-600 text-white"
            : message.status === "error"
            ? "border border-red-200 bg-red-50 text-red-700"
            : "border border-zinc-200 bg-white text-ink"
        }`}
      >
        {message.status === "sending" ? (
          <span className="flex items-center gap-2 text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Thinking...
          </span>
        ) : message.status === "error" ? (
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {message.content}
          </span>
        ) : isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <div className="max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && message.timestampFormatted && (
        <span className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {message.timestampFormatted}
        </span>
      )}
    </div>
  );
}
