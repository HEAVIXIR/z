"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toFa } from "@/lib/format";
import {
  Factory,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  Plus,
  FolderTree,
} from "lucide-react";

export interface ApplicationIndustry {
  id: string;
  key: string;
  nameFa: string;
  nameEn: string | null;
  icon: string | null;
  active: boolean;
  sortOrder: number;
  categoryCount: number;
}

interface Props {
  initial: ApplicationIndustry[];
}

export default function ApplicationIndustriesManager({ initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ApplicationIndustry[]>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    key: "",
    nameFa: "",
    nameEn: "",
    icon: "",
    active: true,
    sortOrder: 0,
  });
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.key || !form.nameFa) {
      setErr("key و nameFa الزامی است.");
      return;
    }
    setErr(null);
    setSubmitting(true);
    fetch("/api/application-industries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "خطا در ایجاد");
        const created: ApplicationIndustry = {
          ...j.industry,
          categoryCount: 0,
        };
        setItems((prev) =>
          [...prev, created].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.nameFa.localeCompare(b.nameFa),
          ),
        );
        setForm({ key: "", nameFa: "", nameEn: "", icon: "", active: true, sortOrder: 0 });
        router.refresh();
      })
      .catch((e) => setErr(e.message))
      .finally(() => setSubmitting(false));
  }

  function toggle(t: ApplicationIndustry) {
    setBusyId(t.id);
    fetch(`/api/application-industries/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !t.active }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "خطا");
        setItems((prev) =>
          prev.map((x) => (x.id === t.id ? { ...x, active: j.industry.active } : x)),
        );
        router.refresh();
      })
      .catch((e) => setErr(e.message))
      .finally(() => setBusyId(null));
  }

  function remove(t: ApplicationIndustry) {
    if (t.categoryCount > 0) {
      alert(`این صنعت به ${t.categoryCount} دسته متصل است — ابتدا اتصالات را حذف کنید.`);
      return;
    }
    if (!confirm(`حذف «${t.nameFa}»؟`)) return;
    setBusyId(t.id);
    fetch(`/api/application-industries/${t.id}`, { method: "DELETE" })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? "خطا در حذف");
        }
        setItems((prev) => prev.filter((x) => x.id !== t.id));
        router.refresh();
      })
      .catch((e) => setErr(e.message))
      .finally(() => setBusyId(null));
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create form */}
        <form
          onSubmit={submit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-lg font-bold text-zinc-900">صنعت کاربرد جدید</h2>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-600">کلید (Key)</label>
              <input
                dir="ltr"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
                placeholder="MINING / ROAD_CONSTRUCTION / …"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-mono outline-none focus:border-[#F58220] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-600">نام فارسی</label>
              <input
                value={form.nameFa}
                onChange={(e) => setForm({ ...form, nameFa: e.target.value })}
                placeholder="معادن"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-600">نام انگلیسی</label>
              <input
                dir="ltr"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                placeholder="Mining"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-600">آیکون</label>
                <input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="⛏️"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-600">ترتیب</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300 text-[#F58220] focus:ring-[#F58220]"
              />
              فعال
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              ایجاد
            </button>
          </div>
        </form>

        {/* Table */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 text-right font-bold">کلید</th>
                    <th className="px-4 py-3 text-right font-bold">نام فارسی</th>
                    <th className="px-4 py-3 text-right font-bold">نام انگلیسی</th>
                    <th className="px-4 py-3 text-center font-bold">دسته‌های متصل</th>
                    <th className="px-4 py-3 text-center font-bold">ترتیب</th>
                    <th className="px-4 py-3 text-center font-bold">فعال</th>
                    <th className="px-4 py-3 text-center font-bold">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {items.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <span
                          dir="ltr"
                          className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-700"
                        >
                          {t.icon ?? ""} {t.key}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-900">{t.nameFa}</td>
                      <td className="px-4 py-3 text-zinc-500" dir="ltr">
                        {t.nameEn ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                            t.categoryCount > 0
                              ? "bg-orange-100 text-orange-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          <FolderTree className="h-3 w-3" />
                          {toFa(t.categoryCount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-600">
                        {toFa(t.sortOrder)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggle(t)}
                          disabled={busyId === t.id}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold transition disabled:opacity-60"
                          style={{
                            background: t.active ? "#dcfce7" : "#f4f4f5",
                            color: t.active ? "#047857" : "#71717a",
                          }}
                        >
                          {busyId === t.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : t.active ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          {t.active ? "فعال" : "غیرفعال"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => remove(t)}
                          disabled={busyId === t.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-red-500 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                        صنعت کاربردی ثبت نشده.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
