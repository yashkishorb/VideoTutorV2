import { MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { ChatMessage as ChatMessageType } from "../types/chat";
import ChatInput from "./ChatInput";
import ChatMessageItem from "./ChatMessage";

interface ChatPanelProps {
  messages: ChatMessageType[];
  onSend: (question: string) => void;
  isSending: boolean;
}

export default function ChatPanel({ messages, onSend, isSending }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">AI Tutor</h2>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-zinc-400">
            <MessageCircle className="h-6 w-6" aria-hidden="true" />
            <p>Ask a question about what's happening in the video right now.</p>
          </div>
        ) : (
          messages.map((message) => <ChatMessageItem key={message.id} message={message} />)
        )}
      </div>

      <ChatInput onSend={onSend} disabled={isSending} />
    </div>
  );
}
