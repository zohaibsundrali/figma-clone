"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { GoogleIcon } from "./GoogleIcon";
import { getFriendlyAuthErrorMessage } from "@/lib/clerk-errors";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm() {
  const router = useRouter();
  const { signIn } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canSubmit = EMAIL_REGEX.test(email) && password.length > 0 && !submitting;

  const handleGoogleSignIn = async () => {
    if (!signIn || googleLoading || submitting) return;
    setFormError(null);
    setGoogleLoading(true);

    const { error } = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl: "/dashboard",
      redirectCallbackUrl: `${window.location.origin}/sign-in/sso-callback`,
    });

    if (error) {
      setFormError(getFriendlyAuthErrorMessage(error));
      setGoogleLoading(false);
    }
    // On success the browser navigates away to Google — nothing further runs here.
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signIn || !canSubmit) return;

    setSubmitting(true);
    setFormError(null);

    const { error: passwordError } = await signIn.password({
      identifier: email.trim(),
      password,
    });

    if (passwordError) {
      setFormError(getFriendlyAuthErrorMessage(passwordError));
      setSubmitting(false);
      return;
    }

    console.log("[DEBUG] signIn.status after password():", signIn.status, signIn);

    if (signIn.status !== "complete") {
      setFormError(`Sign-in requires an additional step (status: ${signIn.status}), which isn't supported yet. Please contact support.`);
      setSubmitting(false);
      return;
    }

    const { error: finalizeError } = await signIn.finalize();

    if (finalizeError) {
      setFormError(getFriendlyAuthErrorMessage(finalizeError));
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-sm p-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-1 mb-4">
          <ShieldCheck className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-medium text-sky-200">Welcome back</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Sign in to your account</h1>
        <p className="text-sm text-white/65">Pick up right where you left off</p>
      </div>

      {/* Continue with Google */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || submitting}
        className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-white/15 bg-white/5 py-2.5 px-4 text-sm font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="h-4 w-4" />
        )}
        {googleLoading ? "Redirecting..." : "Continue with Google"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">Or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSignIn} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-xs font-semibold text-white/85">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={submitting}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-colors disabled:opacity-50"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-xs font-semibold text-white/85">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={submitting}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-colors disabled:opacity-50"
          />
        </div>

        {formError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3.5" role="alert">
            <p className="text-xs text-red-300 font-medium leading-relaxed">{formError}</p>
          </div>
        )}

        {/* Required mount point for Clerk's bot-protection (Smart/Invisible CAPTCHA) widget
            in custom sign-in flows: https://clerk.com/docs/guides/development/custom-flows/authentication/bot-sign-up-protection */}
        <div id="clerk-captcha" />

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold text-sm hover:from-sky-400 hover:to-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Signing in..." : "Sign In"}
          {!submitting && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
        </button>

        <p className="text-center text-xs text-white/50">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-sky-400 hover:text-sky-300 font-semibold transition-colors">
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}
