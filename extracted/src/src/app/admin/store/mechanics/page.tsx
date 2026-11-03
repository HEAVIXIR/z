"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wrench,
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Phone,
  MapPin,
  Star,
  CheckCircle2,
} from "lucide-react";
import { toFa, timeAgo } from "@/lib/format";

type Mechanic = {
  id: string;
  phone: string;
  name: string;
  family: string;
  shopName: string | null;
  specialty: string | null;
  city: string | null;
  address: string | null;
  rating: string;
  verified: boolean;
  status: string;
  totalOrders: number;
  notes: string | null;
  createdAt: string;
  orderCount: number;
};

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
const LABEL_CLS = "mb-1.5 block text-xs font-bold text-zinc-500";

export default function StoreMechanicsPage() {
  const [items, setItems] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Mechanic | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({
    phone: "",
    name: "",
    family: "",
    shopName: "",
    specialty: "",
    city: "",
    address: "",
    rating: "0",
    verified: false,
    status: "ACTIVE",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (verifiedFilter) params.set("verified", verifiedFilter);
      const res = await fetch(`/api/admin/store/mechanics?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("خطا در بارگذاری");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else throw new Error(json.error || "خطا");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, verifiedFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      phone: "",
      name: "",
      family: "",
      shopName: "",
      specialty: "",
      city: "",
      address: "",
      rating: "0",
      verified: false,
      status: "ACTIVE",
      notes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (m: Mechanic) => {
    setEditing(m);
    setForm({
      phone: m.phone,
      name: m.name,
      family: m.family,
      shopName: m.shopName ?? "",
      specialty: m.specialty ?? "",
      city: m.city ?? "",
      address: m.address ?? "",
      rating: m.rating,
      verified: m.verified,
      status: m.status,
      notes: m.notes ?? "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.phone || !form.name || !form.family) {
      setToast("تلفن، نام و نام خانوادگی الزامی است");
      return;
    }
    setSaving(true);
    try {
      const body = {
        phone: form.phone,
        name: form.name,
        family: form.family,
        shopName: form.shopName || null,
        specialty: form.specialty || null,
        city: form.city || null,
        address: form.address || null,
        rating: Number(form.rating) || 0,
        verified: form.verified,
        status: form.status,
        notes: form.notes || null,
      };
      const url = editing ? `/api/admin/store/mechanics/${editing.id}` : "/api/admin/store/mechanics";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "خطا");
      setModalOpen(false);
      setToast(editing ? "مکانیک به‌روزرسانی شد" : "مکانیک ایجاد شد");
      await load();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (m: Mechanic) => {
    if (!confirm(`حذف مکانیک «${m.name} ${m.family}»؟`)) return;
    try {
      const res = await fetch(`/api/admin/store/mechanics/${m.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "خطا");
      setToast("مکانیک حذف شد");
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
          <h1 className="text-2xl font-extrabold text-zinc-900">مکانیک‌های فروشگاه هویکس</h1>
          <p className="text-sm text-zinc-500">مدیریت تعمیرکاران و مغازه‌داران همکار</p>
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
            مکانیک جدید
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            placeholder="جستجوی نام، تلفن، شهر یا تخصص…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={INPUT_CLS}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={INPUT_CLS}>
            <option value="">همه وضعیت‌ها</option>
            <option value="ACTIVE">فعال</option>
            <option value="BLOCKED">مسدود</option>
          </select>
          <select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)} className={INPUT_CLS}>
            <option value="">همه</option>
            <option value="1">تأییدشده</option>
            <option value="0">تأییدنشده</option>
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
                <th className="px-4 py-3 font-bold">نام / مغازه</th>
                <th className="px-4 py-3 font-bold">تلفن</th>
                <th className="px-4 py-3 font-bold">تخصص / شهر</th>
                <th className="px-4 py-3 font-bold">امتیاز</th>
                <th className="px-4 py-3 font-bold">سفارش‌ها</th>
                <th className="px-4 py-3 font-bold">وضعیت</th>
                <th className="px-4 py-3 font-bold">عضویت</th>
                <th className="px-4 py-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-400">
                    <Loader2 size={20} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-400">
                    <Wrench size={28} className="mx-auto mb-2 opacity-50" />
                    مکانیکی یافت نشد
                  </td>
                </tr>
              ) : (
                items.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                        {m.name} {m.family}
                        {m.verified && <CheckCircle2 size={14} className="text-emerald-500" />}
                      </div>
                      {m.shopName && <div className="text-xs text-zinc-500">{m.shopName}</div>}
                      {m.address && (
                        <div className="mt-1 flex items-start gap-1 text-[11px] text-zinc-400">
                          <MapPin size={10} className="mt-0.5 shrink-0" /> {m.address}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 font-mono text-xs text-zinc-700" dir="ltr">
                        <Phone size={11} /> {m.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      <div>{m.specialty ?? "—"}</div>
                      <div className="text-zinc-400">{m.city ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-amber-600">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        <span className="font-bold">{toFa(Number(m.rating).toFixed(1))}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-zinc-900">{toFa(m.orderCount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${m.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {m.status === "ACTIVE" ? "فعال" : "مسدود"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{timeAgo(m.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(m)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => del(m)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100">
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">
                {editing ? "ویرایش مکانیک" : "مکانیک جدید"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={LABEL_CLS}>نام *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>نام خانوادگی *</label>
                <input value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>تلفن *</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={INPUT_CLS} dir="ltr" />
              </div>
              <div>
                <label className={LABEL_CLS}>نام مغازه</label>
                <input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>تخصص</label>
                <input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>شهر</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={INPUT_CLS} />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL_CLS}>آدرس</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>امتیاز (۰ تا ۵)</label>
                <input value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value.replace(/[^\d.]/g, "") })} className={INPUT_CLS} dir="ltr" />
              </div>
              <div>
                <label className={LABEL_CLS}>وضعیت</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={INPUT_CLS}>
                  <option value="ACTIVE">فعال</option>
                  <option value="BLOCKED">مسدود</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} className="h-4 w-4 accent-[#F58220]" />
                  تأییدشده (تیک آبی)
                </label>
              </div>
              <div className="md:col-span-2">
                <label className={LABEL_CLS}>یادداشت</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
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
