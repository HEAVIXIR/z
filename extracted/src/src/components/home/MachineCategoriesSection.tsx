"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toFa } from "@/lib/format";
import SectionTitle from "@/components/ui/SectionTitle";

/* ============================================================
   MachineCategoriesSection — FIX-SERVICES-KNOWLEDGE-CATS-BRANDS
   (Part 5) + FIX-ANIMATIONS-BRANDS (FIX 4).

   Client component. Renders the machine category cards in a
   CURVED MARQUEE — cards scroll horizontally and follow a
   slight arc (transform: translateY based on each card's
   position relative to the center of the visible strip).

   The curve is implemented by computing each card's vertical
   offset from its horizontal midpoint in the row using a
   sine-like formula. The track itself uses the .curve-scroll
   CSS keyframe (continuous left scroll, pause on hover).

   Categories are passed from the server (page.tsx) based on
   the admin's HomeCategoryConfig (generation 1 = L1 of
   machinery root, or generation 2 = L2 children of a selected
   L1 parent). The admin config page (/admin/home/categories)
   keeps working unchanged.
   ============================================================ */

export type MachineCategoryCard = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  description: string | null;
  listingCount: number;
};

export default function MachineCategoriesSection({
  categories,
  config,
  cmsConfig,
}: {
  categories: MachineCategoryCard[];
  config: { generation: number; parentId: string | null };
  cmsConfig?: { title?: string; subtitle?: string; description?: string };
}) {
  if (!categories || categories.length === 0) return null;

  const isL2 = config.generation === 2;
  // Take up to 12 categories; duplicate for the seamless marquee loop.
  const base = categories.slice(0, 12);
  const loop = base.length >= 6 ? [...base, ...base] : [...base, ...base, ...base];

  return (
    <section
      id="categories"
      className="relative overflow-hidden bg-[#0a0a0a] py-24"
      aria-label="دسته‌بندی ماشین‌آلات"
    >
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Orange curve glow following the marquee arc */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-0 h-72 -translate-y-1/2 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(245,130,32,0.08),transparent_70%)]" />

      <div className="relative mx-auto max-w-[1440px] px-6 lg:px-10">
        {/* Header */}
        <div className="mb-12 flex flex-col items-center text-center">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#F58220]">
            {cmsConfig?.subtitle || (isL2 ? "MACHINERY FAMILIES" : "Categories")}
          </span>
          <h2 className="mt-3 text-3xl font-black text-white lg:text-5xl">
            {cmsConfig?.title || "دسته‌بندی ماشین‌آلات"}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/45">
            {cmsConfig?.description ||
              (isL2
                ? "خانواده‌های تخصصی ماشین‌آلات را کاوش کنید"
                : "ماشین‌آلات موردنظر خود را در گروه‌های تخصصی پیدا کنید")}
          </p>
        </div>
      </div>

      {/* Curved marquee — full-bleed */}
      <CurvedMarquee cards={loop} />

      {/* CTA */}
      <div className="relative mt-10 flex justify-center">
        <Link
          href="/listings"
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 text-sm font-bold text-white transition-all duration-300 hover:border-[#F58220]/40 hover:bg-[#F58220]/10 hover:text-[#F58220]"
        >
          همهٔ دسته‌ها
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── */

/* Curved marquee — cards scroll horizontally along a slight arc.
   We use a single .curve-scroll track that translates left
   infinitely. Each card is positioned with an inline CSS variable
   --arc-y that gives it a vertical offset following a sine curve,
   creating the visual impression that the row follows a curved
   path. Cards at the center sit lower; cards at the edges rise
   slightly. The arc is subtle so the layout still reads as a
   horizontal strip. */
function CurvedMarquee({ cards }: { cards: MachineCategoryCard[] }) {
  // We assign each card a phase based on its index in the loop.
  // The arc formula: y = -arcAmp * cos(phase * 2π / period)
  // where period is the number of unique cards (cards.length / 2).
  const uniqueCount = Math.max(1, Math.floor(cards.length / 2));
  const ARC_AMP = 28; // px — peak vertical displacement
  const PERIOD = uniqueCount; // one full sine cycle per loop

  return (
    <div
      dir="ltr"
      className="group relative overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
      }}
    >
      <div className="curve-scroll flex w-max items-center gap-5 px-5 py-10 transition-[animation-play-state] duration-300 group-hover:[animation-play-state:paused]">
        {cards.map((c, i) => {
          const phase = (i % PERIOD) / PERIOD; // 0..1
          const y = -ARC_AMP * Math.cos(phase * Math.PI * 2);
          const rot = (Math.sin(phase * Math.PI * 2) * 6).toFixed(2); // ±6° tilt
          return (
            <div
              key={`${c.id}-${i}`}
              dir="rtl"
              className="shrink-0"
              style={{
                transform: `translateY(${y}px) rotate(${rot}deg)`,
              }}
            >
              <CategoryCard cat={c} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryCard({ cat }: { cat: MachineCategoryCard }) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -20px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Link
      ref={ref}
      href={`/listings?category=${cat.slug}`}
      className={`group relative flex w-[240px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#141414] to-[#0c0c0c] transition-all duration-500 hover:scale-[1.04] hover:border-[#F58220]/50 hover:shadow-[0_25px_60px_-15px_rgba(245,130,32,0.4)] ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ willChange: "transform, opacity" }}
    >
      {/* Image / icon area */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
        {cat.imageUrl ? (
          <img
            src={cat.imageUrl}
            alt={cat.name}
            className="h-full w-full object-cover opacity-80 transition-all duration-500 group-hover:scale-110 group-hover:opacity-95"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl opacity-70 transition-transform duration-500 group-hover:scale-110">
            <span aria-hidden>{cat.icon ?? "🚜"}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        {/* Top accent bar (animated on hover) */}
        <span className="absolute inset-x-0 top-0 h-0.5 origin-right scale-x-0 bg-[#F58220] transition-transform duration-300 group-hover:scale-x-100" />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-black text-white transition-colors group-hover:text-[#F58220]">
          {cat.name}
        </h3>
        {cat.nameEn && (
          <p className="mt-0.5 truncate text-[10px] text-white/30" dir="ltr">
            {cat.nameEn}
          </p>
        )}
        {cat.description && (
          <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-white/40">
            {cat.description}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
          <span className="rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-bold text-white/70">
            {toFa(cat.listingCount)} آگهی
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#F58220] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            مشاهده
            <ArrowLeft className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
