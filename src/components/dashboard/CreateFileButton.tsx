"use client";

import { Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export function CreateFileButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ message: string } | null>(null);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/files", { method: "POST" });
      if (res.status === 403) {
        const data = await res.json().catch(() => null);
        setLimitInfo({ message: data?.message ?? "You've reached your plan's project limit." });
        return;
      }
      if (!res.ok) throw new Error("Failed to create file");
      const file = await res.json();
      router.push(`/editor/${file.id}`);
    } catch {
      // swallow — button just resets, no toast system in this app yet
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={handleCreate} disabled={loading}>
        <Plus className="h-4 w-4" />
        {loading ? "Creating..." : "New Design"}
      </Button>

      <Dialog
        open={!!limitInfo}
        onClose={() => setLimitInfo(null)}
        title="Project limit reached"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm text-muted">{limitInfo?.message}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLimitInfo(null)}>
              Not now
            </Button>
            <Link href="/pricing">
              <Button variant="primary" size="sm">View plans</Button>
            </Link>
          </div>
        </div>
      </Dialog>
    </>
  );
}
