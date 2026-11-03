"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Package,
  Loader2,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /companies — public company directory.
   Client component — fetches /api/companies (public) so search
   is interactive without a full reload.
   ============================================================ */

type Company = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  city: string | null;
  province: string | null;
  verified: boolean;
  premium: boolean;
  listingsCount: number;
};

export default function CompaniesDirectoryPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Debounce search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (city) params.set("province", city);
    params.set("limit", "50");
    fetch(`/api/companies?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        setCompanies(json.companies ?? []);
      })
      .catch(() => {
        if (alive) setCompanies([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debouncedQ, city]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.province) set.add(c.province);
    });
    return Array.from(set).sort();
  }, [companies]);

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />

      <main className="flex-1 pt-32">
        <div className="mx-auto max-w-[1440px] px-6 pb-16 lg:px-10">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-white/40">
            <Link href="/" className="hover:text-[#F58220]">خانه</Link>
            <ArrowLeft className="h-3 w-3" />
            <span className="text-white/70">شرکت‌ها</span>
          </nav>

          {/* Header */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#F58220]">
                <Building2 className="h-3.5 w-3.5" />
                HEAVIX COMPANIES · دایرکتوری شرکت‌ها
              </div>
              <h1 className="text-3xl font-black text-white lg:text-4xl">
                شرکت‌های صنعتی
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-7 text-white/45">
                شبکه شرکت‌های تأییدشده هویکس — خریداران، فروشندگان، دیلرها و
                سرویس‌کاران ماشین‌آلات سنگین در سراسر ایران.
              </p>
            </div>

            {/* Search */}
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="نام شرکت..."
                  className="h-11 w-64 rounded-xl border border-white/10 bg-black/50 pr-9 pl-3 text-sm text-white outline-none transition focus:border-[#F58220] placeholder:text-white/30"
                />
              </div>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-11 rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white outline-none focus:border-[#F58220]"
              >
                <option value="">همه استان‌ها</option>
                {cities.map((c) => (
                  <option key={c} value={c} className="bg-[#111]">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
            </div>
          ) : companies.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#111] p-16 text-center">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-white/20" />
              <p className="text-sm text-white/50">شرکتی مطابق جستجوی شما یافت نشد.</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-xs text-white/45">{toFa(companies.length)} شرکت یافت شد</p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {companies.map((c) => (
                  <CompanyCard key={c.id} c={c} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function CompanyCard({ c }: { c: Company }) {
  return (
    <Link
      href={`/companies/${encodeURIComponent(c.slug)}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111] transition-all duration-500 hover:-translate-y-2 hover:border-[#F58220]/40 hover:shadow-[0_25px_60px_rgba(0,0,0,.45)]"
    >
      {/* Logo / cover */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
        <div className="absolute inset-0 flex items-center justify-center">
          {c.logoUrl ? (
            <img
              src={c.logoUrl}
              alt={c.name}
              className="max-h-20 max-w-[70%] object-contain opacity-90 transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <Building2 className="h-12 w-12 text-white/30" />
          )}
        </div>
        {/* Badges */}
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
          {c.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 backdrop-blur">
              <ShieldCheck className="h-3 w-3" />
              تأییدشده
            </span>
          )}
          {c.premium && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400 backdrop-blur">
              <Star className="h-3 w-3 fill-current" />
              Premium
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-1 text-base font-black text-white">{c.name}</h3>
        {c.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">{c.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-white/55">
          {(c.province || c.city) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-[#F58220]" />
              {[c.province, c.city].filter(Boolean).join("، ")}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Package className="h-3 w-3 text-[#F58220]" />
            {toFa(c.listingsCount)} آگهی
          </span>
        </div>

        <div className="mt-auto pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white/70 transition group-hover:border-[#F58220]/40 group-hover:text-[#F58220]">
            مشاهده پروفایل
            <ArrowLeft className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
