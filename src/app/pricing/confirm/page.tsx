"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getPlan } from "@/lib/plans";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB, same limit as image-to-canvas uploads elsewhere

function ConfirmForm() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const planId = params.get("plan") === "organization" ? "organization" : "professional";
  const plan = getPlan(planId);

  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Screenshot is too large. Please upload an image under 3MB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!sessionId) {
      setError("Missing checkout session — please restart from the pricing page.");
      return;
    }
    if (!preview) {
      setError("Please upload a payment screenshot first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripeSessionId: sessionId,
          plan: plan.id,
          screenshotDataUrl: preview,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-lg px-6 py-16">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
          <h1 className="mt-4 text-2xl font-bold">Payment received</h1>
          <p className="mt-2 text-sm text-muted">
            One last step — upload proof of your {plan.name} payment so we can verify and activate
            your plan.
          </p>
        </div>

        <div className="mt-8 space-y-4 rounded-xl border border-border bg-surface-elevated/40 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">Payment screenshot</label>
            <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface text-muted hover:border-accent/60 hover:text-foreground">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local data URL preview, not a remote image
                <img src={preview} alt="Payment screenshot preview" className="h-full w-full rounded-lg object-contain p-2" />
              ) : (
                <>
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-xs">Click to upload a screenshot</span>
                </>
              )}
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              Transaction reference (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. transaction ID, bank reference"
              className="h-20 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for review"}
          </Button>

          <p className="text-center text-[11px] text-muted">
            Your {plan.name} plan activates once an admin reviews this submission — usually within
            a day.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmForm />
    </Suspense>
  );
}
