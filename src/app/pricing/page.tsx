"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";
import { PLANS, type PlanId } from "@/lib/plans";

interface SubscriptionStatus {
  plan: PlanId;
  projectsUsed: number;
  requestedPlan: PlanId | null;
  status: string;
}

const statusNotices: Record<string, string> = {
  rejected: "Your last payment screenshot wasn't approved. Please try again below, or contact support if you think this is a mistake.",
  past_due: "Your last renewal payment failed, so your account is back on Free. Upgrading again will retry payment.",
  canceled: "Your subscription was canceled and your account is back on Free.",
};

export default function PricingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [checkingOut, setCheckingOut] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/subscription")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStatus(data));
  }, [isLoaded, isSignedIn]);

  async function handleUpgrade(planId: "professional" | "organization") {
    setError(null);
    setCheckingOut(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setCheckingOut(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setCheckingOut(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-bold">Figma Clone</Link>
          <Link href={isSignedIn ? "/dashboard" : "/sign-in"} className="text-sm text-muted hover:text-foreground">
            {isSignedIn ? "Back to dashboard" : "Log in"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Plans that scale with you</h1>
          <p className="mt-3 text-sm text-muted">
            Start free. Upgrade whenever you outgrow your project limit.
          </p>
        </div>

        {error && (
          <div className="mx-auto mt-8 max-w-md rounded-lg border border-red-600/30 bg-red-600/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {!error && status && !status.requestedPlan && statusNotices[status.status] && (
          <div className="mx-auto mt-8 max-w-md rounded-lg border border-red-600/30 bg-red-600/10 px-4 py-3 text-center text-sm text-red-400">
            {statusNotices[status.status]}
          </div>
        )}

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {(Object.values(PLANS)).map((plan) => {
            const isCurrent = status?.plan === plan.id;
            const isPending = status?.requestedPlan === plan.id;
            const isPaid = plan.id !== "free";

            return (
              <div
                key={plan.id}
                id={plan.id}
                className={`flex flex-col rounded-xl border p-6 ${
                  plan.id === "professional"
                    ? "border-accent bg-accent/5"
                    : "border-border bg-surface-elevated/40"
                }`}
              >
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-3xl font-bold">{plan.priceLabel}</span>
                  <span className="pb-1 text-xs text-muted">{plan.priceSubtitle}</span>
                </div>
                <p className="mt-2 text-xs text-muted">{plan.description}</p>

                <ul className="mt-5 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                      <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {!isSignedIn ? (
                    <Link href="/sign-up">
                      <Button variant={plan.id === "professional" ? "primary" : "secondary"} className="w-full">
                        Get started
                      </Button>
                    </Link>
                  ) : isCurrent ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : isPending ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Awaiting review
                    </Button>
                  ) : isPaid ? (
                    <Button
                      variant={plan.id === "professional" ? "primary" : "secondary"}
                      className="w-full"
                      disabled={checkingOut !== null}
                      onClick={() => handleUpgrade(plan.id as "professional" | "organization")}
                    >
                      {checkingOut === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </Button>
                  ) : (
                    <Button variant="secondary" className="w-full" disabled>
                      Included
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted">
          After payment you&apos;ll upload a screenshot for verification. Your plan activates once
          it&apos;s reviewed, usually within a day. Subscriptions renew monthly — if a payment
          fails or is canceled, your account reverts to Free.
        </p>
      </main>
    </div>
  );
}
