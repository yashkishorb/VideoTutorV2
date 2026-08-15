export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestampSeconds?: number;
  timestampFormatted?: string;
  status?: "sending" | "error" | "done";
}
