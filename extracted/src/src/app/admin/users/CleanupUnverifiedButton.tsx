"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, ShieldOff, RefreshCw } from "lucide-react";

/* =========================================================
   CleanupUnverifiedButton — admin action that triggers the
   /api/admin/cleanup-unverified endpoint. Shows the current
   count of candidates (preview via GET), then lets the admin
   hard-delete OR deactivate them. Renders a result list.
========================================================= */

type Candidate = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  verificationDeadline: string | null;
};

export default function CleanupUnverifiedButton() {
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<null | "delete" | "deactivate">(null);
  const [count, setCount] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [result, setResult] = useState<
    | { mode: string; affected: number; users: Candidate[] }
    | null
  >(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/cleanup-unverified", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        setCount(data.count);
        setCandidates(data.users);
        setResult(null);
      } else {
        setErr(data.error || "خطا در دریافت لیست.");
      }
    } catch {
      setErr("خطای شبکه.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function run(mode: "delete" | "deactivate") {
    if (
      !confirm(
        mode === "delete"
          ? "تمام کاربران تأییدنشده‌ای که مهلتشان گذشته حذف شوند؟ این عملیات غیرقابل بازگشت است."
          : "تمام کاربران تأییدنشده‌ای که مهلتشان گذشته غیرفعال شوند؟",
      )
    ) {
      return;
    }
    setActing(mode);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/cleanup-unverified?mode=${mode}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        setResult({
          mode: data.mode,
          affected: data.affected,
          users: data.users ?? [],
        });
        await refresh();
      } else {
        setErr(data.error || "عملیات ناموفق بود.");
      }
    } catch {
      setErr("خطای شبکه.");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-zinc-900">
            پاکسازی کاربران تأییدنشده
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            کاربرانی که مهلت ۷ روزه تأیید ایمیلشان گذشته و ایمیل را تأیید
            نکرده‌اند. می‌توانید آن‌ها را حذف یا غیرفعال کنید.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading || acting !== null}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 transition hover:border-zinc-300 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            بازخوانی
          </button>
          <button
            type="button"
            onClick={() => run("deactivate")}
            disabled={acting !== null || count === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
          >
            {acting === "deactivate" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldOff className="h-3.5 w-3.5" />
            )}
            غیرفعال کردن
          </button>
          <button
            type="button"
            onClick={() => run("delete")}
            disabled={acting !== null || count === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {acting === "delete" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            حذف
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 font-bold text-zinc-700">
          کاربران در انتظار پاکسازی:{" "}
          <span className="text-red-600">
            {count === null ? "…" : count}
          </span>
        </span>
      </div>

      {err && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700">
          {err}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          <p className="font-bold">
            {result.affected} کاربر با موفقیت{" "}
            {result.mode === "delete" ? "حذف شدند" : "غیرفعال شدند"}.
          </p>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-zinc-200">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-right font-bold">نام</th>
                <th className="px-3 py-2 text-right font-bold">ایمیل</th>
                <th className="px-3 py-2 text-right font-bold">موبایل</th>
                <th className="px-3 py-2 text-right font-bold">مهلت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {candidates.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 font-bold text-zinc-800">
                    {c.name}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{c.email}</td>
                  <td className="px-3 py-2 text-zinc-600">{c.mobile}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {c.verificationDeadline
                      ? new Date(c.verificationDeadline).toLocaleDateString(
                          "fa-IR",
                        )
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
