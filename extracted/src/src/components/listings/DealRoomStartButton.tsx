"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Handshake, Loader2 } from "lucide-react";

/**
 * P2-DEAL-INSPECT-TRANSPORT — "شروع مذاکره در اتاق معامله" button.
 * POSTs to /api/deal-rooms with the listing id; on success navigates
 * the user to their freshly created (or reused) deal room.
 */
export default function DealRoomStartButton({
  listingId,
  isOwner,
}: {
  listingId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isOwner) {
    return (
      <button
        disabled
        className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-white/30"
      >
        <Handshake className="h-4 w-4" />
        این آگهی متعلق به شماست
      </button>
    );
  }

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deal-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "خطا در ایجاد اتاق معامله");
      }
      const { dealRoom } = await res.json();
      router.push(`/dashboard/deal-rooms/${dealRoom.id}`);
    } catch (e: any) {
      setError(e?.message ?? "خطا");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={start}
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#F58220]/40 bg-[#F58220]/10 text-sm font-bold text-[#F58220] transition hover:bg-[#F58220]/20 disabled:opacity-40"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Handshake className="h-4 w-4" />
        )}
        شروع مذاکره در اتاق معامله
      </button>
      {error && <p className="mt-1 text-[10px] text-rose-400">{error}</p>}
    </div>
  );
}
