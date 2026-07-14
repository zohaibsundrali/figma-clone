"use client";

import { useState, useEffect } from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Completes the "Continue with Google" redirect flow started from the sign-up form.
// Clerk's component finishes the OAuth exchange and creates the session, then
// navigates to the dashboard — unless the user picked a paid plan before
// starting the OAuth flow, in which case SignUpForm stashed it in
// sessionStorage (query params don't survive the OAuth round-trip) and we
// send them to checkout for it instead.
export default function SSOCallbackPage() {
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    const intendedPlan = sessionStorage.getItem("intended_plan");
    sessionStorage.removeItem("intended_plan");
    setDestination(
      intendedPlan === "professional" || intendedPlan === "organization"
        ? `/pricing?plan=${intendedPlan}`
        : "/dashboard"
    );
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f141a]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <p className="text-sm text-white/60">Finishing sign up...</p>
      </div>
      {destination && (
        <AuthenticateWithRedirectCallback
          signUpForceRedirectUrl={destination}
          signInForceRedirectUrl={destination}
          signUpUrl="/sign-up"
          signInUrl="/sign-in"
        />
      )}
    </div>
  );
}
