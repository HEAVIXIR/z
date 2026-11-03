"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Award, Loader2, Save, CheckCircle2, Search, Star } from "lucide-react";
import { toFa } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

/* ============================================================
   /admin/home/trusted-brands — admin config for the
   "برندهای مورد اعتماد هویکس" section.
   FIX-ANIMATIONS-BRANDS — FIX 5.

   Lets the admin:
     • Set the section title + subtitle + description.
     • Choose how many brands to display (limit).
     • Edit ticker speed (seconds for one full loop).
     • Multi-select which brands to feature on the homepage
       (toggles BrandDisplay.showOnHomepage).
   ============================================================ */

type BrandRow = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  logoUrl: string | null;
  country: string | null;
  featured: boolean;
  showOnHomepage: boolean;
  listingCount: number;
};

type Config = {
  title: string;
  subtitle: string;
  description: string;
  limit: number;
  tickerSpeed: number;
};

const DEFAULTS: Config = {
  title: "برندهای مورد اعتماد هویکس",
  subtitle: "TRUSTED BRANDS",
  description:
    "بزرگ‌ترین برندهای سازندهٔ ماشین‌آلات سنگین جهان در کنار شما",
  limit: 12,
  tickerSpeed: 40,
};

export default function AdminTrustedBrandsPage() {
  const [cfg, setCfg] = useState<Config>(DEFAULTS);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/home/trusted-brands", {
        cache: "no-store",
      });
      const json = await res.json();
      const c = json?.config;
      if (c) {
        setCfg({
          title: c.title ?? DEFAULTS.title,
          subtitle: c.subtitle ?? DEFAULTS.subtitle,
          description: c.description ?? DEFAULTS.description,
          limit: Number.isFinite(c.limit) ? Number(c.limit) : DEFAULTS.limit,
          tickerSpeed:
            Number.isFinite(c.tickerSpeed) ? Number(c.tickerSpeed) : DEFAULTS.tickerSpeed,
        });
      }
      if (Array.isArray(json?.brands)) {
        setBrands(json.brands);
        setSelected(
          new Set(
            json.brands.filter((b: BrandRow) => b.showOnHomepage).map((b: BrandRow) => b.id),
          ),
        );
      }
    } catch {
      /* ignore — keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.trim().toLowerCase();
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.nameEn ?? "").toLowerCase().includes(q) ||
        (b.country ?? "").toLowerCase().includes(q),
    );
  }, [brands, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFeatured = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const b of brands) if (b.featured) next.add(b.id);
      return next;
    });
  };
  const clearAll = () => setSelected(new Set());

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/home/trusted-brands", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cfg,
          selectedBrandIds: Array.from(selected),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "ذخیره ناموفق بود.");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast({
        title: "تنظیمات ذخیره شد",
        description: `${toFa(selected.size)} برند انتخاب شده`,
      });
    } catch (e: any) {
      toast({
        title: "خطا",
        description: e?.message ?? "ذخیره ناموفق بود.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#F58220]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <Award className="h-6 w-6 text-[#F58220]" />
          برندهای مورد اعتماد
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          تنظیمات بخش «برندهای مورد اعتماد هویکس» در صفحه اصلی — عنوان، تعداد،
          سرعت نوار و انتخاب برندهای نمایش‌داده‌شده.
        </p>
      </div>

      {/* Text config */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-zinc-900">پیکربندی متن و نوار</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">
              عنوان بخش
            </label>
            <input
              type="text"
              value={cfg.title}
              onChange={(e) => setCfg({ ...cfg, title: e.target.value })}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">
              زیرعنوان (بَج بالای عنوان)
            </label>
            <input
              type="text"
              value={cfg.subtitle}
              onChange={(e) => setCfg({ ...cfg, subtitle: e.target.value })}
              placeholder="TRUSTED BRANDS"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">
              توضیح زیر عنوان
            </label>
            <textarea
              value={cfg.description}
              onChange={(e) => setCfg({ ...cfg, description: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-500">
                حداکثر تعداد برندهای نمایش‌داده‌شده
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={cfg.limit}
                onChange={(e) =>
                  setCfg({
                    ...cfg,
                    limit: Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                  })
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
              />
              <p className="mt-1 text-[10px] text-zinc-400">بین ۱ تا ۵۰</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-500">
                سرعت نوار (ثانیه برای یک دور کامل)
              </label>
              <input
                type="number"
                min={10}
                max={240}
                value={cfg.tickerSpeed}
                onChange={(e) =>
                  setCfg({
                    ...cfg,
                    tickerSpeed: Math.max(10, Math.min(240, Number(e.target.value) || 40)),
                  })
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
              />
              <p className="mt-1 text-[10px] text-zinc-400">
                عدد کمتر = سریع‌تر (بین ۱۰ تا ۲۴۰)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Brand multi-select */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black text-zinc-900">
            برندهای نمایش‌داده‌شده
            <span className="mr-2 text-sm font-normal text-zinc-500">
              {toFa(selected.size)} انتخاب شده از {toFa(brands.length)} برند
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllFeatured}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:border-[#F58220] hover:text-[#F58220]"
            >
              انتخاب همهٔ ویژه‌ها
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:border-red-500 hover:text-red-500"
            >
              پاک‌کردن همه
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی برند..."
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-9 pl-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
          />
        </div>

        {/* Brand list */}
        <div className="max-h-96 overflow-y-auto rounded-xl border border-zinc-100 bg-zinc-50">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">
              برندی یافت نشد.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {filtered.map((b) => {
                const isSel = selected.has(b.id);
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => toggle(b.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-right transition ${
                        isSel ? "bg-[#F58220]/8" : "hover:bg-zinc-100"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                          isSel
                            ? "border-[#F58220] bg-[#F58220] text-white"
                            : "border-zinc-300 bg-white"
                        }`}
                      >
                        {isSel && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </span>
                      {/* Logo / initial */}
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-inner">
                        {b.logoUrl ? (
                          <img
                            src={b.logoUrl}
                            alt={b.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-sm font-black text-[#F58220]">
                            {(b.nameEn ?? b.name).charAt(0)}
                          </span>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-zinc-800">
                          {b.name}
                          {b.featured && (
                            <Star className="ml-1.5 inline h-3 w-3 fill-[#F58220] text-[#F58220]" />
                          )}
                        </p>
                        {b.nameEn && (
                          <p className="truncate text-[10px] text-zinc-400" dir="ltr">
                            {b.nameEn}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-[10px] text-zinc-400">
                        {b.country && <span>{b.country}</span>}
                        <span>{toFa(b.listingCount)} آگهی</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "در حال ذخیره..." : saved ? "ذخیره شد!" : "ذخیره"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-800">
        ℹ برندهایی که «ویژه» (featured) هستند به‌طور خودکار در این بخش
        نمایش داده می‌شوند؛ انتخاب‌های شما به آن‌ها اضافه می‌شود. بخش «برندهای
        معتبر» (نسخهٔ قدیمی) از صفحه اصلی حذف شده است تا فقط یک نوار برند
        داشته باشیم.
      </div>
    </div>
  );
}
