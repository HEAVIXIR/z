"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Loader2,
  CheckCircle2,
  Save,
  Trash2,
  Pencil,
  AlertCircle,
  Search,
} from "lucide-react";
import { toFa } from "@/lib/format";

type Brand = { id: string; name: string; nameEn?: string | null; slug?: string };
type Model = { id: string; name: string; nameEn?: string | null };
type CategoryOpt = {
  id: string; name: string; slug?: string; parentId?: string | null; level?: number;
};
type Product = {
  id: string;
  canonicalName: string;
  slug: string;
  status: string;
  source?: string | null;
  sortOrder: number;
  brand?: { id: string; name: string; nameEn?: string | null } | null;
  category?: { id: string; name: string; slug?: string } | null;
  model?: { id: string; name: string; nameEn?: string | null } | null;
  listingsCount?: number;
  machinesCount?: number;
  partsCount?: number;
  attachmentsCount?: number;
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PENDING_REVIEW: "در انتظار بررسی",
  ACTIVE: "فعال",
  INACTIVE: "غیرفعال",
  ARCHIVED: "بایگانی",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  PENDING_REVIEW: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-zinc-100 text-zinc-500",
  ARCHIVED: "bg-zinc-200 text-zinc-600",
};

function slugifyFa(s: string): string {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const EMPTY_FORM = {
  canonicalName: "",
  slug: "",
  categoryId: "",
  brandId: "",
  modelId: "",
  description: "",
  status: "ACTIVE",
  source: "MANUAL",
  sortOrder: 0,
};

export default function ProductsAdminClient() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  // Brand typeahead state
  const [brandQuery, setBrandQuery] = useState("");
  const [brandResults, setBrandResults] = useState<Brand[]>([]);
  const [brandOpen, setBrandOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [models, setModels] = useState<Model[]>([]);

  // Filter state
  const [filterStatus, setFilterStatus] = useState("");
  const [filterQ, setFilterQ] = useState("");

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [slugEdited, setSlugEdited] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/taxonomy/categories?layer=CATALOG", { cache: "no-store" });
      const data = await res.json();
      setCategories(data.flat ?? []);
    } catch {
      setCategories([]);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterQ.trim()) params.set("q", filterQ.trim());
      const res = await fetch(`/api/admin/products?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterQ]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Brand typeahead (debounced)
  useEffect(() => {
    const q = brandQuery.trim();
    if (!q) {
      setBrandResults([]);
      return;
    }
    if (selectedBrand && q === selectedBrand.name) {
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
        setBrandResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [brandQuery, selectedBrand]);

  // Load models when brand selected
  useEffect(() => {
    if (!selectedBrand) {
      setModels([]);
      setForm((f) => ({ ...f, modelId: "" }));
      return;
    }
    let alive = true;
    (async () => {
      try {
        const url = `/api/taxonomy/brands/${selectedBrand.id}/models${
          form.categoryId ? `?categoryId=${form.categoryId}` : ""
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
  }, [selectedBrand, form.categoryId]);

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "canonicalName" && !slugEdited) {
        next.slug = slugifyFa(String(v));
      }
      return next;
    });
  }

  function pickBrand(b: Brand) {
    setSelectedBrand(b);
    setBrandQuery(b.name);
    setBrandOpen(false);
    setForm((f) => ({ ...f, brandId: b.id, modelId: "" }));
  }

  function clearBrand() {
    setSelectedBrand(null);
    setBrandQuery("");
    setForm((f) => ({ ...f, brandId: "", modelId: "" }));
    setModels([]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.canonicalName.trim()) {
      setErr("نام محصول الزامی است.");
      return;
    }
    if (!form.categoryId) {
      setErr("دسته‌بندی الزامی است.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonicalName: form.canonicalName.trim(),
          slug: form.slug.trim() || undefined,
          categoryId: form.categoryId,
          brandId: form.brandId || null,
          modelId: form.modelId || null,
          description: form.description.trim() || null,
          status: form.status,
          source: form.source,
          sortOrder: Number(form.sortOrder) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "ذخیره ناموفق بود.");
      }
      setForm({ ...EMPTY_FORM });
      setSlugEdited(false);
      clearBrand();
      setCreated(true);
      setTimeout(() => setCreated(false), 2500);
      await loadProducts();
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "خطا در ذخیره.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(p: Product) {
    if (!confirm(`حذف محصول «${p.canonicalName}»؟ این عمل قابل بازگشت نیست.`)) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "حذف ناموفق بود.");
      }
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "خطا در حذف.");
    } finally {
      setBusyId(null);
    }
  }

  const rootCategories = categories.filter((c) => !c.parentId);
  const inputCls =
    "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-600";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <Package className="h-6 w-6 text-[#F58220]" />
          محصولات
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          موجودیت کاتالوگی canonical (Brand → Model → Product) — بخش ۵ مرجع اصلاحی.
        </p>
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Create form */}
        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-lg font-black text-zinc-900">محصول جدید</h2>
          </div>

          <div>
            <label className={labelCls}>نام محصول (Canonical) *</label>
            <input
              value={form.canonicalName}
              onChange={(e) => setField("canonicalName", e.target.value)}
              className={inputCls}
              placeholder="مثلاً Caterpillar 320"
            />
          </div>
          <div>
            <label className={labelCls}>اسلاگ (URL)</label>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugEdited(true);
                setField("slug", e.target.value);
              }}
              className={inputCls}
              dir="ltr"
              placeholder="auto-generated"
            />
            {!form.slug && form.canonicalName && (
              <p className="mt-1 text-[10px] text-zinc-400" dir="ltr">
                پیش‌فرض: {slugifyFa(form.canonicalName)}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>دسته‌بندی *</label>
            <select
              value={form.categoryId}
              onChange={(e) => setField("categoryId", e.target.value)}
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

          {/* Brand typeahead */}
          <div className="relative">
            <label className={labelCls}>برند (اختیاری)</label>
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={brandQuery}
                onChange={(e) => {
                  setBrandQuery(e.target.value);
                  if (!e.target.value.trim()) clearBrand();
                }}
                onFocus={() => brandResults.length > 0 && setBrandOpen(true)}
                className={`${inputCls} pr-9`}
                placeholder="جستجوی برند..."
                dir="rtl"
              />
            </div>
            {selectedBrand && (
              <button
                type="button"
                onClick={clearBrand}
                className="absolute left-3 top-9 text-xs text-zinc-400 hover:text-red-500"
              >
                پاک کردن
              </button>
            )}
            {brandOpen && brandResults.length > 0 && (
              <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl">
                {brandResults.map((b) => (
                  <button
                    key={b.id}
                    type="button"
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
              value={form.modelId}
              onChange={(e) => setField("modelId", e.target.value)}
              className={inputCls}
              disabled={!selectedBrand || models.length === 0}
            >
              <option value="">—</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.nameEn ? ` (${m.nameEn})` : ""}
                </option>
              ))}
            </select>
            {selectedBrand && models.length === 0 && (
              <p className="mt-1 text-[10px] text-zinc-400">مدلی برای این برند ثبت نشده.</p>
            )}
          </div>

          <div>
            <label className={labelCls}>توضیحات</label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
              placeholder="توضیحات کوتاه درباره محصول..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>وضعیت</label>
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
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
              <label className={labelCls}>منبع داده</label>
              <select
                value={form.source}
                onChange={(e) => setField("source", e.target.value)}
                className={inputCls}
              >
                <option value="MANUAL">دستی (MANUAL)</option>
                <option value="AI_SUGGESTED">پیشنهاد هوش مصنوعی</option>
                <option value="IMPORTED">واردشده (IMPORTED)</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>ترتیب</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setField("sortOrder", Number(e.target.value))}
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : created ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {submitting ? "در حال ذخیره..." : created ? "ذخیره شد!" : "افزودن محصول"}
          </button>
        </form>

        {/* List */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
                placeholder="جستجوی محصول..."
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-[#F58220]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#F58220]"
            >
              <option value="">همه وضعیت‌ها</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <p className="text-sm font-bold text-zinc-700">
            {loading ? "در حال بارگذاری..." : `${toFa(products.length)} محصول`}
          </p>

          {loading ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-zinc-200 bg-white">
              <Loader2 className="h-5 w-5 animate-spin text-[#F58220]" />
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400">
              هنوز محصولی ثبت نشده است.
            </div>
          ) : (
            <div className="max-h-[700px] overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 text-right font-bold">نام محصول</th>
                    <th className="px-4 py-3 text-right font-bold">دسته / برند</th>
                    <th className="px-4 py-3 text-center font-bold">وضعیت</th>
                    <th className="px-4 py-3 text-center font-bold">آگهی‌ها</th>
                    <th className="px-4 py-3 text-center font-bold">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-zinc-900">{p.canonicalName}</div>
                        <div className="text-[10px] text-zinc-400" dir="ltr">
                          {p.slug}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600">
                        {p.category && <div>{p.category.name}</div>}
                        {p.brand && (
                          <div className="text-[11px] text-zinc-500" dir="ltr">
                            {p.brand.name}
                            {p.brand.nameEn ? ` (${p.brand.nameEn})` : ""}
                          </div>
                        )}
                        {p.model && (
                          <div className="text-[10px] text-zinc-400" dir="ltr">
                            {p.model.name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            STATUS_COLORS[p.status] ?? "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-zinc-600">
                        {toFa(p.listingsCount ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:border-[#F58220] hover:text-[#F58220]"
                            title="ویرایش"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => remove(p)}
                            disabled={busyId === p.id}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-red-500 transition hover:bg-red-50 disabled:opacity-60"
                            title="حذف"
                          >
                            {busyId === p.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
