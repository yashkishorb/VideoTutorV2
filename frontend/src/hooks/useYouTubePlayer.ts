import { useCallback, useEffect, useRef, useState } from "react";
import { loadYouTubeIframeApi } from "../services/youtube";

interface UseYouTubePlayerOptions {
  videoId: string;
  containerId: string;
}

interface UseYouTubePlayerResult {
  isReady: boolean;
  getCurrentTime: () => number;
}

/**
 * Wraps the YouTube IFrame Player API. Exposes getCurrentTime() so the chat
 * panel can capture the exact playback position the instant a question is
 * submitted -- never a stale or approximated value.
 */
export function useYouTubePlayer({ videoId, containerId }: UseYouTubePlayerOptions): UseYouTubePlayerResult {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setIsReady(false);

    loadYouTubeIframeApi().then(() => {
      if (cancelled) return;

      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            if (!cancelled) setIsReady(true);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, containerId]);

  const getCurrentTime = useCallback((): number => {
    if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
      return playerRef.current.getCurrentTime();
    }
    return 0;
  }, []);

  return { isReady, getCurrentTime };
}
