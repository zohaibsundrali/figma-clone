import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackToHomeButton() {
  return (
    <Link
      href="/"
      title="Back to home"
      className="group fixed left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur-sm transition-all hover:-translate-x-0.5 hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-300 sm:left-6 sm:top-6"
    >
      <ArrowLeft className="h-4.5 w-4.5 transition-transform group-hover:-translate-x-0.5" />
    </Link>
  );
}
