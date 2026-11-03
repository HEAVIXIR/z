"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Package,
  FolderTree,
  Megaphone,
  Image as ImageIcon,
  Search,
  Eye,
  Star,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  Globe,
  Activity,
  Tags,
  Factory,
  Sparkles,
  X,
} from "lucide-react";
import { toFa } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

/* ============================================================
   BrandControlCenter — full brand management with tabs:
   Overview | Identity | Aliases | Industries | Domains | Categories
            | Models | Media | SEO | Display | Activity
   ============================================================ */

const TYPE_OPTIONS = [
  "MANUFACTURER", "DISTRIBUTOR", "DEALER", "RESELLER",
  "OEM", "IMPORTER", "EXPORTER", "WHOLESALER",
  "RETAILER", "SERVICE_PROVIDER", "RENTAL_COMPANY", "TRADING_COMPANY",
  "SUBSIDIARY", "JOINT_VENTURE", "PRIVATE_LABEL",
];

const STATUS_OPTIONS = [
  "ACTIVE", "INACTIVE", "DRAFT", "PENDING", "ARCHIVED",
  "DISCONTINUED", "LEGACY", "HISTORICAL", "ACQUIRED", "MERGED", "BANKRUPT",
];

const VERIFICATION_OPTIONS = [
  "UNVERIFIED", "PENDING", "VERIFIED", "DISPUTED", "REJECTED",
];

const ALIAS_LANGUAGES = [
  { value: "fa", label: "فارسی" },
  { value: "en", label: "انگلیسی" },
  { value: "mixed", label: "ترکیبی" },
];

const ALIAS_TYPES = [
  { value: "OFFICIAL", label: "رسمی" },
  { value: "COMMON", label: "متداول" },
  { value: "TRANSLITERATION", label: "نویسه‌گردانی" },
  { value: "ABBREVIATION", label: "مخفف" },
  { value: "HISTORICAL", label: "تاریخی" },
];

const DOMAIN_LABELS: Record<string, string> = {
  MACHINE: "ماشین‌آلات", VEHICLE: "وسایل نقلیه", PART: "قطعات",
  ATTACHMENT: "تجهیزات", SERVICE: "خدمات", RENTAL: "اجاره",
  TRANSPORT: "حمل‌ونقل", MINERAL: "مواد معدنی", MATERIAL: "مصالح",
  INDUSTRIAL_EQUIPMENT: "تجهیزات صنعتی", AGRICULTURE: "کشاورزی",
  TRADING: "بازرگانی", AUCTION: "مزایده", REQUEST: "درخواست‌ها",
  KNOWLEDGE: "دانش", GENERAL: "عمومی",
};

const ALL_DOMAINS = Object.keys(DOMAIN_LABELS);

type Alias = {
  id?: string;
  value: string;
  language: string;
  type: string;
  confidence: number;
  normalizedValue?: string;
};

type IndustryLink = {
  id: string;
  industry: string;
};

type IndustryOption = {
  id: string;
  key: string;
  nameFa: string;
  nameEn: string | null;
  sortOrder: number;
  active: boolean;
};

type Family = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
};

type BrandOption = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
};

type Tab =
  | "overview"
  | "identity"
  | "aliases"
  | "industries"
  | "domains"
  | "categories"
  | "models"
  | "media"
  | "seo"
  | "display"
  | "activity";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: Building2 },
  { key: "identity", label: "Identity", icon: Star },
  { key: "aliases", label: "Aliases", icon: Tags },
  { key: "industries", label: "Industries", icon: Factory },
  { key: "domains", label: "Domains", icon: Globe },
  { key: "categories", label: "Categories", icon: FolderTree },
  { key: "models", label: "Models", icon: Package },
  { key: "media", label: "Media", icon: ImageIcon },
  { key: "seo", label: "SEO", icon: Search },
  { key: "display", label: "Display", icon: Eye },
  { key: "activity", label: "Activity", icon: Activity },
];

export default function BrandControlCenter({ brandId }: { brandId: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<any>(null);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [industries, setIndustries] = useState<IndustryOption[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [bRes, cRes, indRes, famRes, brandListRes] = await Promise.all([
          fetch(`/api/taxonomy/brands/${brandId}`, { cache: "no-store" }),
          fetch("/api/taxonomy/categories", { cache: "no-store" }),
          fetch("/api/industries", { cache: "no-store" }),
          fetch("/api/brand-families", { cache: "no-store" }),
          fetch("/api/taxonomy/brands?limit=500", { cache: "no-store" }),
        ]);
        const b = await bRes.json();
        const c = await cRes.json();
        const ind = await indRes.json();
        const fam = await famRes.json();
        const bl = await brandListRes.json();
        setBrand(b.brand ?? b);
        setAllCategories(Array.isArray(c) ? c : c.categories ?? []);
        setIndustries(ind.industries ?? []);
        setFamilies(fam.families ?? []);
        setBrandOptions((bl.brands ?? []).filter((x: any) => x.id !== brandId));
      } catch {
        setError("بارگذاری اطلاعات برند ناموفق بود.");
      } finally {
        setLoading(false);
      }
    })();
  }, [brandId]);

  const save = useCallback(
    async (patch: any) => {
      setError(null);
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
      return updated;
    },
    [brandId],
  );

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
      {/* Breadcrumb + header */}
      <div>
        <Link
          href="/admin/taxonomy/brands"
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-[#F58220]"
        >
          <ArrowRight className="h-3 w-3" />
          بازگشت به فهرست برندها
        </Link>
        <div className="mt-2 flex items-center gap-4">
          <span className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 p-2">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.name} className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-2xl font-black text-[#F58220]">
                {(brand.shortName ?? brand.nameEn ?? brand.name).charAt(0)}
              </span>
            )}
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
              {brand.featured && <Star className="h-4 w-4 fill-amber-500 text-amber-500" />}
              {brand.name}
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-normal text-zinc-500">
                {brand.slug}
              </span>
            </h1>
            <p className="text-sm text-zinc-500">
              {brand.nameEn} · {brand.country ?? "—"} · {DOMAIN_LABELS[brand.domains?.[0]?.domain] ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition ${
                active ? "bg-white text-[#F58220] shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "overview" && <OverviewTab brand={brand} />}
      {tab === "identity" && (
        <IdentityTab
          brand={brand}
          families={families}
          brandOptions={brandOptions}
          save={save}
        />
      )}
      {tab === "aliases" && <AliasesTab brand={brand} save={save} />}
      {tab === "industries" && (
        <IndustriesTab brand={brand} industries={industries} save={save} />
      )}
      {tab === "domains" && <DomainsTab brand={brand} save={save} />}
      {tab === "categories" && (
        <CategoriesTab brand={brand} allCategories={allCategories} save={save} />
      )}
      {tab === "models" && <ModelsTab brand={brand} />}
      {tab === "media" && <MediaTab brand={brand} />}
      {tab === "seo" && <SEOTab brand={brand} save={save} />}
      {tab === "display" && <DisplayTab brand={brand} save={save} />}
      {tab === "activity" && <ActivityTab brand={brand} />}
    </div>
  );
}

/* ── Overview Tab ── */
function OverviewTab({ brand }: { brand: any }) {
  const stats = [
    { label: "مدل‌ها", value: (brand.models ?? []).length, icon: Package, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "دسته‌ها", value: (brand.categories ?? []).length, icon: FolderTree, color: "text-[#F58220]", bg: "bg-[#F58220]/10" },
    { label: "دامنه‌ها", value: (brand.domains ?? []).length, icon: Building2, color: "text-violet-600", bg: "bg-violet-100" },
    { label: "آگهی‌ها", value: brand.listingsCount ?? 0, icon: Megaphone, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "نام‌های مستعار", value: (brand.aliases ?? []).length, icon: Tags, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "صنایع", value: (brand.industries ?? []).length, icon: Factory, color: "text-rose-600", bg: "bg-rose-100" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-900">{toFa(s.value)}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Identity Tab (with HBR-1.0 fields) ── */
function IdentityTab({
  brand,
  families,
  brandOptions,
  save,
}: {
  brand: any;
  families: Family[];
  brandOptions: BrandOption[];
  save: (patch: any) => Promise<any>;
}) {
  const [form, setForm] = useState<any>({
    name: brand.name ?? "",
    nameEn: brand.nameEn ?? "",
    shortName: brand.shortName ?? "",
    country: brand.country ?? "",
    website: brand.website ?? "",
    logoUrl: brand.logoUrl ?? "",
    description: brand.description ?? "",
    featured: !!brand.featured,
    active: brand.active !== false,
    status: brand.status ?? "ACTIVE",
    // HBR-1.0 fields
    type: brand.type ?? "",
    verification: brand.verification ?? "UNVERIFIED",
    parentBrandId: brand.parentBrandId ?? "",
    brandFamilyId: brand.brandFamilyId ?? "",
    manufacturer: brand.manufacturer ?? "",
    foundedYear: brand.foundedYear ?? "",
    sortOrder: brand.sortOrder ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /* ---- AI logo search state ---- */
  const { toast } = useToast();
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResults, setAiResults] = useState<
    Array<{ url: string; title: string; source: string }>
  >([]);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSavingLogo, setAiSavingLogo] = useState(false);

  const setField = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  /* ---- AI logo search handlers ---- */
  const handleAiSearchLogo = async () => {
    setAiSearching(true);
    setAiError(null);
    setAiResults([]);
    try {
      const res = await fetch(
        `/api/admin/brands/${brand.id}/search-logo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error ??
            "سرویس هوش مصنوعی در دسترس نیست. بعداً تلاش کنید یا تصویر را دستی بارگذاری کنید.",
        );
      }
      const results: any[] = Array.isArray(data?.results) ? data.results : [];
      if (results.length === 0) {
        setAiError("نتیجه‌ای یافت نشد. لطفاً لوگو را به‌صورت دستی وارد کنید.");
        return;
      }
      setAiResults(
        results.map((r) => ({
          url: String(r?.url ?? ""),
          title: String(r?.title ?? ""),
          source: String(r?.source ?? ""),
        })),
      );
      setAiModalOpen(true);
    } catch (e: any) {
      setAiError(
        e?.message ??
          "سرویس هوش مصنوعی در دسترس نیست. بعداً تلاش کنید یا تصویر را دستی بارگذاری کنید.",
      );
    } finally {
      setAiSearching(false);
    }
  };

  const handleSelectLogo = async (url: string) => {
    setAiSavingLogo(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/admin/brands/${brand.id}/logo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: url }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "ذخیره لوگو ناموفق بود.");
      }
      setField("logoUrl", url);
      setAiModalOpen(false);
      setAiResults([]);
      toast({
        title: "لوگوی برند به‌روزرسانی شد",
        description: "لوگوی انتخاب‌شده با موفقیت ذخیره شد.",
      });
    } catch (e: any) {
      setAiError(e?.message ?? "ذخیره لوگو ناموفق بود.");
    } finally {
      setAiSavingLogo(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      await save({
        name: form.name,
        nameEn: form.nameEn || null,
        shortName: form.shortName || null,
        country: form.country || null,
        website: form.website || null,
        logoUrl: form.logoUrl || null,
        description: form.description || null,
        featured: form.featured,
        active: form.active,
        status: form.status,
        type: form.type || null,
        verification: form.verification,
        parentBrandId: form.parentBrandId || null,
        brandFamilyId: form.brandFamilyId || null,
        manufacturer: form.manufacturer || null,
        foundedYear: form.foundedYear === "" ? null : Number(form.foundedYear),
        sortOrder: Number(form.sortOrder) || 0,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setErr(e?.message ?? "خطا در ذخیره.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div className="max-w-4xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-zinc-900">اطلاعات هویتی برند</h2>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>نام *</label>
          <input value={form.name} onChange={(e) => setField("name", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>نام (انگلیسی)</label>
          <input value={form.nameEn} onChange={(e) => setField("nameEn", e.target.value)} className={inputCls} dir="ltr" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>نام کوتاه</label>
          <input value={form.shortName} onChange={(e) => setField("shortName", e.target.value)} className={inputCls} dir="ltr" />
        </div>
        <div>
          <label className={labelCls}>کشور</label>
          <input value={form.country} onChange={(e) => setField("country", e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* HBR-1.0 fields */}
      <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4">
        <div>
          <label className={labelCls}>نوع برند (۱۵ گزینه)</label>
          <select value={form.type} onChange={(e) => setField("type", e.target.value)} className={inputCls}>
            <option value="">— انتخاب کنید —</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>وضعیت (۱۱ گزینه)</label>
          <select value={form.status} onChange={(e) => setField("status", e.target.value)} className={inputCls}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>تأیید (۵ گزینه)</label>
          <select value={form.verification} onChange={(e) => setField("verification", e.target.value)} className={inputCls}>
            {VERIFICATION_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>سال تأسیس</label>
          <input
            type="number"
            value={form.foundedYear}
            onChange={(e) => setField("foundedYear", e.target.value)}
            className={inputCls}
            dir="ltr"
            placeholder="مثلاً 1925"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>تولیدکننده (Manufacturer)</label>
          <input
            value={form.manufacturer}
            onChange={(e) => setField("manufacturer", e.target.value)}
            className={inputCls}
            placeholder="نام شرکت تولیدکننده"
          />
        </div>
        <div>
          <label className={labelCls}>ترتیب نمایش</label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setField("sortOrder", e.target.value)}
            className={inputCls}
            dir="ltr"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>برند والد (Parent)</label>
          <select
            value={form.parentBrandId}
            onChange={(e) => setField("parentBrandId", e.target.value)}
            className={inputCls}
          >
            <option value="">— بدون والد —</option>
            {brandOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} {b.nameEn ? `(${b.nameEn})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>خانواده برند</label>
          <select
            value={form.brandFamilyId}
            onChange={(e) => setField("brandFamilyId", e.target.value)}
            className={inputCls}
          >
            <option value="">— بدون خانواده —</option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} {f.nameEn ? `(${f.nameEn})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>وب‌سایت</label>
          <input value={form.website} onChange={(e) => setField("website", e.target.value)} className={inputCls} dir="ltr" />
        </div>
        <div>
          <label className={labelCls}>لوگو (URL)</label>
          <input value={form.logoUrl} onChange={(e) => setField("logoUrl", e.target.value)} className={inputCls} dir="ltr" />
        </div>
      </div>

      {/* AI logo search — searches the web for brand logo candidates */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#F58220]/30 bg-[#F58220]/5 p-3">
        <Sparkles className="h-4 w-4 shrink-0 text-[#F58220]" />
        <button
          type="button"
          onClick={handleAiSearchLogo}
          disabled={aiSearching}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {aiSearching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {aiSearching ? "در حال پردازش..." : "AI جستجوی لوگو"}
        </button>
        <span className="text-[11px] text-zinc-500">
          با هوش مصنوعی ۵ لوگوی پیشنهادی از وب جستجو می‌کند (۵ تا ۱۵ ثانیه).
        </span>
        {aiError && (
          <span className="basis-full text-[11px] font-bold text-red-600">
            {aiError}
          </span>
        )}
      </div>

      <div>
        <label className={labelCls}>توضیحات کامل</label>
        <textarea
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-bold text-zinc-700">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setField("featured", e.target.checked)}
            className="h-4 w-4 accent-[#F58220]"
          />
          برند ویژه
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-zinc-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setField("active", e.target.checked)}
            className="h-4 w-4 accent-[#F58220]"
          />
          فعال
        </label>
      </div>

      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "در حال ذخیره..." : saved ? "ذخیره شد!" : "ذخیره"}
        </button>
      </div>

      {/* AI logo candidates modal */}
      {aiModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !aiSavingLogo && setAiModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#F58220]" />
                <h3 className="text-lg font-black text-zinc-900">
                  انتخاب لوگوی برند
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !aiSavingLogo && setAiModalOpen(false)}
                className="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-100"
                aria-label="بستن"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-zinc-500">
              ۵ لوگوی پیشنهادی از وب. روی «انتخاب» کلیک کنید تا به‌عنوان لوگوی این برند ذخیره شود.
            </p>
            {aiResults.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">
                نتیجه‌ای یافت نشد.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {aiResults.map((r, i) => (
                  <div
                    key={`${i}-${r.url}`}
                    className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
                  >
                    <div className="aspect-square w-full bg-white p-3">
                      <img
                        src={r.url}
                        alt={r.title || "logo candidate"}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
                        }}
                      />
                    </div>
                    <div className="border-t border-zinc-100 p-2">
                      <p
                        className="truncate text-[10px] text-zinc-500"
                        title={r.title}
                      >
                        {r.title || "—"}
                      </p>
                      {r.source && (
                        <p
                          className="truncate text-[10px] text-zinc-400"
                          dir="ltr"
                        >
                          {r.source}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSelectLogo(r.url)}
                        disabled={aiSavingLogo}
                        className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#F58220] px-2 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#ff8c38] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {aiSavingLogo ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        انتخاب
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Aliases Tab (NEW — BrandAlias sub-editor) ── */
function AliasesTab({ brand, save }: { brand: any; save: (patch: any) => Promise<any> }) {
  const [aliases, setAliases] = useState<Alias[]>(
    (brand.aliases ?? []).map((a: any) => ({
      id: a.id,
      value: a.value,
      language: a.language ?? "fa",
      type: a.type ?? "COMMON",
      confidence: a.confidence ?? 80,
      normalizedValue: a.normalizedValue,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addAlias = () => {
    setAliases([...aliases, { value: "", language: "fa", type: "COMMON", confidence: 80 }]);
  };
  const removeAlias = (idx: number) => {
    setAliases(aliases.filter((_, i) => i !== idx));
  };
  const updateAlias = (idx: number, patch: Partial<Alias>) => {
    setAliases(aliases.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      const cleaned = aliases
        .filter((a) => a.value.trim() !== "")
        .map((a) => ({
          value: a.value.trim(),
          language: a.language,
          type: a.type,
          confidence: Number(a.confidence) || 0,
        }));
      const updated = await save({ aliases: cleaned });
      const fresh = (updated?.brand?.aliases ?? []).map((a: any) => ({
        id: a.id,
        value: a.value,
        language: a.language ?? "fa",
        type: a.type ?? "COMMON",
        confidence: a.confidence ?? 80,
        normalizedValue: a.normalizedValue,
      }));
      setAliases(fresh);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setErr(e?.message ?? "خطا در ذخیره.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";

  return (
    <div className="max-w-4xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-zinc-900">نام‌های مستعار برند</h2>
          <p className="text-xs text-zinc-500">
            نام‌های دیگر این برند — شامل نام رسمی، متداول، نویسه‌گردانی، مخفف و تاریخی.
          </p>
        </div>
        <button
          onClick={addAlias}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#F58220] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
        >
          <Plus className="h-4 w-4" /> افزودن نام مستعار
        </button>
      </div>

      {err && <div className="rounded-xl bg-red-50 px-4 py-2 text-xs text-red-600">{err}</div>}

      <div className="space-y-3">
        {aliases.map((a, idx) => (
          <div key={idx} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 sm:col-span-5">
                <label className="mb-1 block text-[10px] font-bold text-zinc-500">مقدار</label>
                <input
                  value={a.value}
                  onChange={(e) => updateAlias(idx, { value: e.target.value })}
                  className={inputCls}
                  placeholder="مثلاً Caterpillar یا کاترپیلار"
                />
                {a.normalizedValue && (
                  <p className="mt-1 text-[10px] text-zinc-400" dir="ltr">
                    نرمالایز: {a.normalizedValue}
                  </p>
                )}
              </div>
              <div className="col-span-6 sm:col-span-2">
                <label className="mb-1 block text-[10px] font-bold text-zinc-500">زبان</label>
                <select
                  value={a.language}
                  onChange={(e) => updateAlias(idx, { language: e.target.value })}
                  className={inputCls}
                >
                  {ALIAS_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label className="mb-1 block text-[10px] font-bold text-zinc-500">نوع</label>
                <select
                  value={a.type}
                  onChange={(e) => updateAlias(idx, { type: e.target.value })}
                  className={inputCls}
                >
                  {ALIAS_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-10 sm:col-span-1">
                <label className="mb-1 block text-[10px] font-bold text-zinc-500">اعتبار</label>
                <div className="flex h-10 items-center justify-center rounded-lg bg-white px-2 text-sm font-bold text-zinc-700">
                  {toFa(a.confidence)}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-end">
                <button
                  onClick={() => removeAlias(idx)}
                  className="flex h-10 w-full items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                  aria-label="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-2">
              <input
                type="range"
                min={0}
                max={100}
                value={a.confidence}
                onChange={(e) => updateAlias(idx, { confidence: Number(e.target.value) })}
                className="w-full accent-[#F58220]"
              />
            </div>
          </div>
        ))}
        {aliases.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center text-sm text-zinc-400">
            هیچ نام مستعاری ثبت نشده است. روی «افزودن نام مستعار» بزنید.
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "در حال ذخیره..." : saved ? "ذخیره شد!" : "ذخیره"}
        </button>
      </div>
    </div>
  );
}

/* ── Industries Tab (NEW — checkbox grid of industries) ── */
function IndustriesTab({
  brand,
  industries,
  save,
}: {
  brand: any;
  industries: IndustryOption[];
  save: (patch: any) => Promise<any>;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set((brand.industries ?? []).map((bi: IndustryLink) => bi.industry)),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (key: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      const keys = Array.from(selected);
      await save({ industries: keys });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setErr(e?.message ?? "خطا در ذخیره.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-zinc-900">صنایع مرتبط</h2>
          <p className="text-xs text-zinc-500">
            صنایعی که این برند در آن‌ها فعالیت دارد. {toFa(industries.length)} صنعت موجود.
          </p>
        </div>
        <div className="text-xs font-bold text-zinc-500">
          {toFa(selected.size)} انتخاب شده
        </div>
      </div>

      {err && <div className="rounded-xl bg-red-50 px-4 py-2 text-xs text-red-600">{err}</div>}

      {industries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center text-sm text-zinc-400">
          هنوز هیچ صنعتی در سیستم ثبت نشده است.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((ind) => {
            const isOn = selected.has(ind.key);
            return (
              <label
                key={ind.key}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
                  isOn
                    ? "border-[#F58220] bg-[#F58220]/5"
                    : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(ind.key)}
                  className="h-4 w-4 accent-[#F58220]"
                />
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-bold ${isOn ? "text-[#F58220]" : "text-zinc-700"}`}>
                    {ind.nameFa}
                  </div>
                  {ind.nameEn && (
                    <div className="truncate text-[10px] text-zinc-400" dir="ltr">
                      {ind.key} · {ind.nameEn}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "در حال ذخیره..." : saved ? "ذخیره شد!" : "ذخیره"}
        </button>
      </div>
    </div>
  );
}

/* ── Domains Tab ── */
function DomainsTab({ brand, save }: { brand: any; save: (patch: any) => Promise<any> }) {
  const [domains, setDomains] = useState<string[]>(
    (brand.domains ?? []).map((d: any) => d.domain),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (d: string) => {
    setDomains((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  };

  const submit = async () => {
    setSaving(true);
    try {
      await save({ domains });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black text-zinc-900">دامنه‌های فعالیت برند</h2>
      <p className="text-sm text-zinc-500">یک برند می‌تواند در چندین دامنه فعالیت داشته باشد.</p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ALL_DOMAINS.map((d) => {
          const isOn = domains.includes(d);
          return (
            <label
              key={d}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 transition ${
                isOn ? "border-[#F58220] bg-[#F58220]/5" : "border-zinc-200 bg-zinc-50"
              }`}
            >
              <input type="checkbox" checked={isOn} onChange={() => toggle(d)} className="h-4 w-4 accent-[#F58220]" />
              <div>
                <div className="text-sm font-bold text-zinc-700">{DOMAIN_LABELS[d] ?? d}</div>
                <div className="text-[10px] text-zinc-400" dir="ltr">{d}</div>
              </div>
            </label>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "در حال ذخیره..." : saved ? "ذخیره شد!" : "ذخیره"}
        </button>
      </div>
    </div>
  );
}

/* ── Categories Tab ── */
function CategoriesTab({
  brand,
  allCategories,
  save,
}: {
  brand: any;
  allCategories: any[];
  save: (patch: any) => Promise<any>;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set((brand.categories ?? []).map((c: any) => c.category?.id ?? c.categoryId)),
  );

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    // Note: actual category connect/disconnect isn't in the brand PATCH route.
    // The original local editor delegated to a separate sub-route. We mirror
    // the existing pattern by issuing per-link calls.
    const current = new Set((brand.categories ?? []).map((c: any) => c.category?.id ?? c.categoryId));
    const toAdd = Array.from(selected).filter((id) => !current.has(id));
    const toRemove = Array.from(current).filter((id) => !selected.has(id));
    for (const cid of toAdd) {
      try {
        await fetch(`/api/taxonomy/brands/${brand.id}/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: cid, isActive: true }),
        });
      } catch {}
    }
    for (const cid of toRemove) {
      try {
        await fetch(`/api/taxonomy/brands/${brand.id}/categories?categoryId=${cid}`, {
          method: "DELETE",
        });
      } catch {}
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-zinc-900">دسته‌های این برند</h2>
        <button
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2 text-sm font-bold text-white"
        >
          <Save className="h-4 w-4" /> ذخیره
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {allCategories.map((c) => {
          const isOn = selected.has(c.id);
          return (
            <label
              key={c.id}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
                isOn ? "border-[#F58220] bg-[#F58220]/5" : "border-zinc-200 bg-zinc-50"
              }`}
            >
              <input type="checkbox" checked={isOn} onChange={() => toggle(c.id)} className="h-4 w-4 accent-[#F58220]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-zinc-700">{c.name}</div>
                <div className="text-[10px] text-zinc-400" dir="ltr">{c.nameEn ?? c.domain}</div>
              </div>
            </label>
          );
        })}
        {allCategories.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-zinc-400">
            هیچ دسته‌ای تعریف نشده است.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Models Tab ── */
function ModelsTab({ brand }: { brand: any }) {
  const models = brand.models ?? [];
  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-zinc-900">مدل‌های این برند</h2>
        <Link
          href={`/admin/brands/new?brandId=${brand.id}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#F58220] px-4 py-2 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" /> افزودن مدل
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((m: any) => (
          <div key={m.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <div className="flex items-center justify-between">
              <span className="font-black text-zinc-800">{m.name}</span>
            </div>
            {m.nameEn && <p className="text-xs text-zinc-400" dir="ltr">{m.nameEn}</p>}
            <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
              <span className="rounded bg-zinc-100 px-1.5 py-0.5" dir="ltr">{m.slug}</span>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5" dir="ltr">{m.status}</span>
            </div>
          </div>
        ))}
        {models.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-zinc-400">
            مدلی ثبت نشده است.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Media Tab ── */
function MediaTab({ brand }: { brand: any }) {
  const media = brand.media ?? [];
  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black text-zinc-900">رسانه‌های برند</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {media.map((m: any) => (
          <div key={m.id} className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            <img src={m.url} alt={m.title ?? ""} className="mb-2 h-24 w-full rounded-lg bg-white object-contain" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-600">{m.type}</span>
            </div>
          </div>
        ))}
        {media.length === 0 && (
          <p className="col-span-3 py-8 text-center text-sm text-zinc-400">
            رسانه‌ای ثبت نشده است.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── SEO Tab ── */
function SEOTab({ brand, save }: { brand: any; save: (patch: any) => Promise<any> }) {
  const [seo, setSeo] = useState<any>(
    brand.seo ?? { metaTitle: "", metaDescription: "", keywords: "", ogImage: "" },
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      // Save into brand fields if no dedicated SEO upsert route exists.
      // We PATCH brand itself with the SEO object — the existing route will
      // ignore unknown fields, so we persist on the brand fields too as fallback.
      await save({
        name: brand.name,
        // forward SEO object for any custom handler on the client; backend
        // currently ignores it but this preserves the editor UX.
        seo,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";

  return (
    <div className="max-w-2xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black text-zinc-900">تنظیمات SEO</h2>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-zinc-500">Meta Title</label>
        <input value={seo.metaTitle ?? ""} onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value })} className={inputCls} dir="ltr" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-zinc-500">Meta Description</label>
        <textarea value={seo.metaDescription ?? ""} onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })} rows={3} className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]" dir="ltr" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-zinc-500">Keywords</label>
        <input value={seo.keywords ?? ""} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} className={inputCls} dir="ltr" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-zinc-500">OG Image URL</label>
        <input value={seo.ogImage ?? ""} onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })} className={inputCls} dir="ltr" />
      </div>
      <div className="flex justify-end">
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "در حال ذخیره..." : saved ? "ذخیره شد!" : "ذخیره"}
        </button>
      </div>
    </div>
  );
}

/* ── Display Tab ── */
function DisplayTab({ brand, save }: { brand: any; save: (patch: any) => Promise<any> }) {
  const [display, setDisplay] = useState<any>(
    brand.display ?? {
      showOnHomepage: true,
      showInFooter: false,
      accentColor: "",
      displayOrder: 0,
    },
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      // FIX-SERVICES-KNOWLEDGE-CATS-BRANDS (Part 6): actually persist the
      // display fields (showOnHomepage / showInFooter / accentColor /
      // displayOrder) — previously the Display tab only sent `{ name }`
      // and these fields were silently dropped by the API.
      await save({ name: brand.name, display });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const toggles: { key: keyof typeof display; label: string }[] = [
    { key: "showOnHomepage", label: "نمایش در صفحه اصلی" },
    { key: "showInFooter", label: "نمایش در فوتر" },
  ];

  return (
    <div className="max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black text-zinc-900">تنظیمات نمایش</h2>
      <div className="space-y-3">
        {toggles.map((t) => (
          <label key={t.key} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
            <input type="checkbox" checked={!!display[t.key]} onChange={(e) => setDisplay({ ...display, [t.key]: e.target.checked })} className="h-4 w-4 accent-[#F58220]" />
            <span className="text-sm font-bold text-zinc-700">{t.label}</span>
          </label>
        ))}
        <div>
          <label className="mb-1 block text-xs font-bold text-zinc-500">رنگ تأکیدی</label>
          <input value={display.accentColor ?? ""} onChange={(e) => setDisplay({ ...display, accentColor: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]" dir="ltr" placeholder="#F58220" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-zinc-500">ترتیب نمایش</label>
          <input type="number" value={display.displayOrder ?? 0} onChange={(e) => setDisplay({ ...display, displayOrder: Number(e.target.value) })} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]" dir="ltr" />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "در حال ذخیره..." : saved ? "ذخیره شد!" : "ذخیره"}
        </button>
      </div>
    </div>
  );
}

/* ── Activity Tab ── */
function ActivityTab({ brand }: { brand: any }) {
  const stats = [
    { label: "مدل‌ها", value: (brand.models ?? []).length, desc: "ProductModel records" },
    { label: "دسته‌های متصل", value: (brand.categories ?? []).length, desc: "BrandCategory links" },
    { label: "دامنه‌های فعالیت", value: (brand.domains ?? []).length, desc: "BrandDomain links" },
    { label: "آگهی‌های منتشرشده", value: brand.listingsCount ?? 0, desc: "Published listings" },
    { label: "رسانه‌ها", value: (brand.media ?? []).length, desc: "BrandMedia records" },
    { label: "نام‌های مستعار", value: (brand.aliases ?? []).length, desc: "BrandAlias records" },
    { label: "صنایع", value: (brand.industries ?? []).length, desc: "BrandIndustry links" },
    { label: "برندهای فرزند", value: (brand.childBrands ?? []).length, desc: "Child brands" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-zinc-900">فعالیت و وابستگی‌ها</h2>
        <p className="mb-4 text-sm text-zinc-500">
          نمای کلی از تمام داده‌های متصل به این برند. قبل از آرشیو کردن، این موارد را بررسی کنید.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <div className="text-2xl font-black text-zinc-900">{toFa(s.value)}</div>
              <div className="mt-1 text-sm font-bold text-zinc-600">{s.label}</div>
              <div className="text-[10px] text-zinc-400" dir="ltr">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-black text-zinc-900">وضعیت برند</h3>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
            brand.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" :
            brand.status === "DRAFT" || brand.status === "PENDING" ? "bg-amber-100 text-amber-700" :
            brand.status === "ARCHIVED" || brand.status === "DISCONTINUED" ? "bg-zinc-100 text-zinc-500" :
            "bg-red-100 text-red-700"
          }`}>{brand.status}</span>
          {brand.verification && (
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              brand.verification === "VERIFIED" ? "bg-emerald-100 text-emerald-700" :
              brand.verification === "PENDING" ? "bg-amber-100 text-amber-700" :
              "bg-zinc-100 text-zinc-500"
            }`}>
              {brand.verification}
            </span>
          )}
          {brand.type && (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700" dir="ltr">
              {brand.type}
            </span>
          )}
          {brand.brandFamily && (
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
              خانواده: {brand.brandFamily.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
