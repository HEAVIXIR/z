"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Menu,
  X,
  Search,
  LayoutDashboard,
  Store,
  ChevronLeft,
  Gavel,
  Key,
  Building2,
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import CommandPalette from "@/components/admin/CommandPalette";

/* ============================================================
   Header — floating glass pill with nav + mega menu + bell +
   ⌘K command palette + login link + mobile drawer.

   Menu (final): only TWO items
     - دسته‌بندی (dropdown showing ALL catalog roots; the machinery
       root expands to show its 16 L1 groups, each with its L2
       families — per HEAVIX-REQUIREMENTS §1)
     - فروشگاه (marketplace — placeholder for the upcoming pro store)

   اجاره / مزایده / درخواست / خدمات are NOT nav items — they are
   transaction types or catalog children and live inside the listings
   page / category tree.
   ============================================================ */

type TaxChild = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  icon: string | null;
  children?: TaxChild[]; // present only for machinery L1 groups (V1.2)
};
type TaxRoot = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  children: TaxChild[];
};

type LegacyCat = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  icon?: string | null;
};

type TaxonomyPayload = {
  catalogRoots: TaxRoot[];
  marketplaceRoots: TaxRoot[];
  serviceRoots: TaxRoot[];
};

/* FIX-ADMIN-EDITABILITY — optional site-settings prop. The home page
   passes this directly (already fetched for the verified-section flag);
   every other page leaves it undefined and the Header fetches the
   public /api/settings itself. Only the brand-asset fields we need
   are typed here. */
type HeaderSiteSettings = {
  logoUrl?: string | null;
  logoAnimationDurationMs?: number | null;
  logoHeight?: number | null;
  showPersianName?: boolean | null;
  logoPosition?: string | null;
};

export default function Header({
  categories: legacyCats = [],
  siteSettings,
}: {
  categories?: LegacyCat[];
  siteSettings?: HeaderSiteSettings;
}) {
  const [megaOpen, setMegaOpen] = useState<null | "catalog" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [tax, setTax] = useState<TaxonomyPayload | null>(null);
  // FIX-ADMIN-EDITABILITY — public site settings (logo + animation
  // duration) when not supplied via prop. Defaults preserve the
  // pre-fix behavior (heavix-logo.svg + 10s loop).
  const [pubSettings, setPubSettings] = useState<HeaderSiteSettings>({});

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/taxonomy", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as TaxonomyPayload;
        if (alive) setTax(data);
      } catch {
        /* swallow — fall back to legacy categories */
      }
    })();
    return () => { alive = false; };
  }, []);

  // FIX-ADMIN-EDITABILITY — fetch public site settings only when no
  // prop was supplied. Avoids an extra request on the home page.
  useEffect(() => {
    if (siteSettings) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data?.settings) {
          setPubSettings({
            logoUrl: data.settings.logoUrl ?? null,
            logoAnimationDurationMs: data.settings.logoAnimationDurationMs ?? null,
            logoHeight: data.settings.logoHeight ?? null,
            showPersianName: data.settings.showPersianName ?? null,
            logoPosition: data.settings.logoPosition ?? null,
          });
        }
      } catch {
        /* swallow — fall back to defaults */
      }
    })();
    return () => { alive = false; };
  }, [siteSettings]);

  const catalogRoots: TaxRoot[] = tax?.catalogRoots?.length
    ? tax.catalogRoots
    : legacyCats
        .filter((c) => !c.parentId)
        .slice(0, 8)
        .map((c) => ({
          id: c.id, name: c.name, nameEn: null, slug: c.slug,
          icon: c.icon ?? null, imageUrl: null,
          children: legacyCats.filter((ch) => ch.parentId === c.id).slice(0, 8).map((ch) => ({
            id: ch.id, name: ch.name, nameEn: null, slug: ch.slug, icon: ch.icon ?? null,
          })),
        }));

  // Resolve effective logo settings (prop > fetched > defaults).
  const effectiveLogoUrl =
    siteSettings?.logoUrl ?? pubSettings.logoUrl ?? null;
  const effectiveDurationMs =
    siteSettings?.logoAnimationDurationMs ??
    pubSettings.logoAnimationDurationMs ??
    10000;
  const effectiveLogoHeight =
    siteSettings?.logoHeight ?? pubSettings.logoHeight ?? 80;
  const effectiveShowPersianName =
    siteSettings?.showPersianName ?? pubSettings.showPersianName ?? true;
  const effectiveLogoPosition =
    siteSettings?.logoPosition ?? pubSettings.logoPosition ?? "right";

  const headerFlexClass =
    effectiveLogoPosition === "center"
      ? "justify-center"
      : effectiveLogoPosition === "left"
        ? "justify-start"
        : "justify-between";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-[200] transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}
      >
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 2xl:px-10">
          <div
            className={`flex h-20 items-center ${headerFlexClass} rounded-3xl border px-5 shadow-[0_12px_40px_rgba(0,0,0,.35)] transition-all duration-300 lg:px-8 ${
              scrolled ? "border-white/10 bg-[#0b0b0b]/90 backdrop-blur-2xl" : "border-white/10 bg-black/60 backdrop-blur-2xl"
            }`}
          >
            {/* Logo — animated, repeats every `durationMs` (logo pulses, then text slides in) */}
            <AnimatedLogo
              logoUrl={effectiveLogoUrl}
              durationMs={effectiveDurationMs}
              height={effectiveLogoHeight}
              showPersianName={effectiveShowPersianName}
            />

            {/* Desktop nav */}
            <nav className="hidden flex-1 items-center justify-center gap-6 lg:flex" aria-label="منوی اصلی">
              <DropdownMega
                label="دسته‌بندی"
                open={megaOpen === "catalog"}
                onEnter={() => setMegaOpen("catalog")}
                onLeave={() => setMegaOpen(null)}
                roots={catalogRoots}
                emptyText="دسته‌بندی کاتالوگ ثبت نشده است."
              />

              {/* P2-AUCTION-COMPANY-RENTAL — public entry points to
                  the auction / rental / companies pages. */}
              <Link
                href="/rentals"
                className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-white/70 transition-colors hover:text-[#F58220]"
              >
                <Key className="h-3.5 w-3.5" />
                اجاره
              </Link>
              <Link
                href="/auctions"
                className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-white/70 transition-colors hover:text-[#F58220]"
              >
                <Gavel className="h-3.5 w-3.5" />
                مزایده
              </Link>
              <Link
                href="/companies"
                className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-white/70 transition-colors hover:text-[#F58220]"
              >
                <Building2 className="h-3.5 w-3.5" />
                شرکت‌ها
              </Link>

              <Link
                href="/store"
                className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-white/70 transition-colors hover:text-[#F58220]"
              >
                <Store className="h-3.5 w-3.5" />
                فروشگاه
              </Link>
            </nav>

            {/* CTA + utilities */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-[#F58220]/40 hover:text-[#F58220] md:flex"
                aria-label="جستجوی دستور (⌘K)"
                title="⌘K / Ctrl+K"
              >
                <Search className="h-4 w-4" />
              </button>
              <NotificationBell />
              <Link
                href="/login"
                className="hidden h-10 items-center gap-1.5 rounded-full border border-white/10 px-4 text-[13px] font-bold text-white/80 transition hover:border-[#F58220]/40 hover:text-[#F58220] sm:flex"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                ورود
              </Link>
              <Link
                href="/listings/new"
                className="hidden rounded-full bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition-all hover:bg-[#ff8c38] sm:inline-flex"
              >
                ثبت آگهی رایگان
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white lg:hidden"
                aria-label="منو"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile drawer */}
          {mobileOpen && (
            <MobileDrawer
              roots={catalogRoots}
              onClose={() => setMobileOpen(false)}
            />
          )}
        </div>
      </header>

      <CommandPalette />
    </>
  );
}

/* ── Mobile drawer — machinery L1 groups collapsible to show L2 children ── */
function MobileDrawer({ roots, onClose }: { roots: TaxRoot[]; onClose: () => void }) {
  // Track which machinery L1 group is expanded (by id). null = all collapsed.
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (id: string) => setExpanded((cur) => (cur === id ? null : id));

  const machinery = roots.find((r) => r.slug === "machinery");
  const otherRoots = roots.filter((r) => r.slug !== "machinery");

  return (
    <div className="mt-2 rounded-3xl border border-white/10 bg-[#0b0b0b]/98 p-5 shadow-[0_25px_80px_rgba(0,0,0,.55)] backdrop-blur-2xl lg:hidden">
      <nav className="flex flex-col gap-1">
        {/* Machinery root with 16 L1 groups, each expandable */}
        {machinery && (
          <div className="mb-1">
            <Link
              href={`/listings?category=machinery`}
              onClick={onClose}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-black text-[#F58220] transition-colors hover:bg-[#F58220]/10"
            >
              <span className="text-base">{machinery.icon ?? "🏗️"}</span>
              {machinery.name}
            </Link>
            <div className="mr-4 space-y-0.5 border-r border-white/10 pr-2">
              {machinery.children.map((l1) => {
                const isOpen = expanded === l1.id;
                const hasL2 = (l1.children?.length ?? 0) > 0;
                return (
                  <div key={l1.id}>
                    <div className="flex items-stretch">
                      <Link
                        href={`/listings?category=${l1.slug}`}
                        onClick={onClose}
                        className="flex-1 rounded-lg px-3 py-2 text-[12.5px] font-bold text-white/75 transition-colors hover:bg-[#F58220]/10 hover:text-[#F58220]"
                      >
                        {l1.name}
                      </Link>
                      {hasL2 && (
                        <button
                          type="button"
                          onClick={() => toggle(l1.id)}
                          aria-label={isOpen ? "بستن" : "باز کردن"}
                          className="flex w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/5 hover:text-[#F58220]"
                        >
                          <ChevronLeft className={`h-4 w-4 transition-transform ${isOpen ? "-rotate-90" : ""}`} />
                        </button>
                      )}
                    </div>
                    {isOpen && hasL2 && (
                      <div className="mr-3 space-y-0.5 border-r border-white/5 pr-2">
                        {l1.children!.map((l2) => (
                          <Link
                            key={l2.id}
                            href={`/listings?category=${l2.slug}`}
                            onClick={onClose}
                            className="block rounded-lg px-3 py-1.5 text-[11.5px] text-white/55 transition-colors hover:bg-[#F58220]/10 hover:text-[#F58220]"
                          >
                            {l2.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Other catalog roots — flat links */}
        {otherRoots.map((c) => (
          <Link
            key={c.id}
            href={`/listings?category=${c.slug}`}
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-white/80 transition-colors hover:bg-[#F58220]/10 hover:text-[#F58220]"
          >
            <span className="text-base">{c.icon ?? "🏭"}</span>
            {c.name}
          </Link>
        ))}

        {/* P2-AUCTION-COMPANY-RENTAL — quick links */}
        <div className="my-1 border-t border-white/5" />
        <Link
          href="/rentals"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-white/80 transition-colors hover:bg-[#F58220]/10 hover:text-[#F58220]"
        >
          <Key className="h-4 w-4 text-[#F58220]" />
          اجاره ماشین‌آلات
        </Link>
        <Link
          href="/auctions"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-white/80 transition-colors hover:bg-[#F58220]/10 hover:text-[#F58220]"
        >
          <Gavel className="h-4 w-4 text-[#F58220]" />
          مزایده ماشین‌آلات
        </Link>
        <Link
          href="/companies"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-white/80 transition-colors hover:bg-[#F58220]/10 hover:text-[#F58220]"
        >
          <Building2 className="h-4 w-4 text-[#F58220]" />
          دایرکتوری شرکت‌ها
        </Link>

        <Link
          href="/store"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-white/80 transition-colors hover:bg-[#F58220]/10 hover:text-[#F58220]"
        >
          <Store className="h-4 w-4" />
          فروشگاه
        </Link>
        <Link
          href="/login"
          onClick={onClose}
          className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-[#F58220]/10 hover:text-[#F58220]"
        >
          ورود به پنل مدیریت
        </Link>
      </nav>
      <Link
        href="/listings/new"
        onClick={onClose}
        className="mt-3 flex h-11 items-center justify-center rounded-xl bg-[#F58220] text-sm font-bold text-white"
      >
        ثبت آگهی رایگان
      </Link>
    </div>
  );
}

/* ===================== Animated Logo ===================== */
/* Repeating animation, default every 10s (configurable via `durationMs`):
   0s    — logo starts invisible + scaled down
   0.5s  — logo fully visible (fade + scale in)
   1s    — text "هویکس" starts sliding in from right
   1.7s  — text fully visible
   1.7-8.5s — hold (both visible)
   8.5s  — both start fading out
   cycle restarts (key change forces remount → animation replays)

   FIX-ADMIN-EDITABILITY — `logoUrl` comes from siteSettings.logoUrl
   (managed via /admin/home/header). Falls back to the static
   /logos/heavix-logo.svg asset when not set. `durationMs` likewise
   comes from siteSettings.logoAnimationDurationMs.
*/
function AnimatedLogo({
  logoUrl,
  durationMs,
  height = 80,
  showPersianName = true,
}: {
  logoUrl?: string | null;
  durationMs?: number;
  height?: number;
  showPersianName?: boolean;
}) {
  const dur = durationMs && durationMs > 0 ? durationMs : 10000;
  const durSec = `${(dur / 1000).toFixed(2)}s`;
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCycle((c) => c + 1), dur);
    return () => clearInterval(interval);
  }, [dur]);

  const resolvedSrc = logoUrl || "/logos/heavix-logo.png";

  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="هویکس">
      <img
        key={`logo-${cycle}`}
        src={resolvedSrc}
        alt="HEAVIX"
        className="w-auto"
        style={{
          height: `${height}px`,
          animation: `logoFadeInOut ${durSec} ease-in-out both`,
        }}
      />
      {showPersianName && (
        <span
          key={`text-${cycle}`}
          className="hidden text-lg font-black tracking-tight text-white sm:block"
          style={{
            animation: `logoTextSlideInOut ${durSec} cubic-bezier(0.25,1,0.5,1) both`,
          }}
        >
          <span className="text-white">هوی</span>
          <span className="text-[#F58220]">کس</span>
        </span>
      )}
    </Link>
  );
}

/* ── Mega dropdown — machinery 16 L1 groups (with L2 sub-links) + other roots sidebar ── */
function DropdownMega({
  label,
  open,
  onEnter,
  onLeave,
  roots,
  emptyText,
}: {
  label: string;
  open: boolean;
  onEnter: () => void;
  onLeave: () => void;
  roots: TaxRoot[];
  emptyText: string;
}) {
  const machinery = roots.find((r) => r.slug === "machinery");
  const otherRoots = roots.filter((r) => r.slug !== "machinery");

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        className="flex items-center gap-1 text-[13px] font-medium text-white/70 transition-colors hover:text-white"
        type="button"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-1/2 top-full z-[60] w-[min(960px,calc(100vw-48px))] translate-x-1/2 pt-3">
          <div className="relative rounded-2xl border border-white/10 bg-[#0b0b0b]/98 p-5 shadow-[0_25px_80px_rgba(0,0,0,.55)] backdrop-blur-2xl">
            <div className="absolute -top-px left-10 right-10 h-0.5 rounded-full" style={{ background: "#F58220" }} />
            {roots.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/50">{emptyText}</p>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px]">
                {/* Main column: machinery with its 16 L1 groups, each with L2 sub-links */}
                {machinery && (
                  <div className="min-w-0">
                    <div className="mb-3 flex items-center justify-between">
                      <Link
                        href={`/listings?category=machinery`}
                        className="flex items-center gap-1.5 text-[13px] font-black text-[#F58220] hover:text-[#ff9a3c]"
                      >
                        <span className="text-base">{machinery.icon ?? "🏗️"}</span>
                        {machinery.name}
                      </Link>
                      <span className="text-[10px] font-bold text-white/30">
                        {machinery.children.length} گروه
                      </span>
                    </div>
                    <div className="max-h-[440px] overflow-y-auto pl-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-track]:bg-transparent">
                      <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                        {machinery.children.map((l1) => (
                          <div key={l1.id} className="min-w-0">
                            <Link
                              href={`/listings?category=${l1.slug}`}
                              className="block truncate rounded px-1 py-0.5 text-[12px] font-bold text-white/85 transition-colors hover:bg-[#F58220]/10 hover:text-[#F58220]"
                            >
                              {l1.name}
                            </Link>
                            {l1.children && l1.children.length > 0 && (
                              <div className="mt-0.5 space-y-0">
                                {l1.children.map((l2) => (
                                  <Link
                                    key={l2.id}
                                    href={`/listings?category=${l2.slug}`}
                                    className="block truncate rounded px-1 py-0.5 text-[10.5px] text-white/55 transition-colors hover:bg-[#F58220]/10 hover:text-[#F58220]"
                                  >
                                    {l2.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sidebar: other catalog roots */}
                <div className="min-w-0 border-r border-white/10 pr-4 md:pr-5">
                  <p className="mb-2 text-[12px] font-black text-white/40">سایر دسته‌ها</p>
                  <div className="grid grid-cols-1 gap-0.5">
                    {otherRoots.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/listings?category=${cat.slug}`}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-[#F58220]/10 hover:text-[#F58220]"
                      >
                        <span className="text-sm">{cat.icon ?? "🏭"}</span>
                        <span className="truncate">{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[10.5px] text-white/40">
              <span>HEAVIX INDUSTRIAL</span>
              <Link href="/listings" className="font-bold text-[#F58220] hover:text-[#ff9a3c]">
                مشاهده همه آگهی‌ها ←
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
