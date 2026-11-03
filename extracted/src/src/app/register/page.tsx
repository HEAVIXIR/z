"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Mail, ShieldCheck, ArrowLeft } from "lucide-react";

/* ============================================================
   /register — user registration with email confirmation.
   Step 1: fill form (firstName, lastName, mobile, email, password)
   Step 2: enter verification code (sent to email)
   Step 3: success → redirect to login
   ============================================================ */

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Verification
  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState(""); // shown in dev mode

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, mobile, email, password, companyName }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setUserId(data.userId);
        setDevCode(data.devCode ?? "");
        setStep("verify");
      } else {
        setError(data.error ?? "ثبت‌نام ناموفق بود.");
      }
    } catch {
      setError("خطای شبکه — اتصال اینترنت را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setStep("success");
      } else {
        setError(data.error ?? "تأیید ناموفق بود.");
      }
    } catch {
      setError("خطای شبکه.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "h-12 w-full rounded-xl border border-white/10 bg-black/50 px-4 text-sm text-white outline-none transition focus:border-[#F58220] focus:shadow-[0_0_0_3px_rgba(245,130,32,.12)] placeholder:text-white/25 disabled:opacity-50";

  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0b0b] px-4 py-12"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(245,130,32,0.12),transparent_70%)]" />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/heavix-logo-white.svg" alt="HEAVIX" className="h-12 w-auto" />
        </div>

        {step === "form" && (
          <form
            onSubmit={submitForm}
            className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#161616] to-[#0c0c0c] p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
          >
            <h1 className="text-center text-xl font-black text-white">ثبت‌نام در هویکس</h1>
            <p className="mt-2 text-center text-xs text-white/45">
              حساب کاربری رایگان بسازید — پس از تأیید ایمیل فعال می‌شود
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-400">
                ⚠ {error}
              </div>
            )}

            <div className="mt-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-white/60">نام *</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputCls} placeholder="نام" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-white/60">نام خانوادگی *</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} required className={inputCls} placeholder="نام خانوادگی" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-white/60">شماره موبایل *</label>
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  dir="ltr"
                  className={inputCls + " text-right"}
                  placeholder="09123456789"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-white/60">ایمیل *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className={inputCls + " text-right"}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-white/60">رمز عبور *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputCls}
                  placeholder="حداقل ۸ کاراکتر"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-white/60">نام شرکت (اختیاری)</label>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} placeholder="نام شرکت" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {loading ? "در حال ثبت..." : "ثبت‌نام"}
            </button>

            <p className="mt-4 text-center text-xs text-white/40">
              قبلاً ثبت‌نام کرده‌اید؟{" "}
              <Link href="/login" className="font-bold text-[#F58220] hover:underline">
                ورود
              </Link>
            </p>
          </form>
        )}

        {step === "verify" && (
          <form
            onSubmit={verifyCode}
            className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#161616] to-[#0c0c0c] p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
          >
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F58220]/15">
                <Mail className="h-7 w-7 text-[#F58220]" />
              </div>
            </div>
            <h1 className="text-center text-xl font-black text-white">تأیید ایمیل</h1>
            <p className="mt-2 text-center text-xs text-white/45">
              کد ۵ رقمی به شماره موبایل <span className="font-bold text-white/70" dir="ltr">{mobile}</span> ارسال شد
            </p>

            {devCode && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-sm font-bold text-amber-400">
                کد تأیید (دمو): <span dir="ltr" className="tracking-widest">{devCode}</span>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-400">
                ⚠ {error}
              </div>
            )}

            <div className="mt-5">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                dir="ltr"
                maxLength={5}
                className={inputCls + " text-center text-2xl tracking-[0.5em] font-black"}
                placeholder="-----"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 5}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {loading ? "در حال تأیید..." : "تأیید و فعال‌سازی"}
            </button>

            <button
              type="button"
              onClick={() => setStep("form")}
              className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-white/40 transition hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" />
              بازگشت به فرم
            </button>
          </form>
        )}

        {step === "success" && (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.06] p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <ShieldCheck className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-black text-white">حساب شما فعال شد!</h1>
            <p className="mt-2 text-sm text-white/55">
              اکنون می‌توانید با شماره موبایل و رمز عبور خود وارد شوید.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-[#F58220] px-8 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
            >
              ورود به حساب
            </Link>
          </div>
        )}

        <div className="mt-5 text-center">
          <Link href="/" className="text-xs text-white/40 hover:text-[#F58220]">
            ← بازگشت به سایت
          </Link>
        </div>
      </div>
    </div>
  );
}
