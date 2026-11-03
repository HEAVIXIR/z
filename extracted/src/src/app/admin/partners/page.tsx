"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Globe,
  MapPin,
  Trash2,
  Pencil,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /admin/partners — Partner directory management.
   Light theme admin page.
   ============================================================ */

type Partner = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  verified: boolean;
  active: boolean;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  DEALER: "نمایندگی",
  IMPORTER: "واردکننده",
  MANUFACTURER: "سازنده",
  REPAIR: "تعمیرکار",
  TRANSPORT: "حمل‌ونقل",
};

const TYPE_COLORS: Record<string, string> = {
  DEALER: "bg-[#F58220]/10 text-[#F58220]",
  IMPORTER: "bg-blue-100 text-blue-700",
  MANUFACTURER: "bg-violet-100 text-violet-700",
  REPAIR: "bg-amber-100 text-amber-700",
  TRANSPORT: "bg-teal-100 text-teal-700",
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "DEALER",
    phone: "",
    email: "",
    website: "",
    city: "",
    verified: false,
    active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/partners");
      const json = await res.json();
      setPartners(json.partners || []);
      setStats(json.stats);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const resetForm = () => {
    setForm({
      name: "",
      type: "DEALER",
      phone: "",
      email: "",
      website: "",
      city: "",
      verified: false,
      active: true,
    });
    setEditId(null);
    setShowForm(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast("نام شریک الزامی است");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: editId }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast(editId ? "شریک به‌روزرسانی شد ✓" : "شریک ثبت شد ✓");
        resetForm();
        await load();
      } else {
        showToast(json.error ?? "خطا در ثبت");
      }
    } catch {
      showToast("خطا در ارتباط با سرور");
    }
    setSaving(false);
  };

  const edit = (p: Partner) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      type: p.type,
      phone: p.phone ?? "",
      email: p.email ?? "",
      website: p.website ?? "",
      city: p.city ?? "",
      verified: p.verified,
      active: p.active,
    });
    setShowForm(true);
  };

  const del = async (id: string) => {
    if (!confirm("آیا از حذف این شریک مطمئن هستید؟")) return;
    try {
      await fetch(`/api/admin/partners?id=${id}`, { method: "DELETE" });
      showToast("شریک حذف شد");
      await load();
    } catch {
      showToast("خطا در حذف");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Building2 className="h-6 w-6 text-[#F58220]" />
            شبکهٔ شرکا
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            دایرکتوری نمایندگی‌ها، واردکنندگان، سازندگان، تعمیرکاران و حمل‌ونقل
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            به‌روزرسانی
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2 text-xs font-bold text-white hover:bg-[#ff8c38]"
          >
            <Plus className="h-4 w-4" />
            شریک جدید
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <StatCard label="کل" value={stats.total} />
          <StatCard label="تأییدشده" value={stats.verified} tone="emerald" />
          <StatCard label="فعال" value={stats.active} tone="blue" />
          {stats.byType?.map((b: any) => (
            <StatCard key={b.type} label={TYPE_LABELS[b.type] ?? b.type} value={b.count} />
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-black text-zinc-900">
            {editId ? "ویرایش شریک" : "افزودن شریک جدید"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="نام شریک *">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </Field>
            <Field label="نوع">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="تلفن">
              <input
                type="tel"
                dir="ltr"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </Field>
            <Field label="ایمیل">
              <input
                type="email"
                dir="ltr"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </Field>
            <Field label="وب‌سایت">
              <input
                type="url"
                dir="ltr"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </Field>
            <Field label="شهر">
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.verified}
                onChange={(e) => setForm({ ...form, verified: e.target.checked })}
                className="h-4 w-4 accent-[#F58220]"
              />
              تأییدشده
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 accent-[#F58220]"
              />
              فعال
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-xs font-bold text-white hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {editId ? "ذخیره تغییرات" : "ثبت شریک"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : partners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Building2 className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            هنوز شریکی ثبت نشده. روی «شریک جدید» بزنید.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-black text-zinc-900">
                    {p.name}
                  </h3>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      TYPE_COLORS[p.type] ?? "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {TYPE_LABELS[p.type] ?? p.type}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {p.verified ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-zinc-300" />
                  )}
                </div>
              </div>
              <div className="space-y-1.5 text-[11px] text-zinc-600">
                {p.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-zinc-400" />
                    <span dir="ltr">{p.phone}</span>
                  </p>
                )}
                {p.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-zinc-400" />
                    <span dir="ltr" className="truncate">{p.email}</span>
                  </p>
                )}
                {p.website && (
                  <p className="flex items-center gap-2">
                    <Globe className="h-3 w-3 text-zinc-400" />
                    <span dir="ltr" className="truncate">{p.website}</span>
                  </p>
                )}
                {p.city && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-zinc-400" />
                    {p.city}
                  </p>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    p.active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {p.active ? "فعال" : "غیرفعال"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => edit(p)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-[#F58220]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => del(p.id)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "emerald" | "blue";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    emerald: "text-emerald-600",
    blue: "text-blue-600",
  };
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
      <p className={`text-xl font-black ${tones[tone]}`}>{toFa(value)}</p>
      <p className="mt-0.5 text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}
