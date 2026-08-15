import { ReactNode } from "react";

interface HeroProps {
  children: ReactNode;
}

export default function Hero({ children }: HeroProps) {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-16 pt-20 text-center sm:pt-28">
      <span className="mb-5 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
        Watch. Ask. Understand.
      </span>
      <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
        Learn anything from any YouTube video.
      </h1>
      <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-zinc-600">
        Watch the video, ask questions at any moment, and get explanations based on exactly
        what is being discussed.
      </p>
      <div className="mt-10 flex w-full justify-center">{children}</div>
    </section>
  );
}
