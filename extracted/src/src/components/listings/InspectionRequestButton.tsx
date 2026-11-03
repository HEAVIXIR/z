"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Loader2, CheckCircle2 } from "lucide-react";

/**
 * P2-DEAL-INSPECT-TRANSPORT — "درخواست کارشناسی" button.
 * POSTs to /api/inspections; on success shows a confirmation state.
 */
export default function InspectionRequestButton({
  listingId,
  dealRoomId,
}: {
  listingId: string;
  dealRoomId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          dealRoomId: dealRoomId ?? undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "خطا در ثبت درخواست کارشناسی");
      }
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? "خطا");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <button
        onClick={() => router.push("/dashboard")}
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        درخواست ثبت شد ✓
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={request}
        disabled={loading}
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-xs font-bold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-40"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Wrench className="h-3.5 w-3.5" />
        )}
        درخواست کارشناسی
      </button>
      {error && <p className="mt-1 text-[10px] text-rose-400">{error}</p>}
    </div>
  );
}
