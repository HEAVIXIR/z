"use client";

import { useState } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

/* ============================================================
   RFQQuoteForm — client form to submit a quote on an RFQ.
   POSTs to /api/rfq/[id]/quotes
   ============================================================ */

type Props = { rfqId: string; canQuote: boolean };

const INPUT_CLS =
  "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#F58220] focus:bg-white/10";
const TEXTAREA_CLS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#F58220] focus:bg-white/10";

const onlyDigits = (v: string) => v.replace(/[^\d]/g, "");

export default function RFQQuoteForm({ rfqId, canQuote }: Props) {
  const [form, setForm] = useState({
    sellerName: "",
    sellerPhone: "",
    sellerEmail: "",
    unitPrice: "",
    totalPrice: "",
    deliveryTime: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.sellerName.trim()) {
      setError("نام فروشنده الزامی است");
      return;
    }
    if (!form.sellerPhone.trim()) {
      setError("شماره تماس الزامی است");
      return;
    }
    if (!form.unitPrice.trim() || !form.totalPrice.trim()) {
      setError("قیمت واحد و قیمت کل را وارد کنید");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rfq/${rfqId}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerName: form.sellerName.trim(),
          sellerPhone: form.sellerPhone.trim(),
          sellerEmail: form.sellerEmail.trim() || undefined,
          unitPrice: onlyDigits(form.unitPrice),
          totalPrice: onlyDigits(form.totalPrice),
          deliveryTime: form.deliveryTime.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "ارسال پیشنهاد ناموفق بود");
      }
      setSuccess(true);
      setForm({
        sellerName: "",
        sellerPhone: "",
        sellerEmail: "",
        unitPrice: "",
        totalPrice: "",
        deliveryTime: "",
        notes: "",
      });
      // Refresh to show the new quote in the list.
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setError(err?.message ?? "خطای سرور");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canQuote) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5 text-center">
        <p className="text-sm font-bold text-amber-300">
          این درخواست در حال حاضر پیشنهاد جدیدی نمی‌پذیرد.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
        <p className="text-sm font-bold text-emerald-300">
          پیشنهاد شما با موفقیت ثبت شد. در حال بازخوانی صفحه...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-white/10 bg-[#111] p-5"
    >
      <h3 className="text-sm font-black text-[#F58220]">ارسال پیشنهاد قیمت</h3>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-2.5 text-xs font-bold text-red-400">
          ⚠ {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-white/60">
            نام فروشنده *
          </label>
          <input
            value={form.sellerName}
            onChange={(e) => set("sellerName", e.target.value)}
            className={INPUT_CLS}
            placeholder="نام شما یا شرکت"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-white/60">
            شماره تماس *
          </label>
          <input
            value={form.sellerPhone}
            onChange={(e) => set("sellerPhone", onlyDigits(e.target.value))}
            className={INPUT_CLS}
            dir="ltr"
            placeholder="0912XXXXXXX"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-white/60">
            ایمیل (اختیاری)
          </label>
          <input
            value={form.sellerEmail}
            onChange={(e) => set("sellerEmail", e.target.value)}
            className={INPUT_CLS}
            dir="ltr"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-white/60">
            مدت تحویل
          </label>
          <input
            value={form.deliveryTime}
            onChange={(e) => set("deliveryTime", e.target.value)}
            className={INPUT_CLS}
            placeholder="مثلاً ۲ هفته"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-white/60">
            قیمت واحد (تومان) *
          </label>
          <input
            value={form.unitPrice}
            onChange={(e) => set("unitPrice", onlyDigits(e.target.value))}
            className={INPUT_CLS}
            dir="ltr"
            inputMode="numeric"
            placeholder="5000000000"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-white/60">
            قیمت کل (تومان) *
          </label>
          <input
            value={form.totalPrice}
            onChange={(e) => set("totalPrice", onlyDigits(e.target.value))}
            className={INPUT_CLS}
            dir="ltr"
            inputMode="numeric"
            placeholder="5000000000"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-bold text-white/60">
          توضیحات
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className={TEXTAREA_CLS + " resize-none"}
          placeholder="سال ساخت، کارکرد، وضعیت فنی، گارانتی و..."
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] py-3 text-sm font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#ff8c38] disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        ارسال پیشنهاد
      </button>
    </form>
  );
}
