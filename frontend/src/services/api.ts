import { TranscriptSegment } from "../types/transcript";
import { VideoAnalyzeResponse } from "../types/video";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiError("Network error -- please check your connection and try again.", 0);
  }

  if (!response.ok) {
    let detail = "Something went wrong.";
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // response wasn't JSON -- keep the generic message
    }
    throw new ApiError(detail, response.status);
  }

  return response.json() as Promise<T>;
}

export function analyzeVideo(youtubeUrl: string): Promise<VideoAnalyzeResponse> {
  return request<VideoAnalyzeResponse>("/api/video/analyze", {
    method: "POST",
    body: JSON.stringify({ youtubeUrl }),
  });
}

export interface ChatRequestPayload {
  videoId: string;
  timestamp: number;
  question: string;
  videoTitle?: string | null;
  transcriptContext: TranscriptSegment[];
  conversationHistory: { role: "user" | "assistant"; content: string }[];
}

export interface ChatResponsePayload {
  answer: string;
  timestamp: number;
  timestampFormatted: string;
}

export function askQuestion(payload: ChatRequestPayload): Promise<ChatResponsePayload> {
  return request<ChatResponsePayload>("/api/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
