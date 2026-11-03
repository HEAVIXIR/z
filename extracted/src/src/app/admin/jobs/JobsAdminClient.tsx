"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  Play,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  ListChecks,
  Timer,
  Server,
} from "lucide-react";

/* ============================================================
   /admin/jobs — Background Jobs dashboard (P1-19).
   HEAVIX-AUDIT-2026-09-20.md §10

   Shows:
     • Queue stats (pending / running / done / failed).
     • Registered job types with a "اجرا" (run) button each.
     • Recent job records (status + duration + error).
   ============================================================ */

type Stats = {
  pending: number;
  running: number;
  done: number;
  failed: number;
};

type RecentJob = {
  id: string;
  type: string;
  payload: unknown;
  priority: number;
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  error?: string;
  enqueuedAt: number;
  startedAt?: number;
  finishedAt?: number;
};

const JOB_TYPE_LABELS: Record<string, { fa: string; desc: string }> = {
  "cleanup-unverified-users": {
    fa: "پاک‌سازی کاربران تأییدنشده",
    desc: "حذف یا غیرفعال‌سازی کاربرانی که مهلت تأیید ایمیلشان گذشته.",
  },
  "audit-log-cleanup": {
    fa: "پاک‌سازی لاگ ممیزی",
    desc: "حذف رکوردهای AuditLog قدیمی‌تر از ۹۰ روز (قابل تنظیم).",
  },
  "ai-budget-reset": {
    fa: "بازنشانی بودجه هوش مصنوعی",
    desc: "بررسی دوره‌ای پنجره‌های روزانه/ماهانه بودجه AI.",
  },
  "listing-expiry": {
    fa: "منقضی‌سازی آگهی‌ها",
    desc: "آگهی‌های منتشرشده با expiresAt گذشته به EXPIRED تغییر می‌یابند.",
  },
  "image-thumbnail": {
    fa: "تولید تصویر بندانگشتی (نسخه placeholder)",
    desc: "پایپ‌لاین نسخه پشتیبان — برای آینده (P2).",
  },
  "saved-search-matcher": {
    fa: "اجرای تطبیق هشدارها",
    desc: "جستجوهای ذخیره‌شدهٔ فعال را دوباره روی آگهی‌های منتشرشده اجرا می‌کند و برای هر کاربر یک اعلان از آگهی‌های جدید مطابق می‌سازد.",
  },
};

function faNumber(n: number): string {
  return n.toLocaleString("fa-IR");
}

function faDateTime(ms: number): string {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function durationMs(job: RecentJob): number | null {
  if (!job.startedAt) return null;
  const end = job.finishedAt ?? Date.now();
  return Math.max(0, end - job.startedAt);
}

const STATUS_META: Record<
  RecentJob["status"],
  { fa: string; cls: string; icon: any }
> = {
  PENDING: {
    fa: "در انتظار",
    cls: "bg-zinc-100 text-zinc-700 border-zinc-200",
    icon: Clock,
  },
  RUNNING: {
    fa: "در حال اجرا",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Loader2,
  },
  DONE: {
    fa: "انجام شد",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  FAILED: {
    fa: "خطا",
    cls: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
  },
};

export default function JobsAdminClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [recent, setRecent] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningType, setRunningType] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<{
    type: string;
    jobId: string;
    ok: boolean;
    message?: string;
  } | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/jobs?recentLimit=50`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        setError("دسترسی غیرمجاز. لطفاً دوباره وارد شوید.");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "خطا در دریافت وضعیت صف.");
        return;
      }
      const j = await res.json();
      setStats(j.stats ?? null);
      setTypes(j.types ?? []);
      setRecent(j.recent ?? []);
    } catch (e: any) {
      setError(e?.message ?? "خطا در ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Auto-refresh every 5s so the dashboard reflects background
    // progress without manual clicks.
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const runJob = async (type: string) => {
    setRunningType(type);
    setError(null);
    try {
      const res = await fetch(`/api/admin/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLastRun({
          type,
          jobId: "",
          ok: false,
          message: j.error ?? "خطا در اجرای کار.",
        });
        return;
      }
      setLastRun({ type, jobId: j.jobId, ok: true });
      // Immediate refresh so the operator sees the new PENDING job.
      await refresh();
    } catch (e: any) {
      setLastRun({
        type,
        jobId: "",
        ok: false,
        message: e?.message ?? "خطا در ارتباط با سرور.",
      });
    } finally {
      setRunningType(null);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Server className="text-[#F58220]" size={26} />
            کارهای پس‌زمینه
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            صف درون‌پروسه‌ای کارهای غیرهمزمان — مطابق HEAVIX-AUDIT §10 و
            P0-IMPLEMENTATION-PLAN STEP 19.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          به‌روزرسانی
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="در انتظار"
          value={stats?.pending ?? 0}
          icon={Clock}
          cls="border-zinc-200 bg-white text-zinc-700"
        />
        <StatCard
          label="در حال اجرا"
          value={stats?.running ?? 0}
          icon={Loader2}
          cls="border-blue-200 bg-blue-50 text-blue-700"
          spin
        />
        <StatCard
          label="انجام‌شده"
          value={stats?.done ?? 0}
          icon={CheckCircle2}
          cls="border-emerald-200 bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="خطا"
          value={stats?.failed ?? 0}
          icon={XCircle}
          cls="border-red-200 bg-red-50 text-red-700"
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Last run toast */}
      {lastRun && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            lastRun.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {lastRun.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span>
            {lastRun.ok
              ? `کار «${JOB_TYPE_LABELS[lastRun.type]?.fa ?? lastRun.type}» در صف قرار گرفت.`
              : `خطا در اجرای کار «${JOB_TYPE_LABELS[lastRun.type]?.fa ?? lastRun.type}».`}
            {lastRun.ok && lastRun.jobId ? (
              <code className="mr-2 rounded bg-white/60 px-1.5 py-0.5 font-mono text-[11px]">
                {lastRun.jobId}
              </code>
            ) : null}
            {lastRun.message && !lastRun.ok ? (
              <span className="mr-2">— {lastRun.message}</span>
            ) : null}
          </span>
          <button
            onClick={() => setLastRun(null)}
            className="mr-auto rounded px-2 text-xs underline"
          >
            بستن
          </button>
        </div>
      )}

      {/* Registered job types */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-800">
          <ListChecks size={16} className="text-[#F58220]" />
          انواع کارهای ثبت‌شده
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {types.length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
              هیچ handlerی ثبت نشده است.
            </div>
          ) : (
            types.map((t) => {
              const meta = JOB_TYPE_LABELS[t] ?? { fa: t, desc: "" };
              const isThisRunning = runningType === t;
              return (
                <div
                  key={t}
                  className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 transition hover:border-zinc-300 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-900">{meta.fa}</div>
                      <code className="mt-0.5 inline-block rounded bg-zinc-200/60 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
                        {t}
                      </code>
                    </div>
                    <button
                      onClick={() => runJob(t)}
                      disabled={isThisRunning}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#F58220] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#ff8c38] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isThisRunning ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Play size={13} />
                      )}
                      اجرا
                    </button>
                  </div>
                  {meta.desc ? (
                    <p className="text-xs leading-relaxed text-zinc-500">
                      {meta.desc}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recent jobs */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-800">
            <Timer size={16} className="text-[#F58220]" />
            کارهای اخیر
          </div>
          <div className="text-xs text-zinc-500">
            نمایش{" "}
            <span className="font-bold text-zinc-700">{faNumber(recent.length)}</span>{" "}
            از کارهای اخیر (به‌روزرسانی خودکار هر ۵ ثانیه)
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-right text-sm">
            <thead className="bg-zinc-50 text-xs font-bold text-zinc-600">
              <tr>
                <th className="border-b border-zinc-200 px-4 py-3">نوع کار</th>
                <th className="border-b border-zinc-200 px-4 py-3">وضعیت</th>
                <th className="border-b border-zinc-200 px-4 py-3">زمان شروع</th>
                <th className="border-b border-zinc-200 px-4 py-3">مدت (ms)</th>
                <th className="border-b border-zinc-200 px-4 py-3">خطا</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    هنوز کاری اجرا نشده است. از دکمه «اجرا» بالا استفاده کنید.
                  </td>
                </tr>
              ) : (
                recent.map((j) => {
                  const meta = STATUS_META[j.status] ?? STATUS_META.PENDING;
                  const Icon = meta.icon;
                  const dur = durationMs(j);
                  return (
                    <tr
                      key={j.id}
                      className="border-b border-zinc-100 transition hover:bg-amber-50/40"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-800">
                          {JOB_TYPE_LABELS[j.type]?.fa ?? j.type}
                        </div>
                        <code className="font-mono text-[10px] text-zinc-400">
                          {j.id}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.cls}`}
                        >
                          <Icon
                            size={12}
                            className={
                              j.status === "RUNNING" ? "animate-spin" : ""
                            }
                          />
                          {meta.fa}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-600">
                        {j.startedAt ? faDateTime(j.startedAt) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-600">
                        {dur === null ? "—" : faNumber(dur)}
                      </td>
                      <td className="max-w-[300px] truncate px-4 py-3 text-xs text-red-600">
                        {j.error ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help note */}
      <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <span>
          این صف درون‌پروسه‌ای است و با ری‌استارت پروس از بین می‌رود. برای
          محیط Production باید با Redis (BullMQ) یا pg-boss جایگزین شود —
          مطابق ADR-001-database-strategy.
        </span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  cls,
  spin = false,
}: {
  label: string;
  value: number;
  icon: any;
  cls: string;
  spin?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${cls}`}>
      <Icon size={22} className={spin ? "animate-spin" : ""} />
      <div>
        <div className="text-2xl font-black">{faNumber(value)}</div>
        <div className="text-xs font-semibold opacity-80">{label}</div>
      </div>
    </div>
  );
}
