"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getPlan } from "@/lib/plans";

interface Submission {
  id: string;
  userId: string;
  plan: string;
  screenshotUrl: string | null;
  transactionNote: string | null;
  stripeSubscriptionId: string | null;
  updatedAt: string;
}

export function AdminPaymentsClient() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/subscriptions");
    if (res.ok) setSubmissions(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide(id: string, action: "approve" | "reject") {
    setActingOn(id);
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">Pending payment reviews</h1>
        <p className="mt-1 text-sm text-muted">
          Approve activates the plan immediately; reject leaves the account on Free.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-muted">Loading…</p>
        ) : submissions.length === 0 ? (
          <p className="mt-8 text-sm text-muted">No submissions waiting for review.</p>
        ) : (
          <div className="mt-8 space-y-4">
            {submissions.map((sub) => {
              const plan = getPlan(sub.plan);
              return (
                <div key={sub.id} className="flex gap-4 rounded-xl border border-border bg-surface-elevated/40 p-4">
                  {sub.screenshotUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not a remote image
                    <img
                      src={sub.screenshotUrl}
                      alt="Payment screenshot"
                      className="h-32 w-32 shrink-0 rounded-lg border border-border object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {plan.name} — {plan.priceLabel}{plan.priceSubtitle}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted">User: {sub.userId}</p>
                    {sub.stripeSubscriptionId && (
                      <p className="truncate text-xs text-muted">Stripe sub: {sub.stripeSubscriptionId}</p>
                    )}
                    {sub.transactionNote && (
                      <p className="mt-2 text-xs text-foreground">&ldquo;{sub.transactionNote}&rdquo;</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={actingOn === sub.id}
                        onClick={() => decide(sub.id, "approve")}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={actingOn === sub.id}
                        onClick={() => decide(sub.id, "reject")}
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
