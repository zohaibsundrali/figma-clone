"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Completes the "Continue with Google" redirect flow started from the sign-in form.
export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f141a]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <p className="text-sm text-white/60">Signing you in...</p>
      </div>
      <AuthenticateWithRedirectCallback
        signUpForceRedirectUrl="/dashboard"
        signInForceRedirectUrl="/dashboard"
        signUpUrl="/sign-up"
        signInUrl="/sign-in"
      />
    </div>
  );
}
