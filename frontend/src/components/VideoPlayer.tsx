interface VideoPlayerProps {
  containerId: string;
  title?: string | null;
}

/**
 * The YouTube IFrame Player API replaces this div's contents with an
 * <iframe> once useYouTubePlayer initializes it. We never build a custom
 * player or host the video ourselves.
 */
export default function VideoPlayer({ containerId, title }: VideoPlayerProps) {
  return (
    <div className="flex h-full flex-col">
      {title && (
        <h2 className="mb-3 truncate text-sm font-medium text-zinc-600" title={title}>
          {title}
        </h2>
      )}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-sm">
        <div id={containerId} className="absolute inset-0 h-full w-full" />
      </div>
    </div>
  );
}
