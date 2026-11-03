"use client";

import { useState } from "react";
import { HardHat, Send, Loader2, X, CheckCircle2 } from "lucide-react";

/* ============================================================
   ExpertConsultButton — opens modal, posts to /api/expert-consult.
   ============================================================ */

export default function ExpertConsultButton({
  listingId,
  listingTitle,
}: {
  listingId: string;
  listingTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!question.trim()) {
      setError("لطفاً سؤال خود را وارد کنید");
      return;
    }
    if (!buyerPhone.trim()) {
      setError("شماره تماس الزامی است");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/expert-consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          question,
          buyerPhone,
          buyerName: buyerName || undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setDone(true);
      } else {
        setError(json.error ?? "خطا در ثبت درخواست");
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    }
    setSubmitting(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/10 text-sm font-bold text-teal-300 transition hover:bg-teal-500/15"
      >
        <HardHat className="h-4 w-4" />
        مشاوره با کارشناس
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#111] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-white">درخواست شما ثبت شد</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  کارشناسان هویکس در اولین فرصت با شما تماس خواهند گرفت.
                </p>
                <button
                  onClick={() => {
                    setOpen(false);
                    setDone(false);
                    setQuestion("");
                    setBuyerName("");
                    setBuyerPhone("");
                  }}
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white hover:bg-[#ff8c38]"
                >
                  بستن
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-black text-white">
                    <HardHat className="h-5 w-5 text-teal-400" />
                    مشاوره با کارشناس
                  </h3>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="mb-4 text-xs leading-6 text-white/55">
                  دربارهٔ «{listingTitle}» سؤال دارید؟ کارشناسان هویکس پاسخگوی شما
                  هستند.
                </p>
                <form onSubmit={submit} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-white/60">
                      سؤال شما *
                    </label>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      rows={3}
                      placeholder="مثال: آیا این دستگاه مناسب معدن است؟"
                      className="w-full resize-none rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#F58220]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-white/60">
                        نام (اختیاری)
                      </label>
                      <input
                        type="text"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-[#0b0b0b] px-3 text-sm text-white outline-none focus:border-[#F58220]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-white/60">
                        تلفن *
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="0912…"
                        className="h-10 w-full rounded-xl border border-white/10 bg-[#0b0b0b] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#F58220]"
                      />
                    </div>
                  </div>
                  {error && (
                    <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] text-sm font-bold text-white hover:bg-[#ff8c38] disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    ثبت درخواست مشاوره
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
