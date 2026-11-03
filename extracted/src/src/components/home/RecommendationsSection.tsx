"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import GlassPanel from "@/components/ui/GlassPanel";
import TrustBadge from "@/components/listings/TrustBadge";
import { formatCompactPrice, PRICE_TYPE_LABELS, toFa } from "@/lib/format";
import {
  Sparkles,
  Eye,
  MapPin,
  Calendar,
  Gauge,
  Tag,
  X,
  Loader2,
  TrendingUp,
} from "lucide-react";

/* ============================================================
   RecommendationsSection — "پیشنهادها برای شما" / "پربازدیدترین
   ماشین‌آلات" homepage section.

   FIX-ANIMATIONS-BRANDS — FIX 2:
     • Cards animate in on scroll (staggered fade + slide-up).
     • Each card gently floats (subtle continuous up-down) via the
       .float-soft CSS keyframe so the section is never visually
       static while in view.

   - On mount, fetches /api/recommendations (auth-required). If the
     user is signed in, the engine returns personalized recs.
   - If not authed OR no recs exist, falls back to /api/listings to
     show trending listings (top-published by featured+recent).
   - Authenticated users see a per-card dismiss (X) button that POSTs
     {action:"dismiss"} to /api/recommendations.
   - Clicking a card POSTs {action:"click"} for analytics.
   ============================================================ */

type RecListing = {
  id: string;
  slug: string;
  title: string;
  shortDesc?: string | null;
  description?: string | null;
  price: string | null;
  priceType: string;
  brand: { id: string; name: string; nameEn: string | null; slug: string } | null;
  category: { id: string; name: string; slug: string; icon: string | null } | null;
  image: string | null;
  year: number | null;
  city: string | null;
  province?: string | null;
  workingHours: number | null;
  condition?: string | null;
  featured: boolean;
  verified: boolean;
  viewCount?: number;
  // Recommendation metadata (absent on the trending fallback)
  reason?: string;
  reasonLabel?: string;
  score?: number;
  recommendationId?: string;
};

const FALLBACK_LIMIT = 8;

export default function RecommendationsSection() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RecListing[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFallback = useCallback(async (): Promise<RecListing[]> => {
    try {
      const res = await fetch(`/api/listings?limit=${FALLBACK_LIMIT}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.success) return [];
      return (json.data ?? []).map((l: any) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        shortDesc: l.shortDesc,
        description: l.description,
        price: l.price,
        priceType: l.priceType,
        brand: l.brand,
        category: l.category,
        image: l.images?.[0]?.url ?? null,
        year: l.year,
        city: l.city,
        province: l.province,
        workingHours: l.workingHours,
        condition: l.condition,
        featured: l.featured,
        verified: l.verified,
        viewCount: l.viewCount ?? 0,
        // Mark as trending fallback so we can render the right badge.
        reason: "TRENDING",
        reasonLabel: "پربازدیدترین‌ها",
      }));
    } catch {
      return [];
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recommendations?limit=8&refresh=1`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        // Not authed — show trending fallback.
        setIsAuthed(false);
        const fb = await loadFallback();
        setItems(fb);
      } else if (res.ok) {
        const json = await res.json();
        if (json.success && (json.data ?? []).length > 0) {
          setIsAuthed(true);
          setItems(json.data);
        } else {
          // Authed but no recs yet — show trending fallback.
          setIsAuthed(true);
          const fb = await loadFallback();
          setItems(fb);
        }
      } else {
        setError("خطا در دریافت پیشنهادها");
        const fb = await loadFallback();
        setItems(fb);
      }
    } catch {
      setError("خطا در ارتباط با سرور");
      const fb = await loadFallback();
      setItems(fb);
    } finally {
      setLoading(false);
    }
  }, [loadFallback]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDismiss = async (item: RecListing) => {
    if (!item.reason || !item.recommendationId) return;
    // Optimistic removal
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

  const handleClick = (item: RecListing) => {
    if (!item.reason || !isAuthed) return;
    // Fire-and-forget click record.
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

  if (loading) {
    return (
      <section className="relative overflow-hidden py-20">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#F58220]">
              FOR YOU
            </span>
            <h2 className="mt-3 text-3xl font-black text-white">پیشنهادها برای شما</h2>
          </div>
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    // Don't render an empty section — keeps the homepage clean.
    return null;
  }

  return (
    <section className="relative overflow-hidden py-20">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <div className="mb-10 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#F58220]">
            {isAuthed ? "FOR YOU" : "TRENDING"}
          </span>
          <h2 className="mt-3 text-3xl font-black text-white">
            {isAuthed ? "پیشنهادها برای شما" : "پربازدیدترین ماشین‌آلات"}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/45">
            {isAuthed
              ? "بر اساس علاقه‌مندی‌ها و بازدیدهای شما انتخاب شده‌اند"
              : "برای دریافت پیشنهادهای شخصی‌سازی‌شده وارد حساب خود شوید"}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-400">
            {error} — نمایش پربازدیدترین‌ها
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {items.map((l, i) => (
            <RevealAndFloat key={`${l.id}-${l.reason ?? "trending"}`} index={i}>
              <RecommendationCard
                l={l}
                onDismiss={isAuthed ? handleDismiss : undefined}
                onClick={isAuthed ? handleClick : undefined}
              />
            </RevealAndFloat>
          ))}
        </div>

        <div className="mt-10 flex justify-center gap-3">
          <Link
            href="/listings"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 text-sm font-bold text-white transition-all duration-300 hover:border-[#F58220]/30 hover:bg-white/10"
          >
            مشاهده همهٔ آگهی‌ها
          </Link>
          {!isAuthed && (
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
            >
              ورود برای پیشنهادهای شخصی
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function RecommendationCard({
  l,
  onDismiss,
  onClick,
}: {
  l: RecListing;
  onDismiss?: (l: RecListing) => void;
  onClick?: (l: RecListing) => void;
}) {
  const priceLabel =
    l.price != null
      ? formatCompactPrice(l.price)
      : PRICE_TYPE_LABELS[l.priceType] ?? "تماس بگیرید";

  return (
    <GlassPanel className="group relative h-full overflow-hidden rounded-3xl border border-white/10 transition-all duration-500 hover:-translate-y-2 hover:border-[#F58220]/40 hover:shadow-[0_20px_60px_rgba(0,0,0,.35)]">
      {/* Dismiss button (only on authed recs) */}
      {onDismiss && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss(l);
          }}
          aria-label="نمایش نده"
          title="نمایش نده"
          className="absolute left-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur transition hover:bg-red-500/80 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <Link
        href={`/listings/${l.slug}`}
        onClick={() => onClick?.(l)}
        className="block"
      >
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
          {l.image ? (
            <img
              src={l.image}
              alt={l.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-7xl opacity-80 transition-transform duration-700 group-hover:scale-110">
                {l.category?.icon ?? "🚜"}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top-right: reason badge */}
          <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#F58220] px-3 py-1 text-xs font-bold text-white">
            {l.reason === "TRENDING" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {l.reasonLabel ?? "پیشنهاد"}
          </div>

          {/* Top-left: trust badge */}
          <div className="absolute left-4 top-4">
            <TrustBadge listing={l} />
          </div>

          {/* Bottom row: brand + views */}
          <div className="absolute inset-x-4 bottom-3 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wide text-[#F58220]">
              {l.brand?.name ?? "بدون برند"}
            </span>
            {l.viewCount != null && (
              <span className="inline-flex items-center gap-1 text-[10px] text-white/60">
                <Eye className="h-3 w-3" />
                {toFa(l.viewCount)}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="line-clamp-2 text-xl font-bold leading-8 text-white transition-colors group-hover:text-[#F58220]">
            {l.title}
          </h3>

          {l.shortDesc && (
            <p className="mt-2 line-clamp-2 text-xs leading-6 text-white/45">
              {l.shortDesc}
            </p>
          )}

          {/* Meta grid */}
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-white/55">
            <span className="inline-flex items-center gap-1.5 justify-start">
              <MapPin className="h-3.5 w-3.5 text-[#F58220]" />
              {l.city ?? "-"}
            </span>
            <span className="inline-flex items-center gap-1.5 justify-end">
              {l.year ? toFa(l.year) : "-"}
              <Calendar className="h-3.5 w-3.5 text-[#F58220]" />
            </span>
            <span className="inline-flex items-center gap-1.5 justify-start">
              <Gauge className="h-3.5 w-3.5 text-[#F58220]" />
              {l.workingHours ? toFa(l.workingHours) : "-"}
            </span>
            <span className="inline-flex items-center gap-1.5 justify-end">
              {l.brand?.name ?? "-"}
              <Tag className="h-3.5 w-3.5 text-[#F58220]" />
            </span>
          </div>

          <div className="mt-6 flex items-end justify-between">
            <div>
              <div className="text-xs text-white/50">قیمت</div>
              <div className="mt-1 text-2xl font-black text-[#F58220]">{priceLabel}</div>
            </div>
            <span className="inline-flex h-10 items-center justify-center rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition group-hover:bg-[#ff8c38]">
              مشاهده جزئیات
            </span>
          </div>
        </div>
      </Link>
    </GlassPanel>
  );
}

/* ============================================================
   RevealAndFloat — wrapper that:
     1. fades + slides up the card on first scroll into view
        (staggered via index), and
     2. applies a gentle continuous float (.float-soft) once visible
        so the section never looks static.
   Respects prefers-reduced-motion.
   ============================================================ */
function RevealAndFloat({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transitionDelay = `${Math.min(index * 90, 720)}ms`;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [index]);

  // Pick one of 4 float delay variants so cards don't bob in sync.
  const floatDelayClass = ["", "delay-1", "delay-2", "delay-3"][
    index % 4
  ];

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className={shown ? `float-soft ${floatDelayClass}` : ""}>
        {children}
      </div>
    </div>
  );
}
