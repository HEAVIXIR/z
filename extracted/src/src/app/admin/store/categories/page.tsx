"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderTree,
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { toFa } from "@/lib/format";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  partCount: number;
  childCount: number;
};

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
const LABEL_CLS = "mb-1.5 block text-xs font-bold text-zinc-500";

export default function StoreCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", icon: "", parentId: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/store/categories?limit=200", { cache: "no-store" });
      if (!res.ok) throw new Error("خطا");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else throw new Error(json.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", icon: "", parentId: "" });
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, icon: c.icon ?? "", parentId: c.parentId ?? "" });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.slug) { setToast("نام و اسلاگ الزامی است"); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name,
        slug: form.slug,
        icon: form.icon || null,
        parentId: form.parentId || null,
      };
      const url = editing ? `/api/admin/store/categories/${editing.id}` : "/api/admin/store/categories";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setModalOpen(false);
      setToast(editing ? "دسته به‌روزرسانی شد" : "دسته ایجاد شد");
      await load();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (c: Category) => {
    if (!confirm(`حذف دسته «${c.name}»؟ قطعات مرتبط ممکن است تأثر بپذیرند.`)) return;
    try {
      const res = await fetch(`/api/admin/store/categories/${c.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setToast("دسته حذف شد");
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
          <h1 className="text-2xl font-extrabold text-zinc-900">دسته‌بندی قطعات</h1>
          <p className="text-sm text-zinc-500">دسته‌بندی قطعات خودرو و ماشین‌آلات</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
          <button onClick={openCreate} className="flex h-10 items-center gap-2 rounded-xl bg-[#F58220] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#e0701a]">
            <Plus size={16} />
            دستهٔ جدید
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-10 text-center"><Loader2 className="mx-auto animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="col-span-full rounded-xl border border-zinc-200 bg-white py-10 text-center text-zinc-400">
            <FolderTree size={28} className="mx-auto mb-2 opacity-50" />
            دسته‌ای یافت نشد
          </div>
        ) : (
          items.map((c) => (
            <div key={c.id} className="group rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {c.icon && <span className="text-xl">{c.icon}</span>}
                  <div>
                    <div className="font-bold text-zinc-900">{c.name}</div>
                    <div className="font-mono text-[11px] text-zinc-400" dir="ltr">{c.slug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => openEdit(c)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => del(c)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
                <span>{toFa(c.partCount)} قطعه</span>
                <span>{toFa(c.childCount)} زیردسته</span>
                {c.parent && <span className="text-zinc-400">↳ {c.parent.name}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">{editing ? "ویرایش دسته" : "دستهٔ جدید"}</h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLS}>نام *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>اسلاگ (انگلیسی) *</label>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={INPUT_CLS} dir="ltr" />
              </div>
              <div>
                <label className={LABEL_CLS}>آیکون (emoji)</label>
                <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>دستهٔ والد</label>
                <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className={INPUT_CLS}>
                  <option value="">— بدون والد —</option>
                  {items.filter((c) => c.id !== editing?.id).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
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
