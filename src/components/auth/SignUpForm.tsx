"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignUp } from "@clerk/nextjs";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { PasswordInput } from "./PasswordInput";
import { GoogleIcon } from "./GoogleIcon";
import { validatePassword, type PasswordValidation } from "@/lib/password-validation";
import { getFriendlyAuthErrorMessage } from "@/lib/clerk-errors";

type Step = "form" | "verify";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignUpForm() {
  const router = useRouter();
  const { signUp } = useSignUp();

  const [step, setStep] = useState<Step>("form");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>(() => validatePassword(""));

  // Verification
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const handlePasswordValidationChange = useCallback((validation: PasswordValidation) => {
    setPasswordValidation(validation);
  }, []);

  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === password;
  const isEmailValid = email.length === 0 || EMAIL_REGEX.test(email);

  const canSubmit = useMemo(
    () =>
      fullName.trim().length > 0 &&
      EMAIL_REGEX.test(email) &&
      passwordValidation.isValid &&
      password.length > 0 &&
      password === confirmPassword &&
      !submitting,
    [fullName, email, passwordValidation.isValid, password, confirmPassword, submitting]
  );

  const startResendCooldown = () => {
    setResendCooldown(30);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleGoogleSignUp = async () => {
    if (!signUp || googleLoading || submitting) return;
    setFormError(null);
    setGoogleLoading(true);

    const { error } = await signUp.sso({
      strategy: "oauth_google",
      redirectUrl: "/dashboard",
      redirectCallbackUrl: `${window.location.origin}/sign-up/sso-callback`,
    });

    if (error) {
      setFormError(getFriendlyAuthErrorMessage(error));
      setGoogleLoading(false);
    }
    // On success the browser navigates away to Google — nothing further runs here.
  };

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signUp || !canSubmit) return;

    setSubmitting(true);
    setFormError(null);

    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    const lastName = rest.join(" ") || undefined;

    const { error: passwordError } = await signUp.password({
      emailAddress: email.trim(),
      password,
      firstName,
      lastName,
    });

    if (passwordError) {
      setFormError(getFriendlyAuthErrorMessage(passwordError));
      setSubmitting(false);
      return;
    }

    const { error: sendCodeError } = await signUp.verifications.sendEmailCode();

    if (sendCodeError) {
      setFormError(getFriendlyAuthErrorMessage(sendCodeError));
      setSubmitting(false);
      return;
    }

    startResendCooldown();
    setSubmitting(false);
    setStep("verify");
  };

  const handleResendCode = async () => {
    if (!signUp || resendCooldown > 0) return;
    setCodeError(null);
    const { error } = await signUp.verifications.sendEmailCode();
    if (error) {
      setCodeError(getFriendlyAuthErrorMessage(error));
      return;
    }
    startResendCooldown();
  };

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signUp || verifying || code.trim().length === 0) return;

    setVerifying(true);
    setCodeError(null);

    const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: code.trim() });

    if (verifyError) {
      setCodeError(getFriendlyAuthErrorMessage(verifyError));
      setVerifying(false);
      return;
    }

    const { error: finalizeError } = await signUp.finalize();

    if (finalizeError) {
      setCodeError(getFriendlyAuthErrorMessage(finalizeError));
      setVerifying(false);
      return;
    }

    // Successful verification + account creation — always land on the dashboard, never sign-in.
    router.push("/dashboard");
  };

  if (step === "verify") {
    return (
      <div className="space-y-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-sm p-8">
        <div>
          <button
            type="button"
            onClick={() => setStep("form")}
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/85 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="inline-flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-1 mb-4">
            <ShieldCheck className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-medium text-sky-200">Verify your email</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Check your inbox</h1>
          <p className="text-sm text-white/65">
            We sent a 6-digit verification code to <span className="text-white/90 font-medium">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="otp-code" className="block text-xs font-semibold text-white/85">
              Verification code
            </label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setCodeError(null);
              }}
              placeholder="000000"
              maxLength={6}
              disabled={verifying}
              aria-invalid={!!codeError}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-center text-lg tracking-[0.5em] text-white placeholder:text-white/20 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-colors disabled:opacity-50"
            />
          </div>

          {codeError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3" role="alert">
              <p className="text-xs text-red-300 font-medium">{codeError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={verifying || code.trim().length !== 6}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold text-sm hover:from-sky-400 hover:to-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
            {verifying ? "Verifying..." : "Verify & Create Account"}
          </button>

          <button
            type="button"
            onClick={handleResendCode}
            disabled={resendCooldown > 0}
            className="w-full text-center text-xs text-sky-400 hover:text-sky-300 disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't get a code? Resend"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-sm p-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-1 mb-4">
          <ShieldCheck className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-medium text-sky-200">Secure Signup</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
        <p className="text-sm text-white/65">Start designing with your team in minutes</p>
      </div>

      {/* Continue with Google */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
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

      <form onSubmit={handleCreateAccount} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-2">
          <label htmlFor="fullName" className="block text-xs font-semibold text-white/85">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            autoComplete="name"
            disabled={submitting}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-colors disabled:opacity-50"
          />
        </div>

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
            aria-invalid={!isEmailValid}
            className={`w-full rounded-lg border ${
              isEmailValid ? "border-white/10" : "border-red-500/50"
            } bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-colors disabled:opacity-50`}
          />
          {!isEmailValid && (
            <p className="text-xs font-medium text-red-400">Please enter a valid email address</p>
          )}
        </div>

        {/* Password with live validation */}
        <PasswordInput
          value={password}
          onChange={setPassword}
          onValidationChange={handlePasswordValidationChange}
          placeholder="Create a strong password"
          disabled={submitting}
        />

        {/* Confirm Password */}
        <PasswordInput
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Re-enter your password"
          label="Confirm Password"
          autoComplete="new-password"
          disabled={submitting}
          showRequirements={false}
          error={!passwordsMatch ? "Passwords do not match" : undefined}
        />

        {formError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3.5" role="alert">
            <p className="text-xs text-red-300 font-medium leading-relaxed">{formError}</p>
          </div>
        )}

        {/* Required mount point for Clerk's bot-protection (Smart/Invisible CAPTCHA) widget
            in custom sign-up flows: https://clerk.com/docs/guides/development/custom-flows/authentication/bot-sign-up-protection */}
        <div id="clerk-captcha" />

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold text-sm hover:from-sky-400 hover:to-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Creating Account..." : "Create Account"}
          {!submitting && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
        </button>

        <p className="text-center text-xs text-white/50">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-sky-400 hover:text-sky-300 font-semibold transition-colors">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
