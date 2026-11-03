"use client";

import { useState } from "react";
import { X, Send, Loader2, CheckCircle2 } from "lucide-react";

/* ============================================================
   OfferForm — buyer price offer modal.
   Lets a buyer submit a price offer (ListingOffer) to the seller.
   ============================================================ */

type OfferFormProps = {
  listingId: string;
  listingTitle: string;
  listingPrice: bigint | number | null;
  sellerName?: string | null;
  onClose: () => void;
};

export default function OfferForm({
  listingId,
  listingTitle,
  listingPrice,
  sellerName,
  onClose,
}: OfferFormProps) {
  const [offerAmount, setOfferAmount] = useState<string>(
    listingPrice ? String(listingPrice) : "",
  );
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!buyerPhone || buyerPhone.length < 10) {
      setError("شماره تماس معتبر وارد کنید.");
      return;
    }
    const amount = Number(offerAmount);
    if (!amount || amount <= 0) {
      setError("مبلغ پیشنهادی معتبر وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          offerAmount: amount,
          buyerName,
          buyerPhone,
          buyerEmail,
          message,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "ارسال پیشنهاد ناموفق بود.");
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? "خطا در ارسال پیشنهاد.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-white/30 hover:text-white"
          aria-label="بستن"
        >
          <X className="h-4 w-4" />
        </button>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
            <h3 className="mt-4 text-xl font-black text-white">پیشنهاد شما ثبت شد</h3>
            <p className="mt-2 text-sm text-white/55">
              فروشنده در اولین فرصت پاسخ پیشنهاد شما را خواهد داد.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white"
            >
              بستن
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F58220]">
                پیشنهاد قیمت
              </span>
              <h3 className="mt-1 text-xl font-black text-white">
                ثبت پیشنهاد خرید
              </h3>
              <p className="mt-1 text-xs text-white/55 line-clamp-1">
                {listingTitle}
              </p>
              {sellerName && (
                <p className="mt-0.5 text-[11px] text-white/40">
                  فروشنده: {sellerName}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-white/70">
                  مبلغ پیشنهادی (تومان)
                </label>
                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
                  placeholder="مثلاً ۸۵۰۰۰۰۰۰۰۰"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-white/70">
                  نام و نام خانوادگی
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
                  placeholder="نام شما"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-white/70">
                  شماره تماس <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
                  placeholder="09xxxxxxxxx"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-white/70">
                  ایمیل (اختیاری)
                </label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-white/70">
                  پیام به فروشنده
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#F58220]"
                  placeholder="توضیحات پیشنهاد خود را وارد کنید..."
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                ارسال پیشنهاد
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
