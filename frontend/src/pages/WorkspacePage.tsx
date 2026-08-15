import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChatPanel from "../components/ChatPanel";
import ErrorMessage from "../components/ErrorMessage";
import LoadingState from "../components/LoadingState";
import Navbar from "../components/Navbar";
import VideoPlayer from "../components/VideoPlayer";
import { useChat } from "../hooks/useChat";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";
import { analyzeVideo, ApiError } from "../services/api";
import { AnalysisStage, VideoAnalyzeResponse } from "../types/video";

const PLAYER_CONTAINER_ID = "youtube-player";

export default function WorkspacePage() {
  const { videoId: rawParam } = useParams<{ videoId: string }>();
  const navigate = useNavigate();

  const [stage, setStage] = useState<AnalysisStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<VideoAnalyzeResponse | null>(null);

  const runAnalysis = useCallback(async () => {
    if (!rawParam) return;
    const originalUrl = decodeURIComponent(rawParam);

    setErrorMessage(null);
    setVideoData(null);

    try {
      setStage("validating");
      // Brief perceptible stages -- the actual work happens in one backend
      // call, but breaking the UI into stages avoids an unexplained pause.
      setStage("loading-transcript");
      const result = await analyzeVideo(originalUrl);

      setStage("preparing");
      setVideoData(result);
      setStage("ready");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong while loading this video.";
      setErrorMessage(message);
      setStage("error");
    }
  }, [rawParam]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const { getCurrentTime } = useYouTubePlayer({
    videoId: videoData?.videoId ?? "",
    containerId: PLAYER_CONTAINER_ID,
  });

  const { messages, isSending, sendQuestion } = useChat({
    videoId: videoData?.videoId ?? "",
    videoTitle: videoData?.title,
    transcript: videoData?.transcript ?? [],
    getCurrentTime,
  });

  if (stage === "error") {
    return (
      <div className="flex min-h-screen flex-col bg-paper">
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center px-6">
          <ErrorMessage
            message={errorMessage ?? "We couldn't load this video."}
            onRetry={() => navigate("/")}
          />
        </main>
      </div>
    );
  }

  if (stage !== "ready" || !videoData) {
    return (
      <div className="flex min-h-screen flex-col bg-paper">
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center px-6">
          <LoadingState stage={stage} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
          <div className="lg:col-span-3">
            <VideoPlayer containerId={PLAYER_CONTAINER_ID} title={videoData.title} />
          </div>
          <div className="h-[70vh] lg:col-span-2 lg:h-[75vh]">
            <ChatPanel messages={messages} onSend={sendQuestion} isSending={isSending} />
          </div>
        </div>
      </main>
    </div>
  );
}
