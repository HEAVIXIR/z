"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Star,
  ShieldAlert,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Flag,
} from "lucide-react";
import { toFa, timeAgo } from "@/lib/format";

/* ============================================================
   /admin/reviews — Review moderation dashboard.
   Lists reviews, flags suspicious, approve/reject.
   ============================================================ */

type Review = {
  id: string;
  listingId: string;
  userId: string | null;
  rating: number;
  body: string;
  suspicious: boolean;
  fraudScore: number;
  status: string;
  ipHash: string | null;
  createdAt: string;
  flags: { id: string; reason: string }[];
  listing: { id: string; title: string; slug: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "در انتظار",
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
};

const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "suspicious" | "PENDING" | "APPROVED" | "REJECTED">("all");
  const [actingId, setActingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "suspicious") params.set("suspicious", "1");
      else if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      const json = await res.json();
      setReviews(json.reviews || []);
      setStats(json.stats);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const act = async (id: string, action: "APPROVE" | "REJECT") => {
    setActingId(id);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast(action === "APPROVE" ? "نظر تأیید شد ✓" : "نظر رد شد");
        await load();
      } else {
        showToast(json.error ?? "خطا");
      }
    } catch {
      showToast("خطا در ارتباط با سرور");
    }
    setActingId(null);
  };

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: "all", label: "همه" },
    { key: "suspicious", label: "مشکوک" },
    { key: "PENDING", label: "در انتظار" },
    { key: "APPROVED", label: "تأیید شده" },
    { key: "REJECTED", label: "رد شده" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <ShieldAlert className="h-6 w-6 text-[#F58220]" />
            تشخیص تقلب نظرات
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            بررسی و تأیید/رد نظرات کاربران با سیستم خودکار تشخیص تقلب
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          به‌روزرسانی
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="کل نظرات" value={stats.total} />
          <StatCard label="در انتظار" value={stats.pending} tone="amber" />
          <StatCard label="تأیید شده" value={stats.approved} tone="emerald" />
          <StatCard label="رد شده" value={stats.rejected} tone="red" />
          <StatCard label="مشکوک" value={stats.suspicious} tone="orange" />
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filter === f.key
                ? "bg-[#F58220] text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-[#F58220]/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Star className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">نظری برای نمایش وجود ندارد.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm ${
                r.suspicious ? "border-amber-300" : "border-zinc-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i <= r.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-zinc-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[r.status] ?? "bg-zinc-100 text-zinc-600"}`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    {r.suspicious && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <Flag className="h-3 w-3" />
                        مشکوک (امتیاز {toFa(r.fraudScore)})
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-400">
                      {timeAgo(r.createdAt)}
                    </span>
                    {r.ipHash && (
                      <span
                        dir="ltr"
                        className="font-mono text-[10px] text-zinc-400"
                      >
                        IP:{r.ipHash.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-7 text-zinc-700">{r.body}</p>
                  {r.listing && (
                    <a
                      href={`/listings/${r.listing.slug}`}
                      target="_blank"
                      className="mt-2 inline-block text-[11px] text-[#F58220] hover:underline"
                    >
                      روی آگهی: {r.listing.title}
                    </a>
                  )}
                  {r.flags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.flags.map((f) => (
                        <span
                          key={f.id}
                          className="rounded bg-amber-50 px-2 py-0.5 font-mono text-[10px] text-amber-700"
                        >
                          {f.reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    onClick={() => act(r.id, "APPROVE")}
                    disabled={actingId === r.id || r.status === "APPROVED"}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    تأیید
                  </button>
                  <button
                    onClick={() => act(r.id, "REJECT")}
                    disabled={actingId === r.id || r.status === "REJECTED"}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-600 disabled:opacity-40"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    رد
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "amber" | "emerald" | "red" | "orange";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    red: "text-red-600",
    orange: "text-[#F58220]",
  };
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
      <p className={`text-xl font-black ${tones[tone]}`}>{toFa(value)}</p>
      <p className="mt-0.5 text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}
