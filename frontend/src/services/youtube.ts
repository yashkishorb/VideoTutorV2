const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/** Lightweight client-side sanity check before hitting the backend. Final
 * validation always happens server-side. */
export function looksLikeYouTubeUrl(input: string): boolean {
  const value = input.trim();
  if (!value) return false;
  if (VIDEO_ID_RE.test(value)) return true;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
    return ["youtube.com", "youtu.be", "music.youtube.com", "youtube-nocookie.com"].includes(host);
  } catch {
    return false;
  }
}

export function formatTimestamp(totalSecondsInput: number): string {
  const totalSeconds = Math.max(0, Math.round(totalSecondsInput));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

let apiLoadPromise: Promise<void> | null = null;

/** Loads the YouTube IFrame Player API script exactly once. */
export function loadYouTubeIframeApi(): Promise<void> {
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };

    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });

  return apiLoadPromise;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}
