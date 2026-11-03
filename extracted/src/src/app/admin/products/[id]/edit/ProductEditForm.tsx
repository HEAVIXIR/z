"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  Trash2,
} from "lucide-react";

type Brand = { id: string; name: string; nameEn?: string | null; slug?: string };
type Model = { id: string; name: string; nameEn?: string | null };
type CategoryOpt = {
  id: string; name: string; slug?: string; parentId?: string | null; level?: number;
};

export type InitialProduct = {
  id: string;
  canonicalName: string;
  slug: string;
  description: string;
  status: string;
  source: string;
  confidence: number | null;
  verifiedBy: string;
  verifiedAt: string | null;
  sortOrder: number;
  categoryId: string;
  brandId: string;
  brandName: string;
  brandNameEn?: string | null;
  brandSlug?: string | null;
  modelId: string;
  modelName: string;
  modelNameEn?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PENDING_REVIEW: "در انتظار بررسی",
  ACTIVE: "فعال",
  INACTIVE: "غیرفعال",
  ARCHIVED: "بایگانی",
};

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "دستی (MANUAL)",
  AI_SUGGESTED: "پیشنهاد هوش مصنوعی",
  IMPORTED: "واردشده (IMPORTED)",
};

export default function ProductEditForm({ initial }: { initial: InitialProduct }) {
  const router = useRouter();

  const [canonicalName, setCanonicalName] = useState(initial.canonicalName);
  const [slug, setSlug] = useState(initial.slug);
  const [description, setDescription] = useState(initial.description);
  const [status, setStatus] = useState(initial.status);
  const [source, setSource] = useState(initial.source);
  const [confidence, setConfidence] = useState<string>(
    initial.confidence === null ? "" : String(initial.confidence),
  );
  const [verifiedBy, setVerifiedBy] = useState(initial.verifiedBy);
  const [sortOrder, setSortOrder] = useState<number>(initial.sortOrder);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [modelId, setModelId] = useState(initial.modelId);

  // Brand typeahead
  const [brandId, setBrandId] = useState(initial.brandId);
  const [brandQuery, setBrandQuery] = useState(initial.brandName);
  const [brandResults, setBrandResults] = useState<Brand[]>([]);
  const [brandOpen, setBrandOpen] = useState(false);
  const brandWrapRef = useCallback(() => {
    // close on outside click handler attached below
  }, []);

  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Bootstrap
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/taxonomy/categories?layer=CATALOG", { cache: "no-store" });
        const data = await res.json();
        setCategories(data.flat ?? []);
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  // Brand typeahead (debounced)
  useEffect(() => {
    const q = brandQuery.trim();
    if (!q || q === initial.brandName) {
      setBrandResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/brands/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setBrandResults(data.brands ?? []);
        setBrandOpen(true);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [brandQuery, initial.brandName]);

  // Close brand dropdown on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-brand-wrap]")) setBrandOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pickBrand = (b: Brand) => {
    setBrandId(b.id);
    setBrandQuery(b.name);
    setBrandOpen(false);
    setModelId("");
    setModels([]);
  };

  // Fetch models when brand or category changes
  useEffect(() => {
    if (!brandId) {
      setModels([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const url = `/api/taxonomy/brands/${brandId}/models${
          categoryId ? `?categoryId=${categoryId}` : ""
        }`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (alive) setModels(data.data ?? []);
      } catch {
        if (alive) setModels([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [brandId, categoryId]);

  // Save
  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: any = {
        canonicalName: canonicalName.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        status,
        source,
        confidence: confidence === "" ? null : Number(confidence),
        verifiedBy: verifiedBy || null,
        sortOrder: Number(sortOrder) || 0,
        categoryId,
        brandId: brandId || null,
        modelId: modelId || null,
      };
      const res = await fetch(`/api/admin/products/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.ok) {
        setSuccess("تغییرات با موفقیت ذخیره شد.");
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
        router.refresh();
      } else {
        setError(d.error ?? "خطا در ذخیره.");
      }
    } catch {
      setError("خطای شبکه هنگام ذخیره.");
    }
    setSaving(false);
  };

  // Delete
  const remove = async () => {
    if (!confirm(`حذف محصول «${initial.canonicalName}»؟ قابل بازگشت نیست.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${initial.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => null);
      if (d?.ok) {
        router.push("/admin/products");
        router.refresh();
      } else {
        setError(d?.error ?? "حذف ناموفق بود.");
      }
    } catch {
      setError("خطای شبکه هنگام حذف.");
    }
    setDeleting(false);
  };

  const inputCls =
    "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-600";

  const rootCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:border-[#F58220] hover:text-[#F58220]"
            title="بازگشت"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-zinc-900">ویرایش محصول</h1>
            <p className="text-xs text-zinc-500" dir="ltr">
              {initial.slug}
            </p>
          </div>
        </div>
        <button
          onClick={remove}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          حذف محصول
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-black text-zinc-900">اطلاعات محصول</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>نام محصول (Canonical) *</label>
                <input
                  value={canonicalName}
                  onChange={(e) => setCanonicalName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>اسلاگ (URL)</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className={inputCls}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelCls}>توضیحات</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
                />
              </div>
            </div>
          </section>

          {/* Taxonomy */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-black text-zinc-900">دسته‌بندی، برند و مدل</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>دسته‌بندی *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— انتخاب کنید —</option>
                  {rootCategories.map((c) => (
                    <optgroup key={c.id} label={c.name}>
                      <option value={c.id}>{c.name} (ریشه)</option>
                      {categories
                        .filter((ch) => ch.parentId === c.id)
                        .map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {c.name} › {ch.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div ref={brandWrapRef as any} data-brand-wrap className="relative">
                <label className={labelCls}>برند (اختیاری)</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={brandQuery}
                    onChange={(e) => {
                      setBrandQuery(e.target.value);
                      if (!e.target.value.trim()) setBrandId("");
                    }}
                    onFocus={() => brandResults.length > 0 && setBrandOpen(true)}
                    className={`${inputCls} pr-9`}
                    placeholder="جستجوی برند..."
                    dir="rtl"
                  />
                </div>
                {brandOpen && brandResults.length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl">
                    {brandResults.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => pickBrand(b)}
                        className="flex w-full items-center justify-between px-3 py-2 text-right text-sm transition hover:bg-[#F58220]/5"
                      >
                        <span className="font-bold text-zinc-800">{b.name}</span>
                        {b.nameEn && (
                          <span className="text-[10px] text-zinc-400" dir="ltr">
                            {b.nameEn}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>مدل (اختیاری)</label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className={inputCls}
                  disabled={!brandId || models.length === 0}
                >
                  <option value="">—</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.nameEn ? ` (${m.nameEn})` : ""}
                    </option>
                  ))}
                </select>
                {brandId && models.length === 0 && (
                  <p className="mt-1 text-[10px] text-zinc-400">مدلی برای این برند ثبت نشده.</p>
                )}
                {brandId && models.length > 0 && !modelId && (
                  <p className="mt-1 text-[10px] text-zinc-400">
                    مدل فعلی ذخیره‌شده در صورت عدم تطابق با برند فعلی پاک می‌شود.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-black text-zinc-900">وضعیت و چرخه عمر</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>وضعیت</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={inputCls}
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>منبع داده (Provenance)</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className={inputCls}
                >
                  {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>اطمینان (Confidence ۰..۱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  className={inputCls}
                  dir="ltr"
                  placeholder="مثلاً ۰.۹۲"
                />
              </div>
              <div>
                <label className={labelCls}>تأیید توسط</label>
                <input
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>ترتیب نمایش</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-10">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیره تغییرات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
