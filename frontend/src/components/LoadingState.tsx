import { Loader2 } from "lucide-react";
import { AnalysisStage } from "../types/video";

const STAGE_LABELS: Record<string, string> = {
  validating: "Validating video...",
  "loading-transcript": "Loading transcript...",
  preparing: "Preparing your AI tutor...",
  ready: "Ready to learn.",
};

interface LoadingStateProps {
  stage: AnalysisStage;
}

export default function LoadingState({ stage }: LoadingStateProps) {
  const label = STAGE_LABELS[stage] ?? "Working...";

  return (
    <div
      className="mt-8 flex items-center justify-center gap-3 text-sm font-medium text-zinc-600"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" aria-hidden="true" />
      {label}
    </div>
  );
}
