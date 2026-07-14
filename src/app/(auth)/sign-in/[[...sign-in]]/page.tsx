import Link from "next/link";
import { Layers3 } from "lucide-react";
import { SignInForm } from "@/components/auth/SignInForm";
import { BackToHomeButton } from "@/components/auth/BackToHomeButton";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-y-auto bg-[#0f141a] p-4 py-10 text-[#dfe2eb]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(13,153,255,0.18),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%)]" />

      <BackToHomeButton />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-semibold text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
            <Layers3 className="h-4 w-4" />
          </div>
          <span>Figma Clone</span>
        </Link>
        <SignInForm />
      </div>
    </div>
  );
}
