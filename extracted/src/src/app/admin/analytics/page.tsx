import Link from "next/link";
import { db } from "@/lib/db";
import { getAnalyticsSummary, ANALYTICS_EVENT_TYPES } from "@/lib/analytics";
import { toFa } from "@/lib/format";
import { BarChart3, Activity, Eye, Search, Tag, Layers, TrendingUp } from "lucide-react";
import TimeRangeSelector from "./TimeRangeSelector";

export const dynamic = "force-dynamic";

/* ============================================================
   /admin/analytics — Analytics / BI dashboard (P1-2)
   ------------------------------------------------------------
   Time-range-aware analytics summary, rendered server-side.
   The `?days=` query param switches between 7 / 30 / 90-day
   windows. The TimeRangeSelector client component swaps the URL
   param so the page stays SSR-friendly + bookmarkable.

   Charts are pure CSS (no chart library dependency):
     • Event-by-type bar chart  — flexbox bars, width scaled to max.
     • Daily timeline            — vertical bars, height scaled to max.
   ============================================================ */

const EVENT_TYPE_LABELS: Record<string, string> = {
  LISTING_VIEW: "بازدید آگهی",
  SEARCH: "جستجو",
  CLICK: "کلیک",
  FAVORITE: "افزودن به علاقه‌مندی",
  COMPARE: "مقایسه",
  CONTACT: "تماس",
  SHARE: "اشتراک‌گذاری",
  REGISTER: "ثبت‌نام",
  LOGIN: "ورود",
  LISTING_CREATE: "ساخت آگهی",
  OFFER_MAKE: "ثبت پیشنهاد",
};

const TYPE_BAR_COLORS: Record<string, string> = {
  LISTING_VIEW: "bg-[#F58220]",
  SEARCH: "bg-amber-500",
  CLICK: "bg-rose-500",
  FAVORITE: "bg-pink-500",
  COMPARE: "bg-violet-500",
  CONTACT: "bg-emerald-500",
  SHARE: "bg-cyan-500",
  REGISTER: "bg-teal-500",
  LOGIN: "bg-lime-500",
  LISTING_CREATE: "bg-orange-600",
  OFFER_MAKE: "bg-fuchsia-500",
};

function faNumber(n: number): string {
  try {
    return n.toLocaleString("fa-IR");
  } catch {
    return String(n);
  }
}

function faDayLabel(isoDay: string): string {
  // isoDay = YYYY-MM-DD
  try {
    const d = new Date(isoDay + "T00:00:00Z");
    return d.toLocaleDateString("fa-IR", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoDay;
  }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const daysRaw = Number(sp.days ?? "7");
  const days =
    [7, 30, 90].includes(daysRaw) ? daysRaw : 7;

  const summary = await getAnalyticsSummary(days);

  // Build a stable union of all known event types so the chart shows
  // a slot for every type even if it had 0 events in the window —
  // the operator can see at a glance which flows are tracked but
  // currently quiet.
  const allTypes = ANALYTICS_EVENT_TYPES;
  const countByType = new Map(summary.byType.map((r) => [r.eventType, r.count]));
  const typeRows = allTypes.map((t) => ({
    eventType: t,
    label: EVENT_TYPE_LABELS[t] ?? t,
    count: countByType.get(t) ?? 0,
  }));
  const maxTypeCount = Math.max(1, ...typeRows.map((r) => r.count));

  // Daily timeline scaling
  const maxDaily = Math.max(1, ...summary.dailyTimeline.map((r) => r.count));

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <BarChart3 className="h-6 w-6 text-[#F58220]" />
            تحلیل و آمار
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            رویدادهای کاربر و فعالیت بازار در بازهٔ زمانی انتخاب‌شده —
            منبع داده: جدول AnalyticsEvent.
          </p>
        </div>
        <TimeRangeSelector current={days} />
      </div>

      {/* Total events banner */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={`کل رویدادها (${faNumber(days)} روز)`}
          value={faNumber(summary.totalEvents)}
          icon={Activity}
          cls="border-zinc-200 bg-white text-zinc-800"
        />
        <StatCard
          label="بازدید آگهی"
          value={faNumber(countByType.get("LISTING_VIEW") ?? 0)}
          icon={Eye}
          cls="border-[#F58220]/30 bg-[#F58220]/5 text-[#F58220]"
        />
        <StatCard
          label="جستجو"
          value={faNumber(countByType.get("SEARCH") ?? 0)}
          icon={Search}
          cls="border-amber-200 bg-amber-50 text-amber-700"
        />
        <StatCard
          label="ساخت آگهی"
          value={faNumber(countByType.get("LISTING_CREATE") ?? 0)}
          icon={TrendingUp}
          cls="border-emerald-200 bg-emerald-50 text-emerald-700"
        />
      </div>

      {/* Event count by type — CSS bar chart */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-[#F58220]" />
          <h2 className="text-sm font-bold text-zinc-800">
            تعداد رویداد به تفکیک نوع
          </h2>
        </div>
        <div className="space-y-2.5">
          {typeRows.map((r) => {
            const pct = (r.count / maxTypeCount) * 100;
            const barColor = TYPE_BAR_COLORS[r.eventType] ?? "bg-zinc-400";
            return (
              <div key={r.eventType} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-xs font-medium text-zinc-600">
                  {r.label}
                </div>
                <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-zinc-100">
                  <div
                    className={`absolute inset-y-0 right-0 ${barColor} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-start px-3 text-xs font-bold text-zinc-700">
                    {faNumber(r.count)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily timeline — CSS line/bar chart */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Activity size={18} className="text-[#F58220]" />
          <h2 className="text-sm font-bold text-zinc-800">
            خط زمانی روزانهٔ رویدادها
          </h2>
        </div>
        <div className="flex h-48 items-end gap-1 overflow-x-auto">
          {summary.dailyTimeline.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
              هیچ رویدادی در این بازه ثبت نشده است.
            </div>
          ) : (
            summary.dailyTimeline.map((d) => {
              const pct = (d.count / maxDaily) * 100;
              const heightPct = Math.max(2, pct);
              return (
                <div
                  key={d.day}
                  className="group flex min-w-[20px] flex-1 flex-col items-center gap-1"
                  title={`${faDayLabel(d.day)} — ${faNumber(d.count)} رویداد`}
                >
                  <div className="relative flex h-40 w-full items-end justify-center">
                    <div
                      className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-[#F58220] to-amber-300 transition-all group-hover:from-[#ff8c38] group-hover:to-amber-200"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-zinc-400">
                    {faDayLabel(d.day)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Top lists — 2x2 grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top viewed listings */}
        <TopListCard
          title="پربازدیدترین آگهی‌ها"
          icon={<Eye size={16} className="text-[#F58220]" />}
          emptyText="هنوز بازدیدی ثبت نشده است."
          rows={
            summary.topListings.length === 0
              ? []
              : summary.topListings.map((l) => ({
                  key: l.listingId,
                  primary: l.title,
                  secondary: `/listings/${l.slug}`,
                  value: `${faNumber(l.views)} بازدید`,
                  href: `/listings/${l.slug}`,
                }))
          }
        />

        {/* Top searched queries */}
        <TopListCard
          title="پرجستجوترین عبارت‌ها"
          icon={<Search size={16} className="text-amber-600" />}
          emptyText="هنوز جستجویی ثبت نشده است."
          rows={
            summary.topQueries.length === 0
              ? []
              : summary.topQueries.map((q, i) => ({
                  key: `${q.query}-${i}`,
                  primary: q.query,
                  secondary: null,
                  value: `${faNumber(q.count)} بار`,
                  href: `/listings?q=${encodeURIComponent(q.query)}`,
                }))
          }
        />

        {/* Top brands */}
        <TopListCard
          title="برندهای پرتعامل"
          icon={<Tag size={16} className="text-emerald-600" />}
          emptyText="هنوز رویدادی برای برندی ثبت نشده است."
          rows={
            summary.topBrands.length === 0
              ? []
              : summary.topBrands.map((b) => ({
                  key: b.brandId,
                  primary: b.brandName,
                  secondary: null,
                  value: `${faNumber(b.count)} رویداد`,
                  href: `/listings?brand=${encodeURIComponent(b.brandName)}`,
                }))
          }
        />

        {/* Top categories */}
        <TopListCard
          title="دسته‌های پرتعامل"
          icon={<Layers size={16} className="text-violet-600" />}
          emptyText="هنوز رویدادی برای دسته‌ای ثبت نشده است."
          rows={
            summary.topCategories.length === 0
              ? []
              : summary.topCategories.map((c) => ({
                  key: c.categoryId,
                  primary: c.categoryName,
                  secondary: null,
                  value: `${faNumber(c.count)} رویداد`,
                  href: `/listings?category=${encodeURIComponent(c.categoryName)}`,
                }))
          }
        />
      </div>

      {/* Schema / data-source note */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500">
        <p>
          داده‌ها از جدول <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">AnalyticsEvent</code> خوانده می‌شوند
          و شامل رویدادهای ۱۱ گانهٔ کاربری است. رویدادها به‌صورت fire-and-forget ثبت می‌شوند
          و هرگز چرخهٔ کاربر را متوقف نمی‌کنند.
        </p>
      </div>
    </div>
  );
}

/* ── Stat card ────────────────────────────────────────────── */
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
      <div className="min-w-0">
        <div className="truncate text-2xl font-black">{value}</div>
        <div className="truncate text-xs font-semibold opacity-80">{label}</div>
      </div>
    </div>
  );
}

/* ── Top list card (rows with primary/secondary/value) ───── */
type TopListRow = {
  key: string;
  primary: string;
  secondary: string | null;
  value: string;
  href?: string;
};

function TopListCard({
  title,
  icon,
  emptyText,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  emptyText: string;
  rows: TopListRow[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-800">
        {icon}
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg bg-zinc-50 p-4 text-center text-xs text-zinc-400">
          {emptyText}
        </div>
      ) : (
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {rows.map((r, i) => {
            const inner = (
              <div className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/60 p-2.5 transition hover:border-zinc-200 hover:bg-white">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-200/70 text-[11px] font-bold text-zinc-600">
                  {toFa(i + 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-zinc-800">
                    {r.primary}
                  </div>
                  {r.secondary && (
                    <div className="truncate font-mono text-[10px] text-zinc-400">
                      {r.secondary}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-xs font-bold text-[#F58220]">
                  {r.value}
                </div>
              </div>
            );
            return r.href ? (
              <Link key={r.key} href={r.href} className="block">
                {inner}
              </Link>
            ) : (
              <div key={r.key}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
