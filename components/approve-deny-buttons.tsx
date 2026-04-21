"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X, Clock } from "lucide-react";

export function ApproveDenyButtons({ appId, currentStatus }: { appId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function transition(status: "managed" | "denied" | "review") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/apps/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  if (currentStatus === "managed") return <span className="text-xs text-slate-400">Approved</span>;
  if (currentStatus === "denied") {
    return (
      <div>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => transition("review")}>
          <Clock className="w-3 h-3 mr-1" /> Re-review
        </Button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
  return (
    <div>
      <div className="flex gap-2">
        <Button size="sm" disabled={loading} onClick={() => transition("managed")}>
          <Check className="w-3 h-3 mr-1" /> Approve
        </Button>
        <Button size="sm" variant="destructive" disabled={loading} onClick={() => transition("denied")}>
          <X className="w-3 h-3 mr-1" /> Deny
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
