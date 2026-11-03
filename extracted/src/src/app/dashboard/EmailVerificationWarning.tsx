"use client";

import { useState } from "react";
import { Loader2, MailWarning, Send } from "lucide-react";

/* =========================================================
   EmailVerificationWarning — banner shown on the user
   dashboard when emailVerified === false. Shows the 7-day
   countdown (computed server-side from verificationDeadline)
   and offers a "resend code" button plus a code input that
   POSTs to /api/auth/verify-email.
========================================================= */

export default function EmailVerificationWarning({
  email,
  userId,
  daysLeft,
}: {
  email: string;
  userId: string;
  daysLeft: number | null;
}) {
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [resentAt, setResentAt] = useState<Date | null>(null);

  async function resend() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg("کد جدید به ایمیل شما ارسال شد.");
        setResentAt(new Date());
      } else {
        setErr(data.error || "ارسال کد ناموفق بود.");
      }
    } catch {
      setErr("خطای شبکه.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!code.trim()) {
      setErr("کد را وارد کنید.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: code.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg("ایمیل شما با موفقیت تأیید شد.");
        setErr(null);
        // Reload so the server-rendered banner disappears.
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setErr(data.error || "کد نامعتبر است.");
      }
    } catch {
      setErr("خطای شبکه.");
    } finally {
      setBusy(false);
    }
  }

  const overdue = daysLeft !== null && daysLeft <= 0;

  return (
    <section
      className={`mb-8 rounded-2xl border p-5 ${
        overdue
          ? "border-red-500/40 bg-red-500/10"
          : "border-amber-500/40 bg-amber-500/10"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            overdue
              ? "bg-red-500/20 text-red-400"
              : "bg-amber-500/20 text-amber-400"
          }`}
        >
          <MailWarning className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className={`text-base font-black ${
              overdue ? "text-red-300" : "text-amber-200"
            }`}
          >
            {overdue
              ? "مهلت تأیید ایمیل به پایان رسیده است"
              : "ایمیل شما هنوز تأیید نشده است"}
          </h3>
          <p className="mt-1 text-xs text-white/70">
            برای استفاده کامل از خدمات هویکس، ایمیل خود را تأیید کنید.
            {daysLeft !== null && !overdue && (
              <>
                {" "}
                حدود <span className="font-bold">{daysLeft} روز</span> تا حذف
                حساب باقی مانده است.
              </>
            )}
            {overdue && (
              <>
                {" "}
                حساب شما ممکن است به‌زودی توسط مدیر غیرفعال یا حذف شود.
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-4 text-xs font-bold text-white transition hover:bg-white/15 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          ارسال مجدد کد
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="کد ۶ رقمی ایمیل"
          className="h-10 w-44 rounded-lg border border-white/15 bg-black/40 px-3 text-sm text-white outline-none focus:border-[#F58220] placeholder:text-white/30"
        />
        <button
          type="button"
          onClick={verify}
          disabled={busy}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#F58220] px-5 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "تأیید"}
        </button>
        {resentAt && (
          <span className="text-[10px] text-white/40">
            آخرین ارسال: {resentAt.toLocaleTimeString("fa-IR")}
          </span>
        )}
      </div>

      {msg && (
        <p className="mt-3 text-xs font-bold text-emerald-400">{msg}</p>
      )}
      {err && <p className="mt-3 text-xs font-bold text-red-400">{err}</p>}
    </section>
  );
}
