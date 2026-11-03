"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Globe,
  Tag,
  Settings,
} from "lucide-react";

/* ============================================================
   SEOAdminClient — edit SEO metadata for any entity.
   • Entity type selector + ID/search picker.
   • Edit form: metaTitle, metaDescription, keywords,
     canonicalUrl, ogImage, ogTitle, ogDescription, robots,
     sitemap priority/freq, structuredData (JSON-LD).
   • "تولید خودکار" button — auto-generate from entity.
   ============================================================ */

type EntityType = "Category" | "Brand" | "Product" | "Listing" | "Article" | "Page";

const ENTITY_TYPES: EntityType[] = [
  "Category",
  "Brand",
  "Product",
  "Listing",
  "Article",
  "Page",
];

const CHANGE_FREQS = [
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
];

type SEORow = {
  id?: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  canonicalUrl: string;
  ogImage: string;
  ogTitle: string;
  ogDescription: string;
  structuredData: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  sitemapPriority: number;
  sitemapChangeFreq: string;
};

const EMPTY_SEO: SEORow = {
  metaTitle: "",
  metaDescription: "",
  keywords: "",
  canonicalUrl: "",
  ogImage: "",
  ogTitle: "",
  ogDescription: "",
  structuredData: "",
  robotsIndex: true,
  robotsFollow: true,
  sitemapPriority: 0.5,
  sitemapChangeFreq: "weekly",
};

export default function SEOAdminClient() {
  const [entityType, setEntityType] = useState<EntityType>("Category");
  const [entityId, setEntityId] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; label: string; slug?: string }[]
  >([]);
  const [seo, setSeo] = useState<SEORow>(EMPTY_SEO);
  const [generated, setGenerated] = useState<{
    metaTitle: string;
    metaDescription: string;
    structuredData: string;
  } | null>(null);
  const [entityInfo, setEntityInfo] = useState<{
    id: string;
    name: string;
    slug: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Search entities when the user types.
  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const url = `/api/admin/seo?entityType=${entityType}&search=${encodeURIComponent(search)}`;
        const res = await fetch(url, { cache: "no-store" });
        const j = await res.json();
        if (!cancelled) setSearchResults(j.results ?? []);
      } catch {
        if (!cancelled) setSearchResults([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search, entityType]);

  const loadSEO = useCallback(async () => {
    if (!entityId.trim()) return;
    setLoading(true);
    setError(null);
    setToast(null);
    try {
      const url = `/api/admin/seo?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`;
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "خطا در دریافت SEO.");
        return;
      }
      if (j.seo) {
        setSeo({
          metaTitle: j.seo.metaTitle ?? "",
          metaDescription: j.seo.metaDescription ?? "",
          keywords: j.seo.keywords ?? "",
          canonicalUrl: j.seo.canonicalUrl ?? "",
          ogImage: j.seo.ogImage ?? "",
          ogTitle: j.seo.ogTitle ?? "",
          ogDescription: j.seo.ogDescription ?? "",
          structuredData: j.seo.structuredData ?? "",
          robotsIndex: j.seo.robotsIndex ?? true,
          robotsFollow: j.seo.robotsFollow ?? true,
          sitemapPriority: j.seo.sitemapPriority ?? 0.5,
          sitemapChangeFreq: j.seo.sitemapChangeFreq ?? "weekly",
        });
      } else {
        setSeo(EMPTY_SEO);
      }
      setGenerated(j.generated ?? null);
      setEntityInfo(j.entity ?? null);
    } catch {
      setError("خطا در ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (entityId) loadSEO();
  }, [entityId, loadSEO]);

  const applyGenerated = () => {
    if (!generated) return;
    setSeo((prev) => ({
      ...prev,
      metaTitle: generated.metaTitle,
      metaDescription: generated.metaDescription,
      structuredData: generated.structuredData,
    }));
    setToast("مقادیر پیشنهادی از روی موجودیت بارگذاری شد.");
  };

  const save = async () => {
    if (!entityId.trim()) {
      setError("ابتدا یک موجودیت انتخاب کنید.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, ...seo }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "خطا در ذخیره‌سازی.");
        return;
      }
      setToast("SEO با موفقیت ذخیره شد.");
    } catch {
      setError("خطا در ارتباط با سرور.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <Globe className="h-6 w-6 text-[#F58220]" />
          مدیریت سئو
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          ویرایش متادیتای سئو، داده‌های ساختاریافته (JSON-LD) و تنظیمات نقشهٔ
          سایت برای هر موجودیت. این لایه مکمل <code>BrandSEO</code> موجود است و
          شامل همهٔ نوع‌های موجودیت عمومی می‌شود.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} />
          {toast}
          <button
            onClick={() => setToast(null)}
            className="mr-auto rounded px-2 text-xs underline"
          >
            بستن
          </button>
        </div>
      )}

      {/* Entity picker */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-800">
          <Search size={16} className="text-[#F58220]" />
          انتخاب موجودیت
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-zinc-600">نوع موجودیت</span>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value as EntityType);
                setEntityId("");
                setEntityInfo(null);
                setSeo(EMPTY_SEO);
                setGenerated(null);
                setSearch("");
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs font-semibold text-zinc-600">
              جستجوی موجودیت
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="حداقل ۲ حرف تایپ کنید..."
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
            />
            {searchResults.length > 0 && (
              <div className="relative">
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setEntityId(r.id);
                        setSearch(r.label);
                        setSearchResults([]);
                      }}
                      className="block w-full truncate px-3 py-2 text-right text-sm transition hover:bg-amber-50"
                    >
                      <span className="font-semibold text-zinc-800">
                        {r.label}
                      </span>
                      {r.slug && (
                        <span className="mr-2 font-mono text-[10px] text-zinc-400">
                          {r.slug}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </label>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <input
            type="text"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="یا شناسهٔ موجودیت را مستقیماً وارد کنید"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-[#F58220]"
            dir="ltr"
          />
          <button
            onClick={loadSEO}
            disabled={loading || !entityId}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            بارگذاری
          </button>
        </div>

        {entityInfo && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            موجودیت بارگذاری شد:{" "}
            <span className="font-bold">{entityInfo.name}</span>
            {entityInfo.slug && (
              <code className="mr-2 rounded bg-white/60 px-1 font-mono text-[10px]">
                {entityInfo.slug}
              </code>
            )}
          </div>
        )}
      </div>

      {/* Edit form */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-800">
            <Tag size={16} className="text-[#F58220]" />
            ویرایش متادیتا
          </div>
          <button
            onClick={applyGenerated}
            disabled={!generated}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={13} />
            تولید خودکار
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="عنوان متا (metaTitle)"
            value={seo.metaTitle}
            onChange={(v) => setSeo((s) => ({ ...s, metaTitle: v }))}
            maxLength={70}
          />
          <Field
            label="کانونیکال (canonicalUrl)"
            value={seo.canonicalUrl}
            onChange={(v) => setSeo((s) => ({ ...s, canonicalUrl: v }))}
            ltr
          />
          <TextareaField
            label="توضیحات متا (metaDescription)"
            value={seo.metaDescription}
            onChange={(v) => setSeo((s) => ({ ...s, metaDescription: v }))}
            maxLength={170}
            className="md:col-span-2"
          />
          <Field
            label="کلمات کلیدی (کاما‌جدا)"
            value={seo.keywords}
            onChange={(v) => setSeo((s) => ({ ...s, keywords: v }))}
            className="md:col-span-2"
          />

          <Field
            label="og:image"
            value={seo.ogImage}
            onChange={(v) => setSeo((s) => ({ ...s, ogImage: v }))}
            ltr
          />
          <Field
            label="og:title"
            value={seo.ogTitle}
            onChange={(v) => setSeo((s) => ({ ...s, ogTitle: v }))}
          />
          <TextareaField
            label="og:description"
            value={seo.ogDescription}
            onChange={(v) => setSeo((s) => ({ ...s, ogDescription: v }))}
            className="md:col-span-2"
          />

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-zinc-600">
              داده‌های ساختاریافته (JSON-LD)
            </label>
            <textarea
              value={seo.structuredData}
              onChange={(e) =>
                setSeo((s) => ({ ...s, structuredData: e.target.value }))
              }
              rows={6}
              dir="ltr"
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-[11px] outline-none focus:border-[#F58220]"
              placeholder='{"@context":"https://schema.org",...}'
            />
          </div>

          {/* Robots + sitemap */}
          <div className="md:col-span-2 mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-zinc-700">
              <Settings size={14} className="text-[#F58220]" />
              ربات‌ها و نقشهٔ سایت
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <CheckboxField
                label="index"
                checked={seo.robotsIndex}
                onChange={(v) => setSeo((s) => ({ ...s, robotsIndex: v }))}
              />
              <CheckboxField
                label="follow"
                checked={seo.robotsFollow}
                onChange={(v) => setSeo((s) => ({ ...s, robotsFollow: v }))}
              />
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-zinc-600">
                  اولویت نقشهٔ سایت
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={seo.sitemapPriority}
                  onChange={(e) =>
                    setSeo((s) => ({
                      ...s,
                      sitemapPriority: Number(e.target.value),
                    }))
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
                  dir="ltr"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-zinc-600">
                  فرکانس تغییر
                </span>
                <select
                  value={seo.sitemapChangeFreq}
                  onChange={(e) =>
                    setSeo((s) => ({ ...s, sitemapChangeFreq: e.target.value }))
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
                  dir="ltr"
                >
                  {CHANGE_FREQS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={save}
            disabled={saving || !entityId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  maxLength,
  ltr,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  ltr?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-xs font-semibold text-zinc-600">
        {label}
        {maxLength && (
          <span className="mr-1 text-[10px] text-zinc-400">
            ({value.length}/{maxLength})
          </span>
        )}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={ltr ? "ltr" : "rtl"}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  maxLength,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-xs font-semibold text-zinc-600">
        {label}
        {maxLength && (
          <span className="mr-1 text-[10px] text-zinc-400">
            ({value.length}/{maxLength})
          </span>
        )}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
      />
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-[#F58220] focus:ring-[#F58220]"
      />
      <span className="text-xs font-mono font-semibold text-zinc-700">
        {label}
      </span>
    </label>
  );
}
