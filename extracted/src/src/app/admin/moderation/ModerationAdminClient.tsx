"use client";

import { useState, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  ScanLine,
} from "lucide-react";

/* ============================================================
   /admin/moderation client — moderation queue UI (P1-3).
   ------------------------------------------------------------
   Server page passes the initial flagged-list snapshot + stats
   as props. This client component handles:
     • "اسکن آگهی‌ها" button → POST { action: "scan" }.
     • Approve / Reject buttons per flagged listing.
     • Refresh on every action so the queue stays current.
   ============================================================ */

type FlaggedItem = {
  logId: string;
  action: string;
  reason: string | null;
  riskScore: number | null;
  flaggedIssues: string[];
  createdAt: string;
  listing: {
    id: string;
    title: string;
    slug: string;
    status: string;
    price: string | null;
    createdAt: string;
    brandName: string | null;
    categoryName: string | null;
  } | null;
};

type Stats = {
  scanned: number;
  flagged: number;
  approved: number;
  rejected: number;
};

const ISSUE_LABELS: Record<string, string> = {
  SPAM: "اسپم",
  FAKE_LISTING: "آگهی جعلی",
  SUSPICIOUS_PRICE: "قیمت مشکوک",
  DUPLICATE: "تکراری",
  OFFENSIVE_CONTENT: "محتوای توهین‌آمیز",
  BRAND_MISUSE: "سوءاستفاده از برند",
  CONTACT_INFO_LEAK: "نشت اطلاعات تماس",
  MISLEADING_PHOTOS: "تصاویر گمراه‌کننده",
  AI_UNAVAILABLE: "هوش مصنوعی در دسترس نبود",
  AI_PARSE_ERROR: "خطای تجزیهٔ خروجی هوش مصنوعی",
  MODERATION_ERROR: "خطای سامانهٔ نظارت",
};

function faNumber(n: number): string {
  try {
    return n.toLocaleString("fa-IR");
  } catch {
    return String(n);
  }
}

function faDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function riskMeta(score: number | null): {
  label: string;
  cls: string;
  bar: string;
} {
  if (score === null) {
    return {
      label: "بدون امتیاز",
      cls: "bg-zinc-100 text-zinc-600 border-zinc-200",
      bar: "bg-zinc-300",
    };
  }
  if (score > 0.7) {
    return {
      label: "خطر بالا",
      cls: "bg-red-100 text-red-700 border-red-200",
      bar: "bg-red-500",
    };
  }
  if (score > 0.5) {
    return {
      label: "خطر متوسط",
      cls: "bg-amber-100 text-amber-700 border-amber-200",
      bar: "bg-amber-500",
    };
  }
  if (score > 0.3) {
    return {
      label: "نیازمند بازبینی",
      cls: "bg-yellow-100 text-yellow-800 border-yellow-200",
      bar: "bg-yellow-500",
    };
  }
  return {
    label: "پاک",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-500",
  };
}

export default function ModerationAdminClient({
  initialFlagged,
  initialStats,
}: {
  initialFlagged: FlaggedItem[];
  initialStats: Stats;
}) {
  const [flagged, setFlagged] = useState<FlaggedItem[]>(initialFlagged);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [scanning, setScanning] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/moderation?limit=50`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("خطا در دریافت وضعیت نظارت.");
        return;
      }
      const j = await res.json();
      setFlagged(j.flagged ?? []);
      setStats(j.stats ?? initialStats);
    } catch (e: any) {
      setError(e?.message ?? "خطا در ارتباط با سرور.");
    }
  }, [initialStats]);

  const scan = async () => {
    setScanning(true);
    setError(null);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/moderation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan", limit: 20 }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "خطا در اجرای اسکن.");
        return;
      }
      setToast(
        `اسکن کامل شد — ${faNumber(j.scanned ?? 0)} آگهی اسکن، ${faNumber(
          j.flagged ?? 0,
        )} پرچم، ${faNumber(j.approved ?? 0)} تأیید، ${faNumber(
          j.errors ?? 0,
        )} خطا.`,
      );
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "خطا در ارتباط با سرور.");
    } finally {
      setScanning(false);
    }
  };

  const review = async (listingId: string, action: "approve" | "reject") => {
    setActingId(listingId);
    setError(null);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/moderation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, listingId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? `خطا در ${action === "approve" ? "تأیید" : "رد"} آگهی.`);
        return;
      }
      setToast(
        action === "approve"
          ? `آگهی تأیید و منتشر شد.`
          : `آگهی رد شد.`,
      );
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "خطا در ارتباط با سرور.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <ShieldAlert className="h-6 w-6 text-[#F58220]" />
            مدیریت محتوا
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            حلقهٔ نظارت محتوا — اسکن خودکار با هوش مصنوعی + بازبینی انسانی.
            اصل ۸ HBR-1.0: هوش مصنوعی پیشنهاد می‌دهد، ادمین تأیید می‌کند.
          </p>
        </div>
        <button
          onClick={scan}
          disabled={scanning}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#ff8c38] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {scanning ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ScanLine size={16} />
          )}
          اسکن آگهی‌ها
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="کل اسکن‌ها"
          value={faNumber(stats.scanned)}
          icon={Activity}
          cls="border-zinc-200 bg-white text-zinc-700"
        />
        <StatCard
          label="پرچم‌شده"
          value={faNumber(stats.flagged)}
          icon={ShieldAlert}
          cls="border-red-200 bg-red-50 text-red-700"
        />
        <StatCard
          label="تأییدشده"
          value={faNumber(stats.approved)}
          icon={ShieldCheck}
          cls="border-emerald-200 bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="ردشده"
          value={faNumber(stats.rejected)}
          icon={ShieldX}
          cls="border-zinc-300 bg-zinc-50 text-zinc-700"
        />
      </div>

      {/* Error / toast */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} />
          {toast}
          <button
            onClick={() => setToast(null)}
            className="mr-auto rounded px-2 text-xs underline"
          >
            بستن
          </button>
        </div>
      )}

      {/* Flagged listings table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-800">
            <ShieldAlert size={16} className="text-[#F58220]" />
            صف بازبینی ({faNumber(flagged.length)})
          </div>
          <button
            onClick={refresh}
            className="text-xs text-zinc-500 underline hover:text-zinc-700"
          >
            به‌روزرسانی
          </button>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full min-w-[900px] border-collapse text-right text-sm">
            <thead className="sticky top-0 bg-zinc-50 text-xs font-bold text-zinc-600">
              <tr>
                <th className="border-b border-zinc-200 px-4 py-3">آگهی</th>
                <th className="border-b border-zinc-200 px-4 py-3">امتیاز خطر</th>
                <th className="border-b border-zinc-200 px-4 py-3">مسائل شناسایی‌شده</th>
                <th className="border-b border-zinc-200 px-4 py-3">دلیل / یادداشت</th>
                <th className="border-b border-zinc-200 px-4 py-3">زمان اسکن</th>
                <th className="border-b border-zinc-200 px-4 py-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {flagged.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-zinc-500"
                  >
                    هیچ آگهی پرچم‌شده‌ای وجود ندارد. برای یافتن موارد مشکوک
                    دکمهٔ «اسکن آگهی‌ها» را بزنید.
                  </td>
                </tr>
              ) : (
                flagged.map((f) => {
                  const rm = riskMeta(f.riskScore);
                  const score = f.riskScore ?? 0;
                  const scorePct = Math.round(score * 100);
                  return (
                    <tr
                      key={f.logId}
                      className="border-b border-zinc-100 transition hover:bg-amber-50/40"
                    >
                      <td className="px-4 py-3">
                        {f.listing ? (
                          <div>
                            <div className="font-semibold text-zinc-800">
                              {f.listing.title}
                            </div>
                            <div className="mt-0.5 text-[11px] text-zinc-500">
                              {f.listing.brandName ?? "—"} ·{" "}
                              {f.listing.categoryName ?? "—"}
                            </div>
                            <div className="mt-0.5 text-[10px] text-zinc-400">
                              وضعیت: {f.listing.status}
                              {f.listing.price
                                ? ` · ${faNumber(Number(f.listing.price))} تومان`
                                : ""}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">
                            آگهی حذف شده
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${rm.cls}`}
                          >
                            {rm.label}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={`h-full ${rm.bar}`}
                            style={{ width: `${scorePct}%` }}
                          />
                        </div>
                        <div className="mt-0.5 text-[10px] text-zinc-400">
                          {faNumber(scorePct)}٪
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {f.flaggedIssues.length === 0 ? (
                          <span className="text-xs text-zinc-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {f.flaggedIssues.map((iss) => (
                              <span
                                key={iss}
                                className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700"
                                title={iss}
                              >
                                {ISSUE_LABELS[iss] ?? iss}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="max-w-[280px] px-4 py-3 text-xs text-zinc-600">
                        {f.reason ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                        {faDateTime(f.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              f.listing && review(f.listing.id, "approve")
                            }
                            disabled={!f.listing || actingId === f.listing?.id}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actingId === f.listing?.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            تأیید
                          </button>
                          <button
                            onClick={() =>
                              f.listing && review(f.listing.id, "reject")
                            }
                            disabled={!f.listing || actingId === f.listing?.id}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <XCircle size={12} />
                            رد
                          </button>
                        </div>
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
          اسکن خودکار هوش مصنوعی، آگهی‌های منتشرشده را به‌صورت دوره‌ای بررسی می‌کند.
          آگهی‌هایی با امتیاز خطر بیش از ۰٫۷ به‌صورت خودکار به وضعیت PENDING در
          می‌آیند تا ادمین بازبینی کند. تأیید نهایی همواره با ادمین است.
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
}: {
  label: string;
  value: string;
  icon: any;
  cls: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${cls}`}>
      <Icon size={22} />
      <div>
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs font-semibold opacity-80">{label}</div>
      </div>
    </div>
  );
}
