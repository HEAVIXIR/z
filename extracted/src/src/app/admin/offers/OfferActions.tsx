"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Repeat, Loader2, X } from "lucide-react";
import { formatCompactPrice } from "@/lib/format";

/* ============================================================
   OfferActions — accept / reject / counter buttons for a single
   ListingOffer row on /admin/offers.

   FIX-ADMIN-EDITABILITY — the existing PATCH /api/offers/[id]
   endpoint now allows admins to act on any offer. The "counter"
   action opens a tiny inline prompt for the counter amount.
   ============================================================ */

type Offer = {
  id: string;
  offerAmount: string | null;
  status: string;
  listing: { title: string | null };
};

export default function OfferActions({
  offer,
  onChanged,
}: {
  offer: Offer;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  // FIX-ADMIN-EDITABILITY — optimistic status mirror so the buttons
  // disable themselves immediately after a successful action.
  const [currentStatus, setCurrentStatus] = useState(offer.status);

  const patch = async (action: "accept" | "reject" | "counter", extra?: Record<string, unknown>) => {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "خطا در به‌روزرسانی.");
        setBusy(null);
        return;
      }
      if (json.offer?.status) setCurrentStatus(json.offer.status);
      setBusy(null);
      setCounterOpen(false);
      setCounterAmount("");
      // Refresh server-rendered table data + optional parent callback.
      router.refresh();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message || "خطای شبکه.");
      setBusy(null);
    }
  };

  const isTerminal =
    currentStatus === "ACCEPTED" ||
    currentStatus === "REJECTED" ||
    currentStatus === "COUNTERED";

  return (
    <div className="flex flex-col items-stretch gap-1">
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          disabled={busy !== null || isTerminal}
          onClick={() => patch("accept")}
          className="flex h-7 items-center gap-1 rounded-lg bg-emerald-50 px-2 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
          title="پذیرفتن پیشنهاد"
        >
          {busy === "accept" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )}
          پذیرفتن
        </button>
        <button
          type="button"
          disabled={busy !== null || isTerminal}
          onClick={() => patch("reject")}
          className="flex h-7 items-center gap-1 rounded-lg bg-red-50 px-2 text-[11px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-40"
          title="رد کردن پیشنهاد"
        >
          {busy === "reject" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          رد
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => setCounterOpen((v) => !v)}
          className="flex h-7 items-center gap-1 rounded-lg bg-amber-50 px-2 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-40"
          title="ثبت پیشنهاد متقابل"
        >
          <Repeat className="h-3 w-3" />
          پیشنهاد متقابل
        </button>
      </div>

      {counterOpen && (
        <div className="mt-1 flex flex-wrap items-center gap-1 rounded-lg border border-amber-200 bg-amber-50/60 p-1.5">
          <input
            dir="ltr"
            inputMode="numeric"
            value={counterAmount}
            onChange={(e) =>
              setCounterAmount(e.target.value.replace(/[^\d]/g, ""))
            }
            placeholder="مبلغ پیشنهاد متقابل (تومان)"
            className="h-7 min-w-[150px] flex-1 rounded-md border border-amber-200 bg-white px-2 text-[11px] text-zinc-800 outline-none focus:border-amber-500"
          />
          {counterAmount && (
            <span className="text-[10px] text-amber-700">
              {formatCompactPrice(BigInt(counterAmount))}
            </span>
          )}
          <button
            type="button"
            disabled={busy !== null || !counterAmount}
            onClick={() =>
              patch("counter", { counterAmount })
            }
            className="flex h-7 items-center gap-1 rounded-md bg-amber-500 px-2 text-[11px] font-bold text-white transition hover:bg-amber-600 disabled:opacity-40"
          >
            {busy === "counter" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            ثبت
          </button>
          <button
            type="button"
            onClick={() => {
              setCounterOpen(false);
              setCounterAmount("");
              setError(null);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-amber-700 hover:bg-amber-100"
            aria-label="بستن"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-1 rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
