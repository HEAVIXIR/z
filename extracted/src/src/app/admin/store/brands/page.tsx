"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Tag,
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { toFa } from "@/lib/format";

type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string | null;
  partCount: number;
};

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
const LABEL_CLS = "mb-1.5 block text-xs font-bold text-zinc-500";

export default function StoreBrandsPage() {
  const [items, setItems] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", logoUrl: "", country: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/store/brands?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("خطا");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else throw new Error(json.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", logoUrl: "", country: "" });
    setModalOpen(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({ name: b.name, slug: b.slug, logoUrl: b.logoUrl ?? "", country: b.country ?? "" });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.slug) { setToast("نام و اسلاگ الزامی است"); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name,
        slug: form.slug,
        logoUrl: form.logoUrl || null,
        country: form.country || null,
      };
      const url = editing ? `/api/admin/store/brands/${editing.id}` : "/api/admin/store/brands";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setModalOpen(false);
      setToast(editing ? "برند به‌روزرسانی شد" : "برند ایجاد شد");
      await load();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (b: Brand) => {
    if (!confirm(`حذف برند «${b.name}»؟`)) return;
    try {
      const res = await fetch(`/api/admin/store/brands/${b.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setToast("برند حذف شد");
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
          <h1 className="text-2xl font-extrabold text-zinc-900">برندهای قطعات</h1>
          <p className="text-sm text-zinc-500">برندهای تولیدکننده قطعات</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
          <button onClick={openCreate} className="flex h-10 items-center gap-2 rounded-xl bg-[#F58220] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#e0701a]">
            <Plus size={16} />
            برند جدید
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <input
          type="text"
          placeholder="جستجوی نام، اسلاگ یا کشور…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={INPUT_CLS}
        />
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
                <th className="px-4 py-3 font-bold">اسلاگ</th>
                <th className="px-4 py-3 font-bold">کشور</th>
                <th className="px-4 py-3 font-bold">قطعات</th>
                <th className="px-4 py-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-400">
                    <Loader2 size={20} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-400">
                    <Tag size={28} className="mx-auto mb-2 opacity-50" />
                    برندی یافت نشد
                  </td>
                </tr>
              ) : (
                items.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {b.logoUrl ? (
                          <img src={b.logoUrl} alt={b.name} className="h-6 w-6 rounded object-contain" />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-100 text-[10px] font-bold text-zinc-500">
                            {b.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-bold text-zinc-900">{b.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500" dir="ltr">{b.slug}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{b.country ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-bold text-zinc-900">{toFa(b.partCount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(b)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => del(b)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100">
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
              <h2 className="text-lg font-bold text-zinc-900">{editing ? "ویرایش برند" : "برند جدید"}</h2>
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
                <label className={LABEL_CLS}>کشور</label>
                <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>URL لوگو</label>
                <input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} className={INPUT_CLS} dir="ltr" />
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
