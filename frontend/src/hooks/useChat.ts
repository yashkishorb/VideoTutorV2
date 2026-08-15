import { useCallback, useState } from "react";
import { askQuestion, ApiError } from "../services/api";
import { formatTimestamp } from "../services/youtube";
import { ChatMessage } from "../types/chat";
import { TranscriptSegment } from "../types/transcript";

const CONTEXT_WINDOW_SECONDS = 60;
const MAX_HISTORY_MESSAGES = 8;

function getContextWindow(transcript: TranscriptSegment[], timestamp: number): TranscriptSegment[] {
  const lower = Math.max(0, timestamp - CONTEXT_WINDOW_SECONDS);
  const upper = timestamp + CONTEXT_WINDOW_SECONDS;

  const window = transcript.filter((seg) => seg.start + seg.duration >= lower && seg.start <= upper);

  if (window.length === 0 && transcript.length > 0) {
    return [...transcript]
      .sort((a, b) => Math.abs(a.start - timestamp) - Math.abs(b.start - timestamp))
      .slice(0, 5)
      .sort((a, b) => a.start - b.start);
  }

  return window;
}

interface UseChatOptions {
  videoId: string;
  videoTitle?: string | null;
  transcript: TranscriptSegment[];
  getCurrentTime: () => number;
}

export function useChat({ videoId, videoTitle, transcript, getCurrentTime }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const sendQuestion = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isSending) return;

      // Capture the exact YouTube player time at the moment Send is
      // pressed -- not a stale value from earlier in the render cycle.
      const timestampSeconds = getCurrentTime();
      const timestampFormatted = formatTimestamp(timestampSeconds);

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestampSeconds,
        timestampFormatted,
        status: "done",
      };

      const pendingId = crypto.randomUUID();
      const pendingMessage: ChatMessage = {
        id: pendingId,
        role: "assistant",
        content: "",
        status: "sending",
      };

      setMessages((prev) => [...prev, userMessage, pendingMessage]);
      setIsSending(true);

      try {
        const context = getContextWindow(transcript, timestampSeconds);

        const history = messages
          .filter((m) => m.status === "done")
          .slice(-MAX_HISTORY_MESSAGES)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await askQuestion({
          videoId,
          timestamp: timestampSeconds,
          question: trimmed,
          videoTitle,
          transcriptContext: context,
          conversationHistory: history,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId ? { ...m, content: response.answer, status: "done" } : m
          )
        );
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
        setMessages((prev) =>
          prev.map((m) => (m.id === pendingId ? { ...m, content: message, status: "error" } : m))
        );
      } finally {
        setIsSending(false);
      }
    },
    [videoId, videoTitle, transcript, getCurrentTime, messages, isSending]
  );

  return { messages, isSending, sendQuestion };
}
