"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  ArrowRight,
  Building2,
  Globe,
  FolderTree,
  Cog,
  Image as ImageIcon,
  Search,
  Star,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import MediaUploader from "@/components/admin/MediaUploader";

type Tab =
  | "info"
  | "domains"
  | "categories"
  | "models"
  | "media"
  | "seo"
  | "display"
  | "ai"
  | "danger";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "info", label: "اطلاعات اصلی", icon: Building2 },
  { key: "domains", label: "دامنه‌ها", icon: Globe },
  { key: "categories", label: "دسته‌بندی‌ها", icon: FolderTree },
  { key: "models", label: "مدل‌ها", icon: Cog },
  { key: "media", label: "رسانه", icon: ImageIcon },
  { key: "seo", label: "سئو", icon: Search },
  { key: "display", label: "نمایش", icon: Eye },
  { key: "ai", label: "دستیار هوش مصنوعی", icon: Sparkles },
  { key: "danger", label: "منطقهٔ خطر", icon: Trash2 },
];

const DOMAINS = [
  "MACHINE", "VEHICLE", "PART", "ATTACHMENT", "SERVICE", "RENTAL",
  "TRANSPORT", "MINERAL", "MATERIAL", "INDUSTRIAL_EQUIPMENT",
  "AGRICULTURE", "TRADING", "AUCTION", "REQUEST", "KNOWLEDGE", "GENERAL",
];

export default function BrandControlCenter({
  brandId,
}: {
  brandId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("info");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [brand, setBrand] = useState<any>(null);
  const [allCategories, setAllCategories] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [bRes, cRes] = await Promise.all([
          fetch(`/api/taxonomy/brands/${brandId}`, { cache: "no-store" }),
          fetch("/api/taxonomy/categories", { cache: "no-store" }),
        ]);
        const b = await bRes.json();
        const c = await cRes.json();
        setBrand(b.brand ?? b);
        setAllCategories(Array.isArray(c) ? c : c.categories ?? []);
      } catch {
        setError("بارگذاری اطلاعات برند ناموفق بود.");
      } finally {
        setLoading(false);
      }
    })();
  }, [brandId]);

  const save = async (patch: any) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/taxonomy/brands/${brandId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "ذخیره ناموفق بود.");
      }
      const updated = await res.json();
      setBrand(updated.brand ?? updated);
      setSuccess("تغییرات ذخیره شد.");
      setTimeout(() => setSuccess(null), 2500);
    } catch (e: any) {
      setError(e?.message ?? "خطا در ذخیره.");
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

  if (!brand) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
        <p className="text-sm text-zinc-500">برند یافت نشد.</p>
        <Link
          href="/admin/taxonomy/brands"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white"
        >
          بازگشت
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/taxonomy/brands"
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-[#F58220]"
          >
            <ArrowRight className="h-3 w-3" />
            بازگشت به فهرست برندها
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-zinc-900">
            {brand.featured && (
              <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
            )}
            {brand.name}
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-normal text-zinc-500">
              {brand.slug}
            </span>
          </h1>
        </div>
        <button
          type="button"
          onClick={() => save({})}
          disabled={saving}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          ذخیره
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
              tab === t.key
                ? "bg-[#F58220] text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        {tab === "info" && (
          <div className="space-y-4">
            <Field
              label="نام برند"
              value={brand.name ?? ""}
              onChange={(v) => setBrand({ ...brand, name: v })}
            />
            <Field
              label="نام انگلیسی"
              value={brand.nameEn ?? ""}
              onChange={(v) => setBrand({ ...brand, nameEn: v })}
              dir="ltr"
            />
            <Field
              label="نام کوتاه"
              value={brand.shortName ?? ""}
              onChange={(v) => setBrand({ ...brand, shortName: v })}
            />
            <Field
              label="کشور"
              value={brand.country ?? ""}
              onChange={(v) => setBrand({ ...brand, country: v })}
            />
            <Field
              label="وب‌سایت"
              value={brand.website ?? ""}
              onChange={(v) => setBrand({ ...brand, website: v })}
              dir="ltr"
            />
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">
                لوگوی برند
              </label>
              <MediaUploader
                value={brand.logoUrl}
                onChange={(v) =>
                  setBrand({ ...brand, logoUrl: v ?? "" })
                }
                endpoint="/api/admin/upload"
                hint="لوگوی برند در کارت‌ها، صفحه برند و نتایج جستجو نمایش داده می‌شود."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">
                توضیحات
              </label>
              <textarea
                value={brand.description ?? ""}
                onChange={(e) => setBrand({ ...brand, description: e.target.value })}
                rows={4}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setBrand({ ...brand, featured: !brand.featured })}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                  brand.featured
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-zinc-200 bg-zinc-50 text-zinc-500"
                }`}
              >
                <Star className="h-4 w-4" />
                ویژه
              </button>
              <button
                type="button"
                onClick={() => setBrand({ ...brand, active: !brand.active })}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                  brand.active
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-zinc-200 bg-zinc-50 text-zinc-500"
                }`}
              >
                {brand.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {brand.active ? "فعال" : "غیرفعال"}
              </button>
              <select
                value={brand.status ?? "ACTIVE"}
                onChange={(e) => setBrand({ ...brand, status: e.target.value })}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-700 outline-none focus:border-[#F58220]"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
            <SaveButton onClick={() => save({
              name: brand.name,
              nameEn: brand.nameEn,
              shortName: brand.shortName,
              country: brand.country,
              website: brand.website,
              logoUrl: brand.logoUrl,
              description: brand.description,
              featured: brand.featured,
              active: brand.active,
              status: brand.status,
            })} saving={saving} />
          </div>
        )}

        {tab === "domains" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              دامنه‌هایی که این برند در آن‌ها فعالیت دارد.
            </p>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map((d) => {
                const selected = (brand.domains ?? []).some((x: any) => x.domain === d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={async () => {
                      const newDomains = selected
                        ? brand.domains.filter((x: any) => x.domain !== d)
                        : [...(brand.domains ?? []), { domain: d }];
                      setBrand({ ...brand, domains: newDomains });
                      await save({ domains: newDomains.map((x: any) => x.domain) });
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      selected
                        ? "bg-[#F58220] text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "categories" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              دسته‌بندی‌های مرتبط با این برند.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {allCategories.map((c: any) => {
                const selected = (brand.categories ?? []).some(
                  (x: any) => x.category?.id === c.id || x.categoryId === c.id,
                );
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={async () => {
                      const current = (brand.categories ?? []).map((x: any) =>
                        x.category?.id ?? x.categoryId,
                      );
                      const newIds = selected
                        ? current.filter((id: string) => id !== c.id)
                        : [...current, c.id];
                      setBrand({
                        ...brand,
                        categories: newIds.map((id: string) => ({ categoryId: id })),
                      });
                      await save({ categoryIds: newIds });
                    }}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-right text-xs transition ${
                      selected
                        ? "border-[#F58220] bg-[#F58220]/5 text-[#F58220]"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300"
                    }`}
                  >
                    <span className="text-lg">{c.icon ?? "📁"}</span>
                    <span className="flex-1 truncate font-bold">{c.name}</span>
                    {selected && <Star className="h-3.5 w-3.5 fill-current" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "models" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                مدل‌های این برند ({(brand.models ?? []).length} مدل)
              </p>
              <Link
                href={`/admin/brands/new?brandId=${brandId}`}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#F58220] px-3 text-xs font-bold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                مدل جدید
              </Link>
            </div>
            <div className="space-y-2">
              {(brand.models ?? []).map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Cog className="h-4 w-4 text-zinc-400" />
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{m.name}</p>
                      {m.nameEn && (
                        <p className="text-[11px] text-zinc-400" dir="ltr">
                          {m.nameEn}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      m.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {m.status ?? "ACTIVE"}
                  </span>
                </div>
              ))}
              {(brand.models ?? []).length === 0 && (
                <p className="rounded-xl bg-zinc-50 p-6 text-center text-xs text-zinc-400">
                  مدلی ثبت نشده است.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "media" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              تصاویر و رسانه‌های مرتبط با برند.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(brand.media ?? []).map((m: any) => (
                <div
                  key={m.id}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
                >
                  { }
                  <img src={m.url} alt={m.title ?? ""} className="aspect-video w-full object-cover" />
                  <div className="p-2">
                    <p className="text-[10px] font-bold text-zinc-700">
                      {m.type}
                    </p>
                    {m.title && (
                      <p className="truncate text-[10px] text-zinc-400">
                        {m.title}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {(brand.media ?? []).length === 0 && (
                <p className="col-span-full rounded-xl bg-zinc-50 p-6 text-center text-xs text-zinc-400">
                  رسانه‌ای ثبت نشده است.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "seo" && (
          <div className="space-y-4">
            <Field
              label="عنوان متا (Meta Title)"
              value={brand.seo?.metaTitle ?? ""}
              onChange={(v) =>
                setBrand({ ...brand, seo: { ...(brand.seo ?? {}), metaTitle: v } })
              }
            />
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">
                توضیحات متا (Meta Description)
              </label>
              <textarea
                value={brand.seo?.metaDescription ?? ""}
                onChange={(e) =>
                  setBrand({
                    ...brand,
                    seo: { ...(brand.seo ?? {}), metaDescription: e.target.value },
                  })
                }
                rows={3}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              />
            </div>
            <Field
              label="کلمات کلیدی"
              value={brand.seo?.keywords ?? ""}
              onChange={(v) =>
                setBrand({ ...brand, seo: { ...(brand.seo ?? {}), keywords: v } })
              }
            />
            <Field
              label="تصویر OG"
              value={brand.seo?.ogImage ?? ""}
              onChange={(v) =>
                setBrand({ ...brand, seo: { ...(brand.seo ?? {}), ogImage: v } })
              }
              dir="ltr"
            />
            <SaveButton onClick={() => save({ seo: brand.seo ?? {} })} saving={saving} />
          </div>
        )}

        {tab === "display" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() =>
                setBrand({
                  ...brand,
                  display: {
                    ...(brand.display ?? {}),
                    showOnHomepage: !brand.display?.showOnHomepage,
                  },
                })
              }
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-sm font-bold transition ${
                brand.display?.showOnHomepage
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Eye className="h-4 w-4" />
                نمایش در صفحهٔ اصلی
              </span>
              {brand.display?.showOnHomepage ? "فعال" : "غیرفعال"}
            </button>
            <button
              type="button"
              onClick={() =>
                setBrand({
                  ...brand,
                  display: {
                    ...(brand.display ?? {}),
                    showInFooter: !brand.display?.showInFooter,
                  },
                })
              }
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-sm font-bold transition ${
                brand.display?.showInFooter
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Eye className="h-4 w-4" />
                نمایش در فوتر
              </span>
              {brand.display?.showInFooter ? "فعال" : "غیرفعال"}
            </button>
            <Field
              label="رنگ تأکیدی"
              value={brand.display?.accentColor ?? ""}
              onChange={(v) =>
                setBrand({
                  ...brand,
                  display: { ...(brand.display ?? {}), accentColor: v },
                })
              }
              dir="ltr"
            />
            <Field
              label="ترتیب نمایش"
              type="number"
              value={String(brand.display?.displayOrder ?? 0)}
              onChange={(v) =>
                setBrand({
                  ...brand,
                  display: { ...(brand.display ?? {}), displayOrder: Number(v) },
                })
              }
            />
            <SaveButton onClick={() => save({ display: brand.display ?? {} })} saving={saving} />
          </div>
        )}

        {tab === "ai" && <BrandAIAssistant brandId={brandId} brandName={brand.name} />}

        {tab === "danger" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <h3 className="flex items-center gap-2 text-sm font-black text-red-700">
                <Trash2 className="h-4 w-4" />
                حذف برند
              </h3>
              <p className="mt-2 text-xs leading-6 text-red-600">
                با حذف این برند، تمام ارتباطات آن (دامنه‌ها، دسته‌بندی‌ها، مدل‌ها و
                رسانه) نیز حذف می‌شوند. آگهی‌های مرتبط بدون برند می‌مانند. این
                عملیات قابل بازگشت نیست.
              </p>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`آیا از حذف "${brand.name}" مطمئن هستید؟`)) return;
                  try {
                    const res = await fetch(`/api/taxonomy/brands/${brandId}`, {
                      method: "DELETE",
                    });
                    if (!res.ok) throw new Error();
                    router.push("/admin/taxonomy/brands");
                  } catch {
                    setError("حذف ناموفق بود.");
                  }
                }}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                حذف کامل برند
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  dir,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "ltr" | "rtl";
  type?: "text" | "number";
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-zinc-700">{label}</label>
      <input
        type={type}
        value={value}
        dir={dir}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
      />
    </div>
  );
}

function SaveButton({
  onClick,
  saving,
}: {
  onClick: () => void;
  saving: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      ذخیره تغییرات
    </button>
  );
}

/* Embedded AI Assistant tab content */
function BrandAIAssistant({
  brandId,
  brandName,
}: {
  brandId: string;
  brandName: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestions = [
    `تحلیل وضعیت برند ${brandName} در بازار ایران`,
    "پیشنهاد مدل‌های جدید برای افزودن به کاتالوگ",
    "بهبود توضیحات برند برای سئو",
    "تحلیل رقبا و نقاط تمایز",
  ];

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/ai-market-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, brandId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResponse(data.answer ?? data.analysis ?? "پاسخی دریافت نشد.");
    } catch (e: any) {
      setError(e?.message ?? "خطا در ارتباط با هوش مصنوعی.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#F58220]" />
        <h3 className="text-base font-black text-zinc-900">
          دستیار هوش مصنوعی برند
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setPrompt(s);
              ask(s);
            }}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 transition hover:border-[#F58220]/40 hover:text-[#F58220]"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(prompt)}
          placeholder="سوال خود را دربارهٔ این برند بنویسید..."
          className="h-11 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
        />
        <button
          type="button"
          onClick={() => ask(prompt)}
          disabled={loading || !prompt.trim()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          پرسش
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {response && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#F58220]" />
            <span className="text-xs font-bold text-zinc-700">پاسخ هوش مصنوعی</span>
          </div>
          <p className="whitespace-pre-line text-sm leading-7 text-zinc-700">
            {response}
          </p>
        </div>
      )}
    </div>
  );
}
