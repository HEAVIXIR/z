"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/* ============================================================
   LoginForm — universal auth entry.
   The single input accepts either:
     • admin username (legacy admin path → admin cookie)
     • email           (→ user session)
     • mobile          (→ user session)
   The backend /api/auth/login detects which path to take based
   on the shape of the identifier (email regex, all-digits mobile,
   otherwise admin username). After login the redirect target is
   decided by the returned `role`:
     role === "admin"        → /admin/dashboard  (admin cookie)
     role === "ADMIN"        → /admin/dashboard  (user w/ ADMIN role)
     role in SELLER/BUYER    → /dashboard        (user dashboard)
   ============================================================ */

function detectIdentifierKind(raw: string): "email" | "mobile" | "username" {
  const v = raw.trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return "email";
  // Iranian mobile patterns: 09xxxxxxxxx or +989xxxxxxxxx — treat
  // anything that is mostly digits (≥10 digits) as mobile.
  const digits = v.replace(/[^\d]/g, "");
  if (digits.length >= 10 && /^[\d+\s-]+$/.test(v)) return "mobile";
  return "username";
}

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const hasError = sp.get("error") === "1";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    hasError ? "نام کاربری یا رمز عبور اشتباه است." : null,
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!identifier || !password) {
      setError("شناسه و رمز عبور الزامی است.");
      setLoading(false);
      return;
    }

    const kind = detectIdentifierKind(identifier);
    const payload: Record<string, string> = { password };
    if (kind === "email") payload.email = identifier.toLowerCase();
    else if (kind === "mobile") payload.mobile = identifier;
    else payload.username = identifier;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "ورود ناموفق بود.");
        setLoading(false);
        return;
      }

      // Role-based redirect:
      //   "admin" (legacy admin cookie) OR user.role === "ADMIN" → admin panel
      //   otherwise → user dashboard
      const role: string | undefined = data.role;
      const isAdminPath =
        role === "admin" || role === "ADMIN" || role === "SUPERADMIN";
      const target = isAdminPath ? "/admin/dashboard" : "/dashboard";
      router.push(target);
      router.refresh();
    } catch {
      setError("خطای شبکه. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#161616] to-[#0c0c0c] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
    >
      <h1 className="text-center text-2xl font-black text-white">ورود</h1>
      <p className="mt-2 text-center text-sm text-white/45">
        هویکس — ورود کاربران، فروشندگان و مدیران
      </p>

      {error && (
        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm font-bold text-red-400">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-white/60">
            نام کاربری / موبایل / ایمیل
          </label>
          <input
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="admin یا 09xxxxxxxxx یا you@email.com"
            className="h-12 w-full rounded-xl border border-white/10 bg-black/50 px-4 text-sm text-white outline-none transition focus:border-[#F58220] focus:shadow-[0_0_0_3px_rgba(245,130,32,.12)] placeholder:text-white/25"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-white/60">
            رمز عبور
          </label>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-12 w-full rounded-xl border border-white/10 bg-black/50 px-4 text-sm text-white outline-none transition focus:border-[#F58220] focus:shadow-[0_0_0_3px_rgba(245,130,32,.12)] placeholder:text-white/25"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#F58220] text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#ff8c38] disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "ورود"}
      </button>

      <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-center text-[11px] text-white/40">
        مدیر پیش‌فرض: <span className="font-bold text-white/60">admin</span> /{" "}
        <span className="font-bold text-white/60">heavix1404</span>
      </div>
      <p className="mt-3 text-center text-[11px] text-white/35">
        کاربران با موبایل یا ایمیل و رمز عبور خود وارد شوند.
      </p>
    </form>
  );
}
