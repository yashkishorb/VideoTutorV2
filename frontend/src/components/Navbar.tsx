import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <GraduationCap className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          VideoTutor
        </Link>
      </div>
    </header>
  );
}
