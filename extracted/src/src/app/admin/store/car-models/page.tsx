"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Car,
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { toFa } from "@/lib/format";

type CarModel = {
  id: string;
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  type: string;
  partCount: number;
};

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
const LABEL_CLS = "mb-1.5 block text-xs font-bold text-zinc-500";
const onlyDigits = (v: string) => v.replace(/[^\d]/g, "");

export default function StoreCarModelsPage() {
  const [items, setItems] = useState<CarModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CarModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    brand: "",
    model: "",
    yearFrom: "",
    yearTo: "",
    type: "PASSENGER",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/admin/store/car-models?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("خطا");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else throw new Error(json.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [q, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ brand: "", model: "", yearFrom: "2000", yearTo: String(new Date().getFullYear()), type: "PASSENGER" });
    setModalOpen(true);
  };

  const openEdit = (c: CarModel) => {
    setEditing(c);
    setForm({
      brand: c.brand,
      model: c.model,
      yearFrom: String(c.yearFrom),
      yearTo: String(c.yearTo),
      type: c.type,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.brand || !form.model || !form.yearFrom || !form.yearTo) {
      setToast("همه فیلدها الزامی است");
      return;
    }
    setSaving(true);
    try {
      const body = {
        brand: form.brand,
        model: form.model,
        yearFrom: Number(form.yearFrom),
        yearTo: Number(form.yearTo),
        type: form.type,
      };
      const url = editing ? `/api/admin/store/car-models/${editing.id}` : "/api/admin/store/car-models";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setModalOpen(false);
      setToast(editing ? "خودرو به‌روزرسانی شد" : "خودرو ایجاد شد");
      await load();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (c: CarModel) => {
    if (!confirm(`حذف «${c.brand} ${c.model}»؟`)) return;
    try {
      const res = await fetch(`/api/admin/store/car-models/${c.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setToast("خودرو حذف شد");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">مدل‌های خودرو</h1>
          <p className="text-sm text-zinc-500">خودروهای پشتیبانی‌شده در فیلتر قطعات</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
          <button onClick={openCreate} className="flex h-10 items-center gap-2 rounded-xl bg-[#F58220] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#e0701a]">
            <Plus size={16} />
            خودروی جدید
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="جستجوی برند یا مدل…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={INPUT_CLS}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={INPUT_CLS}>
            <option value="">همه انواع</option>
            <option value="PASSENGER">سواری</option>
            <option value="HEAVY">ماشین‌آلات سنگین</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="max-h-[65vh] overflow-y-auto">
          <table className="w-full text-right text-sm">
            <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-bold">برند</th>
                <th className="px-4 py-3 font-bold">مدل</th>
                <th className="px-4 py-3 font-bold">سال تولید</th>
                <th className="px-4 py-3 font-bold">نوع</th>
                <th className="px-4 py-3 font-bold">قطعات</th>
                <th className="px-4 py-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-400">
                    <Loader2 size={20} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-400">
                    <Car size={28} className="mx-auto mb-2 opacity-50" />
                    خودرویی یافت نشد
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-bold text-zinc-900">{c.brand}</td>
                    <td className="px-4 py-3 text-zinc-700">{c.model}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      {toFa(c.yearFrom)} تا {toFa(c.yearTo)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${c.type === "HEAVY" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                        {c.type === "HEAVY" ? "سنگین" : "سواری"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-zinc-900">{toFa(c.partCount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => del(c)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100">
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">{editing ? "ویرایش خودرو" : "خودروی جدید"}</h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLS}>برند *</label>
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>مدل *</label>
                <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className={INPUT_CLS} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>سال شروع *</label>
                  <input value={form.yearFrom} onChange={(e) => setForm({ ...form, yearFrom: onlyDigits(e.target.value) })} className={INPUT_CLS} dir="ltr" />
                </div>
                <div>
                  <label className={LABEL_CLS}>سال پایان *</label>
                  <input value={form.yearTo} onChange={(e) => setForm({ ...form, yearTo: onlyDigits(e.target.value) })} className={INPUT_CLS} dir="ltr" />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>نوع</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={INPUT_CLS}>
                  <option value="PASSENGER">سواری</option>
                  <option value="HEAVY">ماشین‌آلات سنگین</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                انصراف
              </button>
              <button onClick={save} disabled={saving} className="flex h-10 items-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white hover:bg-[#e0701a] disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                ذخیره
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
