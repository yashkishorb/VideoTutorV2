import { TranscriptSegment } from "./transcript";

export interface VideoAnalyzeResponse {
  videoId: string;
  title: string | null;
  transcript: TranscriptSegment[];
  transcriptAvailable: boolean;
  transcriptLanguage: string | null;
}

export type AnalysisStage =
  | "idle"
  | "validating"
  | "loading-transcript"
  | "preparing"
  | "ready"
  | "error";
