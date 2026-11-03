"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Building2, ShieldCheck, X, Loader2 } from "lucide-react";
import {
  BRAND_TYPE_LABELS,
  VERIFICATION_LABELS,
  verificationBadgeClass,
} from "@/lib/brand-labels";
import { toFa } from "@/lib/format";

type SearchResult = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  country: string | null;
  logoUrl: string | null;
  type: string | null;
  status: string;
  verification: string;
  featured: boolean;
  _count: { listings: number };
};

const DEBOUNCE_MS = 250;

/**
 * BrandLiveSearch — debounced typeahead that queries /api/brands/search
 * and shows a live dropdown of brand matches (alias-aware). Selecting a
 * result navigates to /brands/SLUG.
 *
 * Server-side safe: only renders the input during SSR (dropdown hidden
 * until the user types).
 */
export default function BrandLiveSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced fetch.
  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      abortRef.current?.abort();
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(
          `/api/brands/search?q=${encodeURIComponent(trimmed)}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { brands: SearchResult[] };
        setResults(data.brands ?? []);
        setOpen(true);
        setHighlight(0);
      } catch {
        // ignore aborts + transient errors (dropdown just stays closed).
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
    };
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (slug: string) => {
    setOpen(false);
    setQ("");
    router.push(`/brands/${encodeURIComponent(slug)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === "Enter" && q.trim()) {
        // Fall through to top hit (if any) — otherwise no-op.
        if (results[0]) {
          e.preventDefault();
          go(results[0].slug);
        }
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = results[highlight] ?? results[0];
      if (sel) go(sel.slug);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute right-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-white/35" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="نام برند را فارسی یا انگلیسی وارد کنید… (مثلاً کوماتسو، Caterpillar)"
          className="h-13 w-full rounded-2xl border border-white/15 bg-black/50 py-3.5 pr-11 pl-11 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#F58220] focus:shadow-[0_0_0_3px_rgba(245,130,32,.12)]"
          aria-label="جستجوی برند"
          role="combobox"
          aria-expanded={open}
          aria-controls="brand-search-listbox"
          aria-autocomplete="list"
        />
        {loading ? (
          <Loader2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#F58220]" />
        ) : q ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setResults([]);
              setOpen(false);
            }}
            className="absolute left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
            aria-label="پاک کردن"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Dropdown */}
      {open && q.trim() && (
        <div
          id="brand-search-listbox"
          role="listbox"
          className="absolute z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-[0_25px_60px_rgba(0,0,0,.6)]"
        >
          {results.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-white/55">نتیجه‌ای یافت نشد.</p>
              <p className="mt-1 text-[11px] text-white/35">
                می‌توانید همه برندها را از روی کارت‌های زیر مرور کنید.
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {results.map((r, idx) => {
                const verInfo = VERIFICATION_LABELS[r.verification];
                const showVer =
                  verInfo && verInfo.level !== "none" && verInfo.label;
                const typeLabel = r.type
                  ? BRAND_TYPE_LABELS[r.type] ?? null
                  : null;
                const active = idx === highlight;
                return (
                  <li key={r.id} role="option" aria-selected={active}>
                    <Link
                      href={`/brands/${encodeURIComponent(r.slug)}`}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={(e) => {
                        e.preventDefault();
                        go(r.slug);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 transition ${
                        active ? "bg-[#F58220]/10" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      {/* Logo */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                        {r.logoUrl ? (
                          <img
                            src={r.logoUrl}
                            alt={r.name}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-[#F58220]/60" />
                        )}
                      </div>

                      {/* Name + meta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-white">
                            {r.name}
                          </p>
                          {showVer && (
                            <span
                              className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${verificationBadgeClass(
                                verInfo!.level,
                              )}`}
                            >
                              <ShieldCheck className="h-2.5 w-2.5" />
                              {verInfo!.label}
                            </span>
                          )}
                          {r.featured && (
                            <span className="rounded-full bg-[#F58220] px-1.5 py-0.5 text-[9px] font-bold text-white">
                              ویژه
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/45">
                          {r.nameEn && (
                            <span className="truncate">{r.nameEn}</span>
                          )}
                          {r.country && (
                            <span className="shrink-0">• {r.country}</span>
                          )}
                          {typeLabel && (
                            <span className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/55">
                              {typeLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Listings count */}
                      <div className="shrink-0 text-left">
                        <p className="text-xs font-black text-[#F58220]">
                          {toFa(r._count.listings)}
                        </p>
                        <p className="text-[9px] text-white/35">آگهی</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
