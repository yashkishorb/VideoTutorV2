import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage";
import Hero from "../components/Hero";
import Navbar from "../components/Navbar";
import YouTubeUrlInput from "../components/YouTubeUrlInput";
import { looksLikeYouTubeUrl } from "../services/youtube";

export default function HomePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(url: string) {
    setError(null);

    if (!looksLikeYouTubeUrl(url)) {
      setError("That doesn't look like a valid YouTube URL. Please check the link and try again.");
      return;
    }

    // Full validation and transcript loading happens on the workspace page
    // so the user gets clear progress states rather than a blocked landing
    // page.
    navigate(`/watch/${encodeURIComponent(url)}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main className="flex-1">
        <Hero>
          <div className="flex w-full flex-col items-center">
            <YouTubeUrlInput onSubmit={handleSubmit} />
            {error && <ErrorMessage message={error} />}
          </div>
        </Hero>
      </main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400">
        VideoTutor -- an AI learning assistant for YouTube educational videos.
      </footer>
    </div>
  );
}
