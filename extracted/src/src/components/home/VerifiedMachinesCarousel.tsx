"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, ShieldCheck } from "lucide-react";
import { formatCompactPrice, PRICE_TYPE_LABELS, toFa } from "@/lib/format";
import type { FeaturedListing } from "./FeaturedMachineCard";

/* ============================================================
   VerifiedMachinesCarousel — "ماشین‌آلات تأییدشدهٔ هویکس"

   Focus-based 3D coverflow carousel (jitter.video style).
   Center card is large + sharp + elevated; side cards are
   smaller, blurred, lower opacity — simulating depth of field.

   Auto-plays every 3.5s. Pauses on hover. Click side cards
   to focus them. Arrow-key navigation.
   ============================================================ */

type CmsConfig = { title?: string; subtitle?: string; description?: string };

export default function VerifiedMachinesCarousel({
  listings,
  cmsConfig,
  limit,
}: {
  listings: FeaturedListing[];
  cmsConfig?: CmsConfig;
  limit?: number;
}) {
  const maxItems = limit && limit > 0 ? limit : 8;
  const items = listings.slice(0, maxItems);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = items.length;
  const goNext = () => setActive((c) => (c + 1) % total);
  const goPrev = () => setActive((c) => (c - 1 + total) % total);

  // Auto-play
  useEffect(() => {
    if (paused || total <= 1) return;
    timerRef.current = setInterval(goNext, 3500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, total, active]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goPrev();
      if (e.key === "ArrowLeft") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  if (total === 0) return null;

  // Compute relative position for each card: -2, -1, 0, 1, 2
  // 0 = center/active, negative = left, positive = right
  const getOffset = (index: number) => {
    let offset = index - active;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    return offset;
  };

  const priceLabel = (l: FeaturedListing) =>
    l.price != null ? formatCompactPrice(l.price) : PRICE_TYPE_LABELS[l.priceType] ?? "تماس بگیرید";

  return (
    <section
      className="relative overflow-hidden py-20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(245,130,32,0.12),transparent_70%)]" />

      {/* Header */}
      <div className="mx-auto mb-10 max-w-3xl px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#F58220]">
          {cmsConfig?.subtitle || "HEAVIX VERIFIED"}
        </span>
        <h2 className="mt-3 text-3xl font-black text-white lg:text-5xl">
          {cmsConfig?.title || "ماشین‌آلات تأییدشدهٔ هویکس"}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">
          {cmsConfig?.description ||
            "دستگاه‌های منتخب و کارشناسی‌شده — تأیید فنی، حقوقی و بدنه توسط تیم هویکس."}
        </p>
      </div>

      {/* Coverflow viewport */}
      <div
        className="relative mx-auto flex h-[440px] max-w-[1200px] items-center justify-center overflow-hidden px-4"
        style={{ perspective: "1400px" }}
      >
        {items.map((item, index) => {
          const offset = getOffset(index);
          const absOffset = Math.abs(offset);
          const isActive = offset === 0;
          const isHidden = absOffset > 2;

          // Coverflow transform: center card straight, side cards rotated + pushed
          const rotateY = offset * -25;
          const translateX = offset * 200;
          const translateZ = isActive ? 60 : -Math.abs(offset) * 120;
          const scale = isActive ? 1 : Math.max(0.7, 1 - absOffset * 0.15);
          const opacity = isActive ? 1 : Math.max(0.25, 1 - absOffset * 0.35);
          const blur = isActive ? 0 : absOffset * 1.5;

          return (
            <div
              key={item.id}
              className="absolute transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                opacity: isHidden ? 0 : opacity,
                filter: `blur(${blur}px)`,
                zIndex: isActive ? 30 : 20 - absOffset * 5,
                pointerEvents: isActive ? "auto" : isHidden ? "none" : "auto",
                transformStyle: "preserve-3d",
              }}
              onClick={() => { if (!isActive) setActive(index); }}
            >
              <CoverflowCard item={item} isActive={isActive} priceLabel={priceLabel(item)} />
            </div>
          );
        })}

        {/* Nav arrows */}
        <button
          onClick={goPrev}
          className="absolute right-4 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:border-[#F58220] hover:bg-[#F58220]/20"
          aria-label="قبلی"
        >
          <ArrowLeft size={22} />
        </button>
        <button
          onClick={goNext}
          className="absolute left-4 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:border-[#F58220] hover:bg-[#F58220]/20"
          aria-label="بعدی"
        >
          {/* mirrored arrow for RTL "next" */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-2 left-1/2 z-40 flex -translate-x-1/2 gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? "w-8 bg-[#F58220]" : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`اسلاید ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex justify-center">
        <Link
          href="/listings?verified=true"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 text-white transition-all duration-300 hover:border-[#F58220]/30 hover:bg-white/10"
        >
          مشاهده همه ماشین‌آلات تأییدشده
        </Link>
      </div>
    </section>
  );
}

/* ===================== Coverflow Card ===================== */
function CoverflowCard({
  item,
  isActive,
  priceLabel,
}: {
  item: FeaturedListing;
  isActive: boolean;
  priceLabel: string;
}) {
  return (
    <Link href={isActive ? `/listings/${item.slug}` : "#"} className="group/card block" onClick={(e) => { if (!isActive) e.preventDefault(); }}>
      <div
        className={`relative overflow-hidden rounded-3xl border transition-all duration-500 ${
          isActive
            ? "border-[#F58220]/50 shadow-[0_30px_80px_rgba(245,130,32,.25)]"
            : "border-white/10 shadow-[0_15px_40px_rgba(0,0,0,.4)]"
        } ${isActive ? "w-[576px]" : "w-[320px]"}`}
        style={{ backfaceVisibility: "hidden" }}
      >
        {/* Image */}
        <div className={`relative overflow-hidden bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c] ${isActive ? "aspect-[16/10]" : "aspect-[16/11]"}`}>
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              className={`h-full w-full object-cover transition-transform duration-700 ${
                isActive ? "group-hover/card:scale-110" : ""
              }`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl opacity-80">
              {item.icon ?? "🚜"}
            </div>
          )}
          {/* Darker gradient for active card so text is readable */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent ${isActive ? "" : "from-black/80"}`} />

          {/* Verified badge */}
          {item.verified && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#F58220]/20 px-2.5 py-1 text-[9px] font-black text-[#F58220] backdrop-blur-md">
              <ShieldCheck className="h-3 w-3" />
              تأییدشده
            </span>
          )}

          {/* View count — top left */}
          {isActive && item.viewCount != null && (
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white/80 backdrop-blur">
              <Eye className="h-3 w-3 text-[#F58220]" />
              {toFa(item.viewCount)} بازدید
            </div>
          )}
        </div>

        {/* Content overlay — on active card: full details; on inactive: minimal */}
        {isActive ? (
          <div className="absolute inset-x-0 bottom-0 p-6">
            {/* Brand */}
            <div className="text-xs font-bold uppercase tracking-wider text-[#F58220]">
              {item.brandName ?? "بدون برند"}
            </div>
            {/* Title */}
            <h3 className="mt-1.5 line-clamp-2 text-xl font-bold leading-7 text-white">
              {item.title}
            </h3>
            {/* Short description */}
            {item.shortDesc && (
              <p className="mt-1.5 line-clamp-1 text-xs text-white/50">
                {item.shortDesc}
              </p>
            )}
            {/* Meta info row */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {/* Price — prominent */}
              <span className="rounded-full bg-[#F58220] px-4 py-1.5 text-sm font-black text-[#09090b]">
                {priceLabel}
              </span>
              {/* Year */}
              {item.year && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
                  📅 {toFa(item.year)}
                </span>
              )}
              {/* City */}
              {item.city && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
                  📍 {item.city}
                </span>
              )}
              {/* Working hours */}
              {item.workingHours != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
                  ⏱ {toFa(item.workingHours)} ساعت
                </span>
              )}
              {/* Condition */}
              {item.condition && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
                  🔧 {item.condition}
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Inactive card — minimal info */
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#F58220]">
              {item.brandName ?? "بدون برند"}
            </div>
            <h3 className="mt-1 line-clamp-1 text-sm font-bold text-white">
              {item.title}
            </h3>
            <div className="mt-2">
              <span className="rounded-full bg-[#F58220] px-2.5 py-0.5 text-[10px] font-black text-[#09090b]">
                {priceLabel}
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
