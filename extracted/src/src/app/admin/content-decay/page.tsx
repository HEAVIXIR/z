import { db } from "@/lib/db";
import {
  AlertTriangle,
  Eye,
  Calendar,
  TrendingDown,
  RefreshCw,
  Clock,
} from "lucide-react";
import { toFa, faDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/* ============================================================
   /admin/content-decay — list outdated articles.
   Light theme admin page (server component).
   ============================================================ */

const CATEGORY_LABELS: Record<string, string> = {
  GUIDE: "راهنما",
  NEWS: "خبر",
  REVIEW: "نقد",
  TUTORIAL: "آموزش",
  ANALYSIS: "تحلیل",
};

export default async function ContentDecayPage() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const oldArticles = await db.article.findMany({
    where: {
      publishedAt: { lt: sixMonthsAgo },
      status: "PUBLISHED",
    },
    orderBy: { publishedAt: "desc" },
    take: 500,
  });

  const articles = oldArticles
    .map((a) => {
      const publishedAt = a.publishedAt ?? a.createdAt;
      const ageDays = Math.max(
        1,
        Math.floor((now.getTime() - publishedAt.getTime()) / 86400000),
      );
      const expectedViews = ageDays * 10;
      const isDeclining = a.viewCount < expectedViews * 0.5;
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        category: a.category,
        coverImage: a.coverImage,
        viewCount: a.viewCount,
        publishedAt: publishedAt.toISOString(),
        ageDays,
        ageMonths: Math.floor(ageDays / 30),
        expectedViews,
        isDeclining,
      };
    })
    .filter((a) => a.isDeclining);

  const stats = {
    totalOld: oldArticles.length,
    outdatedCount: articles.length,
    freshCount: oldArticles.length - articles.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            تشخیص محتوای فرسوده
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            مقالات قدیمی‌تر از ۶ ماه با روند نزولی بازدید — نیازمند به‌روزرسانی
          </p>
        </div>
        <a
          href="/admin/content-decay"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          به‌روزرسانی
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="مقالات بالای ۶ ماه"
          value={stats.totalOld}
          tone="amber"
        />
        <StatCard
          label="فرسوده (نیازمند به‌روزرسانی)"
          value={stats.outdatedCount}
          tone="red"
        />
        <StatCard label="تازه" value={stats.freshCount} tone="emerald" />
      </div>

      {/* Articles list */}
      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <TrendingDown className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
          <p className="text-sm text-zinc-500">
            هیچ مقالهٔ فرسوده‌ای یافت نشد. همهٔ محتوا تازه است ✓
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                {a.coverImage ? (
                  <img
                    src={a.coverImage}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <a
                    href={`/knowledge/${a.slug}`}
                    target="_blank"
                    className="block truncate text-sm font-bold text-zinc-900 hover:text-[#F58220]"
                  >
                    {a.title}
                  </a>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    <span className="rounded bg-white px-1.5 py-0.5 font-bold text-zinc-600">
                      {CATEGORY_LABELS[a.category] ?? a.category}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {faDate(a.publishedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {toFa(a.ageMonths)} ماه پیش
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {toFa(a.viewCount)} بازدید
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <TrendingDown className="h-3 w-3" />
                      انتظار: {toFa(a.expectedViews)} بازدید
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <a
                  href={`/admin/articles?edit=${a.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#ff8c38]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  علامت‌گذاری برای به‌روزرسانی
                </a>
              </div>
            </div>
          ))}
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
  tone?: "default" | "amber" | "red" | "emerald";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    amber: "text-amber-600",
    red: "text-red-600",
    emerald: "text-emerald-600",
  };
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-sm">
      <p className={`text-2xl font-black ${tones[tone]}`}>{toFa(value)}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
