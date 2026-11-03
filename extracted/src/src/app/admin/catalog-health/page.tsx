import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Image as ImageIcon,
  DollarSign,
  Tag,
  FolderTree,
  FileText,
  Calendar,
  MapPin,
  Eye,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CatalogHealthPage() {
  const [
    totalListings,
    publishedListings,
    missingImage,
    missingPrice,
    missingBrand,
    missingCategory,
    missingDescription,
    missingYear,
    missingProvince,
    pausedListings,
    expiredListings,
  ] = await Promise.all([
    db.listing.count(),
    db.listing.count({ where: { status: "PUBLISHED" } }),
    db.listing.count({
      where: { status: "PUBLISHED", images: { none: {} } },
    }),
    db.listing.count({ where: { status: "PUBLISHED", price: null } }),
    db.listing.count({ where: { status: "PUBLISHED", brandId: null } }),
    db.listing.count({ where: { status: "PUBLISHED", categoryId: null } }),
    db.listing.count({
      where: {
        status: "PUBLISHED",
        OR: [{ description: null }, { description: "" }],
      },
    }),
    db.listing.count({ where: { status: "PUBLISHED", year: null } }),
    db.listing.count({ where: { status: "PUBLISHED", province: null } }),
    db.listing.count({ where: { status: "PAUSED" } }),
    db.listing.count({
      where: { expiresAt: { lt: new Date() } },
    }),
  ]);

  const issues = [
    {
      label: "آگهی بدون تصویر",
      count: missingImage,
      icon: ImageIcon,
      color: "text-red-600",
      bg: "bg-red-100",
      severity: "high",
    },
    {
      label: "آگهی بدون قیمت",
      count: missingPrice,
      icon: DollarSign,
      color: "text-amber-600",
      bg: "bg-amber-100",
      severity: "medium",
    },
    {
      label: "آگهی بدون برند",
      count: missingBrand,
      icon: Tag,
      color: "text-amber-600",
      bg: "bg-amber-100",
      severity: "medium",
    },
    {
      label: "آگهی بدون دسته‌بندی",
      count: missingCategory,
      icon: FolderTree,
      color: "text-red-600",
      bg: "bg-red-100",
      severity: "high",
    },
    {
      label: "آگهی بدون توضیحات",
      count: missingDescription,
      icon: FileText,
      color: "text-amber-600",
      bg: "bg-amber-100",
      severity: "medium",
    },
    {
      label: "آگهی بدون سال ساخت",
      count: missingYear,
      icon: Calendar,
      color: "text-zinc-600",
      bg: "bg-zinc-100",
      severity: "low",
    },
    {
      label: "آگهی بدون استان",
      count: missingProvince,
      icon: MapPin,
      color: "text-zinc-600",
      bg: "bg-zinc-100",
      severity: "low",
    },
    {
      label: "آگهی متوقف‌شده",
      count: pausedListings,
      icon: Eye,
      color: "text-amber-600",
      bg: "bg-amber-100",
      severity: "medium",
    },
    {
      label: "آگهی منقضی‌شده",
      count: expiredListings,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-100",
      severity: "high",
    },
  ];

  // Health score: weighted formula
  const weights = {
    high: 12,
    medium: 6,
    low: 3,
  };
  const totalPenalty = issues.reduce(
    (sum, i) => sum + Math.min(i.count, 10) * weights[i.severity as keyof typeof weights],
    0,
  );
  const healthScore = Math.max(0, Math.min(100, 100 - totalPenalty));

  const scoreColor =
    healthScore >= 85 ? "text-emerald-600" : healthScore >= 65 ? "text-amber-600" : "text-red-600";
  const scoreBg =
    healthScore >= 85 ? "bg-emerald-100" : healthScore >= 65 ? "bg-amber-100" : "bg-red-100";
  const scoreLabel =
    healthScore >= 85 ? "عالی" : healthScore >= 65 ? "متوسط" : "ضعیف";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">سلامت کاتالوگ</h1>
        <p className="mt-1 text-sm text-zinc-500">
          بررسی کیفیت آگهی‌ها و شناسایی موارد نیازمند بهبود
        </p>
      </div>

      {/* Health score */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-xs font-bold text-zinc-500">امتیاز سلامت کاتالوگ</p>
          <div className="mt-3 flex items-end gap-2">
            <span className={`text-5xl font-black ${scoreColor}`}>
              {toFa(healthScore)}
            </span>
            <span className="mb-1 text-sm text-zinc-500">از {toFa(100)}</span>
          </div>
          <span
            className={`mt-3 inline-flex items-center gap-1 rounded-full ${scoreBg} px-3 py-1 text-xs font-bold ${scoreColor}`}
          >
            {healthScore >= 85 ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {scoreLabel}
          </span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-xs font-bold text-zinc-500">کل آگهی‌ها</p>
          <p className="mt-3 text-4xl font-black text-zinc-900">{toFa(totalListings)}</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {toFa(publishedListings)} منتشرشده
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-xs font-bold text-zinc-500">کل مشکلات شناسایی‌شده</p>
          <p className="mt-3 text-4xl font-black text-zinc-900">
            {toFa(issues.reduce((s, i) => s + i.count, 0))}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">در {toFa(issues.length)} دسته</p>
        </div>
      </div>

      {/* Issues grid */}
      <div>
        <h2 className="mb-4 text-lg font-black text-zinc-900">مشکلات شناسایی‌شده</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {issues.map((i) => {
            const pct = publishedListings > 0 ? Math.round((i.count / publishedListings) * 100) : 0;
            return (
              <div
                key={i.label}
                className="rounded-2xl border border-zinc-200 bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${i.bg}`}
                  >
                    <i.icon className={`h-5 w-5 ${i.color}`} />
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      i.severity === "high"
                        ? "bg-red-100 text-red-700"
                        : i.severity === "medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {i.severity === "high"
                      ? "بحرانی"
                      : i.severity === "medium"
                        ? "متوسط"
                        : "کم"}
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold text-zinc-900">{i.label}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-2xl font-black ${i.color}`}>
                    {toFa(i.count)}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    ({toFa(pct)}٪ از آگهی‌ها)
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`h-full ${
                      i.severity === "high"
                        ? "bg-red-500"
                        : i.severity === "medium"
                          ? "bg-amber-500"
                          : "bg-zinc-400"
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
