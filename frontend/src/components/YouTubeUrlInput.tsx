import { ArrowRight, Link2 } from "lucide-react";
import { FormEvent, useState } from "react";

interface YouTubeUrlInputProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
}

export default function YouTubeUrlInput({ onSubmit, disabled }: YouTubeUrlInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <label htmlFor="youtube-url" className="sr-only">
        YouTube video URL
      </label>
      <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500">
        <Link2 className="ml-2 h-5 w-5 shrink-0 text-zinc-400" aria-hidden="true" />
        <input
          id="youtube-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="Paste a YouTube video URL"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2.5 text-base text-ink placeholder:text-zinc-400 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Learning
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
