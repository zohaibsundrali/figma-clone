"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CreateFileButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/files", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create file");
      const file = await res.json();
      router.push(`/editor/${file.id}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button variant="primary" onClick={handleCreate} disabled={loading}>
      <Plus className="h-4 w-4" />
      {loading ? "Creating..." : "New Design"}
    </Button>
  );
}
