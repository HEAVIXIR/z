"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import HeroStatsPanel from "./HeroStatsPanel";

export type HeroStat = { value: string; label: string };

export type HeroCardListing = {
  slug: string;
  title: string;
  price: string | null;
  priceType: string;
  image: string | null;
  brandName?: string | null;
};

export type HeroConfig = {
  badge?: string | null; title1?: string | null; highlight?: string | null; subtitle?: string | null;
  buttonText?: string | null; buttonLink?: string | null; secondBtnText?: string | null; secondBtnLink?: string | null;
  slide1?: string | null; slide2?: string | null; slide3?: string | null;
  cardServicesImg?: string | null; cardFeaturedImg?: string | null; cardExclusiveImg?: string | null;
  // FIX-LISTINGS-HERO — when set, the matching tilted card renders the
  // referenced listing (image + title + price) instead of the static image.
  cardServicesListingId?: string | null;
  cardFeaturedListingId?: string | null;
  cardExclusiveListingId?: string | null;
  animationType?: string | null; statsWidth?: string | null; cardHeight?: string | null; cardWidth?: string | null; titleFontSize?: string | null;
  badgeAlign?: string | null; titleAlign?: string | null; highlightAlign?: string | null; subtitleAlign?: string | null; buttonAlign?: string | null;
  statsWidthCustom?: string | null; statsPaddingCustom?: string | null; statsGapCustom?: string | null;
  cardWidthCustom?: string | null; cardHeightCustom?: string | null; cardGapCustom?: string | null; cardRadiusCustom?: string | null;
  titleFontSizeCustom?: string | null; subtitleFontSizeCustom?: string | null; badgeFontSizeCustom?: string | null;
  buttonPaddingYCustom?: string | null; buttonPaddingXCustom?: string | null;
  heroMinHeightCustom?: string | null; contentMaxWidthCustom?: string | null; contentGapCustom?: string | null;
  slideOpacityCustom?: string | null; slideIntervalCustom?: string | null; overlayColorCustom?: string | null;
};

const alignClass: Record<string, string> = { right: "text-right items-end", center: "text-center items-center", left: "text-left items-start" };
const fontSizeClass: Record<string, string> = { small: "text-3xl md:text-4xl xl:text-5xl", normal: "text-4xl md:text-5xl xl:text-6xl", large: "text-5xl md:text-6xl xl:text-7xl" };
const statsWidthClass: Record<string, string> = { narrow: "max-w-[180px]", normal: "max-w-[240px]", wide: "max-w-[300px]" };

const PRICE_TYPE_LABELS: Record<string, string> = {
  NEGOTIABLE: "توافقی", FIXED: "مقطوع", CALL_FOR_PRICE: "تماس بگیرید", AUCTION: "مزایده",
};

function fmtPrice(p: string | null | undefined): string {
  if (!p) return "";
  const n = Number(p);
  if (Number.isNaN(n)) return "";
  // Compact Toman — میلیارد / میلیون.
  if (n >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    return `${v.toFixed(v % 1 === 0 ? 0 : 1)} میلیارد تومان`;
  }
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v.toFixed(v % 1 === 0 ? 0 : 1)} میلیون تومان`;
  }
  return `${n.toLocaleString("fa-IR")} تومان`;
}

export default function Hero({
  stats,
  config,
  cardServicesListing,
  cardFeaturedListing,
  cardExclusiveListing,
}: {
  stats: HeroStat[];
  config?: HeroConfig | null;
  cardServicesListing?: HeroCardListing | null;
  cardFeaturedListing?: HeroCardListing | null;
  cardExclusiveListing?: HeroCardListing | null;
}) {
  const cfg = config || {};
  const slides = [cfg.slide1 || "/images/hero/hero-construction.png", cfg.slide2 || "/images/hero/hero-mining.png", cfg.slide3 || "/images/hero/hero-road.png"].filter(Boolean);
  const intervalMs = (() => { const n = parseInt(cfg.slideIntervalCustom || "", 10); return !Number.isNaN(n) && n >= 1000 && n <= 60000 ? n : 5000; })();
  const [slide, setSlide] = useState(0);
  useEffect(() => { const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), intervalMs); return () => clearInterval(t); }, [slides.length, intervalMs]);
  const titleSize = cfg.titleFontSizeCustom ? "" : (fontSizeClass[cfg.titleFontSize || "normal"] || fontSizeClass.normal);
  const sWidth = cfg.statsWidthCustom ? "" : (statsWidthClass[cfg.statsWidth || "normal"] || statsWidthClass.normal);
  const slideOpacity = (() => { const n = parseFloat(cfg.slideOpacityCustom || ""); return Number.isNaN(n) ? 0.55 : Math.max(0, Math.min(1, n)); })();
  const overlayColor = cfg.overlayColorCustom || "#0b0b0b";
  const heroStyle: React.CSSProperties = cfg.heroMinHeightCustom ? { minHeight: cfg.heroMinHeightCustom } : {};
  const contentWrapStyle: React.CSSProperties = cfg.contentGapCustom ? { gap: cfg.contentGapCustom } : {};
  const contentColStyle: React.CSSProperties = cfg.contentMaxWidthCustom ? { maxWidth: cfg.contentMaxWidthCustom } : {};
  const titleStyle: React.CSSProperties = cfg.titleFontSizeCustom ? { fontSize: cfg.titleFontSizeCustom, lineHeight: 1.25 } : {};
  const subtitleStyle: React.CSSProperties = cfg.subtitleFontSizeCustom ? { fontSize: cfg.subtitleFontSizeCustom } : {};
  const badgeStyle: React.CSSProperties = cfg.badgeFontSizeCustom ? { fontSize: cfg.badgeFontSizeCustom } : {};
  const btnStyle: React.CSSProperties = (cfg.buttonPaddingYCustom || cfg.buttonPaddingXCustom) ? { padding: `${cfg.buttonPaddingYCustom || "0.75rem"} ${cfg.buttonPaddingXCustom || "1.5rem"}` } : {};
  const statsWrapStyle: React.CSSProperties = cfg.statsWidthCustom ? { maxWidth: cfg.statsWidthCustom, width: cfg.statsWidthCustom } : {};

  return (
    <section className="relative isolate overflow-hidden" style={{ backgroundColor: overlayColor, ...heroStyle }}>
      <div className="absolute inset-0 -z-10">
        {slides.map((src, i) => (<div key={i} className="absolute inset-0 transition-opacity duration-1000" style={{ backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center", opacity: i === slide ? slideOpacity : 0 }} />))}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${overlayColor}b3, ${overlayColor}80, ${overlayColor})` }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(245,130,32,0.15),transparent_70%)]" />
      </div>
      <div className="mx-auto flex min-h-[clamp(560px,78vh,820px)] max-w-[1440px] flex-col gap-8 px-5 py-24 lg:flex-row lg:items-center lg:px-10 xl:px-16" style={contentWrapStyle}>
        <div className="order-1 flex-1 lg:order-2" style={contentColStyle}>
          <div dir="rtl" className={`flex flex-col gap-5 ${alignClass[cfg.badgeAlign || "center"] || alignClass.center}`}>
            {cfg.badge && (<span className="inline-flex items-center gap-2 rounded-full border border-[#F58220]/40 bg-[#F58220]/10 px-4 py-1.5 font-bold text-[#F58220]" style={badgeStyle}><ShieldCheck className="h-3.5 w-3.5" />{cfg.badge}</span>)}
            <h1 className={`font-black leading-[1.25] text-white ${titleSize} ${alignClass[cfg.titleAlign || "center"] || alignClass.center}`} style={titleStyle}>{cfg.title1 || "خرید، فروش و اجاره"}<br /><span className="bg-gradient-to-l from-[#F58220] via-[#ff9a3c] to-[#F47C20] bg-clip-text text-transparent">{cfg.highlight || "ماشین‌آلات سنگین"}</span></h1>
            {cfg.subtitle && (<p className={`max-w-xl leading-8 text-white/65 md:text-lg ${alignClass[cfg.subtitleAlign || "center"] || alignClass.center}`} style={subtitleStyle}>{cfg.subtitle}</p>)}
            <div className={`flex flex-wrap gap-4 ${alignClass[cfg.buttonAlign || "center"] || alignClass.center}`} dir="rtl">
              <Link href={cfg.buttonLink || "/listings/new"} className="rounded-xl bg-[#F58220] text-sm font-bold text-white transition hover:bg-[#ff8c38]" style={btnStyle}>{cfg.buttonText || "ثبت آگهی رایگان"}</Link>
              <Link href={cfg.secondBtnLink || "/listings"} className="rounded-xl border border-white/20 bg-white/5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10" style={btnStyle}>{cfg.secondBtnText || "مشاهده آگهی‌ها"}</Link>
            </div>
          </div>
          <div className={`mt-6 flex gap-2 ${alignClass[cfg.buttonAlign || "center"] || alignClass.center}`}>{slides.map((_, i) => (<button key={i} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-8 bg-[#F58220]" : "w-1.5 bg-white/30"}`} aria-label={`اسلاید ${i + 1}`} />))}</div>
        </div>
        <div className="order-2 flex flex-1 items-start justify-center lg:order-3 lg:justify-end" style={cfg.cardGapCustom ? { gap: cfg.cardGapCustom } : undefined}>
          <TiltedImageCard
            src={cfg.cardServicesImg || "/images/hero/card-services.png"}
            title="شبکه تکنسین‌ها"
            tag="SERVICES"
            tilt=""
            cfg={cfg}
            listing={cfg.cardServicesListingId ? cardServicesListing : undefined}
          />
          <TiltedImageCard
            src={cfg.cardFeaturedImg || "/images/hero/card-featured.png"}
            title="آگهی‌های ویژه"
            tag="FEATURED"
            tilt=""
            featured
            cfg={cfg}
            listing={cfg.cardFeaturedListingId ? cardFeaturedListing : undefined}
          />
          <TiltedImageCard
            src={cfg.cardExclusiveImg || "/images/hero/card-exclusive.png"}
            title="فروش در ۷ روز"
            tag="EXCLUSIVE"
            tilt=""
            cfg={cfg}
            listing={cfg.cardExclusiveListingId ? cardExclusiveListing : undefined}
          />
        </div>
        <div className={`order-3 flex justify-center lg:order-1 lg:justify-start ${sWidth}`} style={statsWrapStyle}><HeroStatsPanel stats={stats} paddingCustom={cfg.statsPaddingCustom} gapCustom={cfg.statsGapCustom} widthCustom={cfg.statsWidthCustom} /></div>
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-[#F58220] to-transparent" />
    </section>
  );
}

function TiltedImageCard({
  src,
  title,
  tag,
  tilt,
  featured = false,
  cfg,
  listing,
}: {
  src: string;
  title: string;
  tag: string;
  tilt: string;
  featured?: boolean;
  cfg: HeroConfig;
  listing?: HeroCardListing | null;
}) {
  const cardStyle: React.CSSProperties = { ...(cfg.cardWidthCustom ? { width: cfg.cardWidthCustom } : {}), ...(cfg.cardRadiusCustom ? { borderRadius: cfg.cardRadiusCustom } : {}) };
  const aspectStyle: React.CSSProperties = cfg.cardHeightCustom ? { height: cfg.cardHeightCustom, aspectRatio: "auto" } : {};

  // Listing-mode: render image + title + price + link to the listing detail.
  if (listing) {
    const imgSrc = listing.image || src;
    const priceLabel = listing.price
      ? fmtPrice(listing.price)
      : PRICE_TYPE_LABELS[listing.priceType] ?? "";
    return (
      <Link
        href={`/listings/${listing.slug}`}
        className={`group relative block w-32 overflow-hidden rounded-2xl border border-white/10 bg-[#111] transition-all duration-500 hover:border-[#F58220]/50 sm:w-36 lg:w-40 ${tilt}`}
        style={cardStyle}
        title={listing.title}
      >
        {featured && <span className="absolute right-2 top-2 z-10 rounded-full bg-[#F58220] px-2 py-0.5 text-[9px] font-black text-white">ویژه</span>}
        <div className="relative aspect-[3/4] overflow-hidden" style={aspectStyle}>
          <img src={imgSrc} alt={listing.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[8px] font-bold text-[#F58220] backdrop-blur">{tag}</span>
          <div className="absolute bottom-0 left-0 right-0 p-2.5">
            {listing.brandName && (
              <p className="mb-0.5 truncate text-[10px] font-bold text-[#F58220]">{listing.brandName}</p>
            )}
            <h3 className="line-clamp-2 text-xs font-black leading-tight text-white" title={listing.title}>{listing.title}</h3>
            {priceLabel && <p className="mt-0.5 text-[11px] font-black text-white">{priceLabel}</p>}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[#F58220] to-transparent transition-all duration-500 group-hover:w-full" />
      </Link>
    );
  }

  return (
    <div className={`group relative w-32 overflow-hidden rounded-2xl border border-white/10 bg-[#111] transition-all duration-500 hover:border-[#F58220]/50 sm:w-36 lg:w-40 ${tilt}`} style={cardStyle}>
      {featured && <span className="absolute right-2 top-2 z-10 rounded-full bg-[#F58220] px-2 py-0.5 text-[9px] font-black text-white">ویژه</span>}
      <div className="relative aspect-[3/4] overflow-hidden" style={aspectStyle}>
        <img src={src} alt={title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[8px] font-bold text-[#F58220] backdrop-blur">{tag}</span>
        <div className="absolute bottom-0 left-0 right-0 p-2.5"><h3 className="text-sm font-black text-white">{title}</h3></div>
      </div>
      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[#F58220] to-transparent transition-all duration-500 group-hover:w-full" />
    </div>
  );
}
