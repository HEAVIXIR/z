"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCompactPrice, PRICE_TYPE_LABELS, toFa } from "@/lib/format";
import { Sparkles, Eye, X, Star, MapPin, Calendar, Gauge, Tag } from "lucide-react";

/* ============================================================
   DashboardRecommendations — "پیشنهادهای شما" section on the
   user dashboard. Renders the pre-fetched recommendations from
   the server, with client-side dismiss (X) and click tracking.
   ============================================================ */

export type DashboardRecommendation = {
  id: string;
  slug: string;
  title: string;
  shortDesc?: string | null;
  description?: string | null;
  price: string | null;
  priceType: string;
  province?: string | null;
  city?: string | null;
  year: number | null;
  workingHours: number | null;
  featured: boolean;
  verified: boolean;
  viewCount: number;
  condition?: string | null;
  brand: { id: string; name: string; nameEn: string | null; slug: string } | null;
  category: { id: string; name: string; slug: string; icon: string | null } | null;
  image: string | null;
  reason: string;
  reasonLabel: string;
  score: number;
  recommendationId: string;
};

export default function DashboardRecommendations({
  recommendations,
}: {
  recommendations: DashboardRecommendation[];
}) {
  const [items, setItems] = useState(recommendations);

  const handleDismiss = async (item: DashboardRecommendation) => {
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    try {
      await fetch(`/api/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: item.id,
          reason: item.reason,
          action: "dismiss",
        }),
      });
    } catch {
      /* ignore — already removed from view */
    }
  };

  const handleClick = (item: DashboardRecommendation) => {
    fetch(`/api/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: item.id,
        reason: item.reason,
        action: "click",
      }),
    }).catch(() => {});
  };

  if (items.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-[#F58220]/20 bg-gradient-to-l from-[#F58220]/[0.07] via-white/[0.02] to-white/[0.02] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <Sparkles className="h-5 w-5 text-[#F58220]" />
            پیشنهادهای شما
          </h2>
          <p className="mt-1 text-xs text-white/45">
            بر اساس علاقه‌مندی‌ها و بازدیدهای شما انتخاب شده‌اند
          </p>
        </div>
        <Link
          href="/listings"
          className="rounded-full border border-[#F58220]/40 px-4 py-2 text-xs font-bold text-[#F58220] transition hover:bg-[#F58220]/10"
        >
          مشاهده همهٔ آگهی‌ها
        </Link>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((l) => (
          <RecCard
            key={l.id}
            item={l}
            onDismiss={handleDismiss}
            onClick={handleClick}
          />
        ))}
      </div>
    </section>
  );
}

function RecCard({
  item,
  onDismiss,
  onClick,
}: {
  item: DashboardRecommendation;
  onDismiss: (i: DashboardRecommendation) => void;
  onClick: (i: DashboardRecommendation) => void;
}) {
  const priceLabel =
    item.price != null
      ? formatCompactPrice(item.price)
      : PRICE_TYPE_LABELS[item.priceType] ?? "تماس بگیرید";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#111] transition-all duration-300 hover:border-[#F58220]/40">
      <button
        onClick={() => onDismiss(item)}
        aria-label="نمایش نده"
        title="نمایش نده"
        className="absolute left-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur transition hover:bg-red-500/80 hover:text-white"
      >
        <X className="h-3 w-3" />
      </button>

      <Link
        href={`/listings/${item.slug}`}
        onClick={() => onClick(item)}
        className="block"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-6xl opacity-80">
                {item.category?.icon ?? "🚜"}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#F58220] px-2.5 py-0.5 text-[10px] font-bold text-white">
            <Sparkles className="h-2.5 w-2.5" />
            {item.reasonLabel}
          </div>
          {item.featured && (
            <div className="absolute left-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-[#F58220]/90 px-2 py-0.5 text-[10px] font-bold text-white">
              <Star className="h-2.5 w-2.5 fill-current" />
              ویژه
            </div>
          )}
          <div className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur">
            <Eye className="h-2.5 w-2.5" />
            {toFa(item.viewCount)}
          </div>
        </div>

        <div className="p-4">
          <h3 className="line-clamp-1 text-sm font-bold text-white transition-colors group-hover:text-[#F58220]">
            {item.title}
          </h3>
          <div className="mt-1 text-[11px] text-[#F58220]">
            {item.brand?.name ?? "بدون برند"}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/55">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-[#F58220]" />
              {item.city ?? "-"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 text-[#F58220]" />
              {item.year ? toFa(item.year) : "-"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3 w-3 text-[#F58220]" />
              {item.workingHours ? toFa(item.workingHours) : "-"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Tag className="h-3 w-3 text-[#F58220]" />
              {item.brand?.name ?? "-"}
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between border-t border-white/5 pt-3">
            <div>
              <div className="text-[10px] text-white/40">قیمت</div>
              <div className="mt-0.5 text-base font-black text-[#F58220]">
                {priceLabel}
              </div>
            </div>
            <span className="inline-flex h-8 items-center justify-center rounded-lg bg-[#F58220] px-3 text-xs font-bold text-white transition group-hover:bg-[#ff8c38]">
              مشاهده
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
