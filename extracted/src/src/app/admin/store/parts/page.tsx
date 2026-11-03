"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Star,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { toFa, formatCompactPrice } from "@/lib/format";

/* ============================================================
   /admin/store/parts — HEAVIX parts CRUD
   ============================================================ */

type Part = {
  id: string;
  name: string;
  nameFa: string | null;
  sku: string;
  categoryId: string;
  brandId: string | null;
  description: string | null;
  priceUsd: number;
  oldPriceUsd: number | null;
  contactForPrice: boolean;
  stock: number;
  lowStockThreshold: number;
  images: any[];
  compatibleCars: any[];
  sourceUrl: string | null;
  active: boolean;
  featured: boolean;
  views: number;
  soldCount: number;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string } | null;
  brand: { id: string; name: string; slug: string } | null;
};

type Category = { id: string; name: string; slug: string };
type Brand = { id: string; name: string; slug: string };

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
const LABEL_CLS = "mb-1.5 block text-xs font-bold text-zinc-500";
const onlyDigits = (v: string) => v.replace(/[^\d.]/g, "");

export default function StorePartsPage() {
  const [items, setItems] = useState<Part[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    nameFa: "",
    sku: "",
    categoryId: "",
    brandId: "",
    description: "",
    priceUsd: "",
    oldPriceUsd: "",
    contactForPrice: false,
    stock: "",
    lowStockThreshold: "5",
    sourceUrl: "",
    active: true,
    featured: false,
  });

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/store/categories?limit=200", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } catch {}
  }, []);
  const loadBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/store/brands?limit=200", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setBrands(json.data);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (categoryId) params.set("categoryId", categoryId);
      if (brandId) params.set("brandId", brandId);
      if (activeFilter) params.set("active", activeFilter);
      if (lowStockOnly) params.set("lowStock", "1");
      const res = await fetch(`/api/admin/store/parts?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("خطا در بارگذاری");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else throw new Error(json.error || "خطا");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [q, categoryId, brandId, activeFilter, lowStockOnly]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCategories(); loadBrands(); }, [loadCategories, loadBrands]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      nameFa: "",
      sku: "",
      categoryId: categories[0]?.id ?? "",
      brandId: "",
      description: "",
      priceUsd: "",
      oldPriceUsd: "",
      contactForPrice: false,
      stock: "",
      lowStockThreshold: "5",
      sourceUrl: "",
      active: true,
      featured: false,
    });
    setModalOpen(true);
  };

  const openEdit = (p: Part) => {
    setEditing(p);
    setForm({
      name: p.name,
      nameFa: p.nameFa ?? "",
      sku: p.sku,
      categoryId: p.categoryId,
      brandId: p.brandId ?? "",
      description: p.description ?? "",
      priceUsd: String(p.priceUsd),
      oldPriceUsd: p.oldPriceUsd ? String(p.oldPriceUsd) : "",
      contactForPrice: !!p.contactForPrice,
      stock: String(p.stock),
      lowStockThreshold: String(p.lowStockThreshold),
      sourceUrl: p.sourceUrl ?? "",
      active: p.active,
      featured: p.featured,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.sku || !form.categoryId) {
      setToast("نام، SKU و دسته‌بندی الزامی است");
      return;
    }
    if (!form.contactForPrice && !form.priceUsd) {
      setToast("قیمت الزامی است (یا گزینهٔ «تماس بگیرید» را فعال کنید)");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name,
        nameFa: form.nameFa || null,
        sku: form.sku,
        categoryId: form.categoryId,
        brandId: form.brandId || null,
        description: form.description || null,
        priceUsd: Number(form.priceUsd) || 0,
        oldPriceUsd: form.oldPriceUsd ? Number(form.oldPriceUsd) : null,
        contactForPrice: form.contactForPrice,
        stock: Number(form.stock) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 5,
        sourceUrl: form.sourceUrl || null,
        active: form.active,
        featured: form.featured,
      };
      const url = editing
        ? `/api/admin/store/parts/${editing.id}`
        : "/api/admin/store/parts";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "خطا");
      setModalOpen(false);
      setToast(editing ? "قطعه به‌روزرسانی شد" : "قطعه ایجاد شد");
      await load();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (p: Part) => {
    if (!confirm(`حذف قطعه «${p.name}»؟ این عمل بازگشت‌ناپذیر است.`)) return;
    try {
      const res = await fetch(`/api/admin/store/parts/${p.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "خطا");
      setToast("قطعه حذف شد");
      await load();
    } catch (e: any) {
      setToast(e.message);
    }
  };

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">قطعات فروشگاه هویکس</h1>
          <p className="text-sm text-zinc-500">مدیریت کاتالوگ قطعات خودرو و ماشین‌آلات</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
          <button
            onClick={openCreate}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#F58220] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#e0701a]"
          >
            <Plus size={16} />
            قطعهٔ جدید
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            type="text"
            placeholder="جستجوی نام، نام فارسی یا SKU…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={INPUT_CLS}
          />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={INPUT_CLS}>
            <option value="">همه دسته‌ها</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={INPUT_CLS}>
            <option value="">همه برندها</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className={INPUT_CLS}>
            <option value="">همه</option>
            <option value="1">فعال</option>
            <option value="0">غیرفعال</option>
          </select>
          <label className={`flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm font-medium ${lowStockOnly ? "border-amber-300 bg-amber-50 text-amber-700" : "border-zinc-200 bg-white text-zinc-600"}`}>
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="hidden"
            />
            <AlertTriangle size={16} />
            کم‌موجودی
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-right text-sm">
            <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-bold">نام قطعه</th>
                <th className="px-4 py-3 font-bold">SKU</th>
                <th className="px-4 py-3 font-bold">دسته / برند</th>
                <th className="px-4 py-3 font-bold">قیمت (USD)</th>
                <th className="px-4 py-3 font-bold">موجودی</th>
                <th className="px-4 py-3 font-bold">وضعیت</th>
                <th className="px-4 py-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                    <Loader2 size={20} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                    <Package size={28} className="mx-auto mb-2 opacity-50" />
                    قطعه‌ای یافت نشد
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-900">{p.name}</div>
                      {p.nameFa && <div className="text-xs text-zinc-500">{p.nameFa}</div>}
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                        <Eye size={11} /> {toFa(p.views)} بازدید
                        {p.featured && <span className="flex items-center gap-0.5 text-amber-600"><Star size={11} /> ویژه</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600">{p.sku}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="text-zinc-700">{p.category?.name ?? "—"}</div>
                      <div className="text-zinc-400">{p.brand?.name ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      {p.contactForPrice ? (
                        <span className="inline-block rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">تماس بگیرید</span>
                      ) : (
                        <>
                          <div className="font-bold text-zinc-900">${toFa(p.priceUsd)}</div>
                          {p.oldPriceUsd && <div className="text-xs text-zinc-400 line-through">${toFa(p.oldPriceUsd)}</div>}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${p.stock <= p.lowStockThreshold ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {toFa(p.stock)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${p.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                        {p.active ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => del(p)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">
                {editing ? "ویرایش قطعه" : "قطعهٔ جدید"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={LABEL_CLS}>نام انگلیسی *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT_CLS} />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL_CLS}>نام فارسی</label>
                <input value={form.nameFa} onChange={(e) => setForm({ ...form, nameFa: e.target.value })} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>SKU (کد یکتا) *</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={INPUT_CLS} dir="ltr" />
              </div>
              <div>
                <label className={LABEL_CLS}>دسته‌بندی *</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={INPUT_CLS}>
                  <option value="">انتخاب کنید</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>برند</label>
                <select value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })} className={INPUT_CLS}>
                  <option value="">—</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>قیمت (USD)</label>
                <input
                  value={form.priceUsd}
                  onChange={(e) => setForm({ ...form, priceUsd: onlyDigits(e.target.value) })}
                  className={INPUT_CLS + (form.contactForPrice ? " opacity-50" : "")}
                  dir="ltr"
                  disabled={form.contactForPrice}
                  placeholder={form.contactForPrice ? "بدون قیمت" : "0"}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>قیمت قبلی (USD)</label>
                <input
                  value={form.oldPriceUsd}
                  onChange={(e) => setForm({ ...form, oldPriceUsd: onlyDigits(e.target.value) })}
                  className={INPUT_CLS + (form.contactForPrice ? " opacity-50" : "")}
                  dir="ltr"
                  disabled={form.contactForPrice}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>موجودی</label>
                <input value={form.stock} onChange={(e) => setForm({ ...form, stock: onlyDigits(e.target.value) })} className={INPUT_CLS} dir="ltr" />
              </div>
              <div>
                <label className={LABEL_CLS}>آستانه موجودی کم</label>
                <input value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: onlyDigits(e.target.value) })} className={INPUT_CLS} dir="ltr" />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL_CLS}>توضیحات</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]"
                />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL_CLS}>آدرس منبع (اختیاری)</label>
                <input
                  value={form.sourceUrl}
                  onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                  className={INPUT_CLS}
                  dir="ltr"
                  placeholder="https://example.com/part/..."
                />
                <p className="mt-1 text-[11px] text-zinc-400">اگر قطعه از سایت دیگری اسکرپ شده، آدرس آن اینجا ذخیره می‌شود.</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 md:col-span-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.contactForPrice} onChange={(e) => setForm({ ...form, contactForPrice: e.target.checked })} className="h-4 w-4 accent-[#F58220]" />
                  <span className="font-bold text-amber-700">تماس بگیرید</span>
                  <span className="text-xs text-zinc-400">(بدون قیمت عمومی)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-[#F58220]" />
                  فعال
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-4 w-4 accent-[#F58220]" />
                  ویژه
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                انصراف
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex h-10 items-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e0701a] disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                ذخیره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
