"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   TrustedBrandsSection — FIX-SERVICES-KNOWLEDGE-CATS-BRANDS
   (Part 6) + FIX-ANIMATIONS-BRANDS (FIX 5).

   Client component. Renders featured/trusted brands in a
   continuous horizontal ticker animation (CSS keyframes
   `ticker-scroll`), with pause-on-hover. Each brand shows its
   logo (or first-letter fallback) + name + country.

   Props:
     • brands         — server-fetched trusted brands
     • totalBrands    — total brand count for the footer caption
     • title          — admin-set title (default "برندهای مورد اعتماد هویکس")
     • subtitle       — admin-set badge (default "TRUSTED BRANDS")
     • description    — admin-set paragraph under the title
     • tickerSpeed    — admin-set seconds for one full loop
   ============================================================ */

export type TrustedBrand = {
  id: string;
  name: string;
  slug: string;
  nameEn?: string | null;
  logoUrl?: string | null;
  country?: string | null;
  listingCount?: number;
};

export default function TrustedBrandsSection({
  brands,
  totalBrands,
  title,
  subtitle,
  description,
  tickerSpeed,
}: {
  brands: TrustedBrand[];
  totalBrands?: number;
  title?: string;
  subtitle?: string;
  description?: string;
  tickerSpeed?: number;
}) {
  if (!brands || brands.length === 0) return null;

  // Duplicate the list so the marquee loops seamlessly. Need at
  // least ~8 items for a smooth scroll; if we have fewer, triple it.
  const base = brands.slice(0, 20);
  const loop =
    base.length >= 8 ? [...base, ...base] : [...base, ...base, ...base];

  // Speed: seconds for one full loop. Lower = faster.
  const speed =
    typeof tickerSpeed === "number" && tickerSpeed >= 10 && tickerSpeed <= 240
      ? tickerSpeed
      : Math.max(30, base.length * 4);

  return (
    <section
      id="trusted-brands"
      className="relative overflow-hidden border-y border-white/5 bg-[#0b0b0b] py-16"
      aria-label="برندهای مورد اعتماد"
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#F58220]">
            {subtitle || "TRUSTED BRANDS"}
          </span>
          <h2 className="mt-3 text-2xl font-black text-white lg:text-4xl">
            {title || "برندهای مورد اعتماد هویکس"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
            {description ||
              `بزرگ‌ترین برندهای سازندهٔ ماشین‌آلات سنگین جهان در کنار شما${
                totalBrands ? ` — ${toFa(totalBrands)} برند در پلتفرم هویکس` : ""
              }`}
          </p>
        </div>
      </div>

      {/* Ticker — full-bleed, mask-faded edges */}
      <div
        className="group relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
        }}
      >
        <div className="ticker-track flex w-max gap-4 px-4 transition-[animation-play-state] duration-300 group-hover:[animation-play-state:paused]">
          {loop.map((b, i) => (
            <BrandChip key={`${b.id}-${i}`} brand={b} />
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/listings"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 text-sm font-bold text-white transition-all duration-300 hover:border-[#F58220]/40 hover:bg-[#F58220]/10 hover:text-[#F58220]"
        >
          همهٔ برندها
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      {/* Local CSS keyframes — scoped so the animation duration can
          be controlled by the admin-set tickerSpeed prop. */}
      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker-scroll ${speed}s linear infinite;
        }
        /* RTL: reverse the scroll direction so brands enter from the right
           (which feels natural for Persian readers). */
        [dir="rtl"] .ticker-track {
          animation-direction: reverse;
        }
      `}</style>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── */

function BrandChip({ brand }: { brand: TrustedBrand }) {
  return (
    <Link
      href={`/listings?brand=${brand.slug}`}
      className="group/chip flex h-28 w-56 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-[#141414] to-[#0c0c0c] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#F58220]/50 hover:shadow-[0_15px_35px_-10px_rgba(245,130,32,0.35)]"
    >
      <span className="flex h-12 w-24 items-center justify-center overflow-hidden rounded-lg bg-white/95 p-1.5 shadow-inner transition-transform duration-300 group-hover/chip:scale-105">
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt={brand.name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-2xl font-black text-[#F58220]">
            {(brand.nameEn ?? brand.name).charAt(0)}
          </span>
        )}
      </span>
      <span className="line-clamp-1 text-xs font-bold text-white/70 transition group-hover/chip:text-[#F58220]">
        {brand.name}
      </span>
      <div className="flex items-center gap-2 text-[10px] text-white/40">
        {brand.country && <span>{brand.country}</span>}
        {brand.listingCount ? (
          <>
            <span className="text-white/20">·</span>
            <span>{toFa(brand.listingCount)} آگهی</span>
          </>
        ) : null}
      </div>
    </Link>
  );
}
