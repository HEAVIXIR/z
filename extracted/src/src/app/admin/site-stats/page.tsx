"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  X,
  Save,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Hash,
} from "lucide-react";
import { toFa } from "@/lib/format";
import { METRIC_OPTIONS } from "@/lib/site-stats-metrics";

type SiteStat = {
  id: string;
  key: string;
  labelFa: string;
  labelEn?: string | null;
  metric: string;
  customValue?: string | null;
  icon?: string | null;
  sortOrder: number;
  active: boolean;
  /** Live value formatted with toFa() (or customValue as-is). */
  value: string;
};

const METRIC_LABELS: Record<string, string> = Object.fromEntries(
  METRIC_OPTIONS.map((m) => [m.value, m.label]),
);

export default function AdminSiteStatsPage() {
  const [items, setItems] = useState<SiteStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SiteStat | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-stats");
      const json = await res.json();
      if (json.success) setItems(json.stats || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (item: SiteStat) => {
    setWorking(true);
    try {
      await fetch("/api/admin/site-stats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, active: !item.active }),
      });
      await load();
    } finally {
      setWorking(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف این آمار؟")) return;
    setWorking(true);
    try {
      await fetch(`/api/admin/site-stats?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await load();
    } finally {
      setWorking(false);
    }
  };

  const move = async (idx: number, dir: "up" | "down") => {
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= items.length) return;
    const a = items[idx];
    const b = items[target];
    setWorking(true);
    try {
      // Swap sortOrder values between the two items.
      await Promise.all([
        fetch("/api/admin/site-stats", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: a.id, sortOrder: b.sortOrder }),
        }),
        fetch("/api/admin/site-stats", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: b.id, sortOrder: a.sortOrder }),
        }),
      ]);
      await load();
    } finally {
      setWorking(false);
    }
  };

  const openNew = () => {
    setEditing({
      id: "",
      key: "",
      labelFa: "",
      labelEn: "",
      metric: "categories",
      customValue: "",
      icon: "",
      sortOrder: items.length,
      active: true,
      value: "—",
    });
    setShowModal(true);
  };

  const openEdit = (item: SiteStat) => {
    setEditing(item);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <BarChart3 className="h-6 w-6 text-[#F58220]" />
            آمار سایت
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {toFa(items.length)} آمار پیکربندی‌شده — ۴ مورد اول در پنل هیرو و
            همهٔ موارد فعال در بخش آمار صفحه اصلی نمایش داده می‌شوند.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
        >
          <Plus className="h-4 w-4" />
          آمار جدید
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">
        <strong className="font-bold">راهنما:</strong> هر آمار یک «معیار»
        (metric) دارد که مقدار زنده را از دیتابیس محاسبه می‌کند. برای مقدار
        ثابت (مثل «+۱۰ سال تجربه») معیار را روی <span dir="ltr">custom_value</span>{" "}
        بگذارید و مقدار دلخواه را وارد کنید. ترتیب نمایش باsortOrder کنترل
        می‌شود — ۴ مورد اول در پنل هیرو نشان داده می‌شوند.
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            هنوز آماری پیکربندی نشده. روی «آمار جدید» بزنید یا اسکریپت{" "}
            <code dir="ltr" className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
              bun run db:seed-site-stats
            </code>{" "}
            را اجرا کنید.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-3 text-center w-16">ترتیب</th>
                  <th className="px-4 py-3 text-right font-bold">برچسب</th>
                  <th className="px-4 py-3 text-right font-bold">کلید</th>
                  <th className="px-4 py-3 text-right font-bold">معیار</th>
                  <th className="px-4 py-3 text-center font-bold">
                    مقدار زنده
                  </th>
                  <th className="px-4 py-3 text-center font-bold">وضعیت</th>
                  <th className="px-4 py-3 text-center font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`transition hover:bg-zinc-50 ${!item.active ? "opacity-50" : ""}`}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => move(idx, "up")}
                          disabled={working || idx === 0}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-[#F58220]/10 hover:text-[#F58220] disabled:opacity-30"
                          title="بالا"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => move(idx, "down")}
                          disabled={working || idx === items.length - 1}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-[#F58220]/10 hover:text-[#F58220] disabled:opacity-30"
                          title="پایین"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <span className="mr-1 text-xs font-bold text-zinc-400">
                          {toFa(idx + 1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-800">
                        {item.labelFa}
                      </div>
                      {item.labelEn && (
                        <div
                          className="text-[11px] text-zinc-400"
                          dir="ltr"
                        >
                          {item.labelEn}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code
                        dir="ltr"
                        className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600"
                      >
                        {item.key}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {METRIC_LABELS[item.metric] ?? item.metric}
                      {item.metric === "custom_value" && item.customValue && (
                        <div
                          className="text-[11px] text-zinc-400"
                          dir="ltr"
                        >
                          «{item.customValue}»
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#F58220]/5 px-2.5 py-1 text-base font-black text-[#F58220]">
                        <Hash className="h-3 w-3" />
                        {item.value}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(item)}
                        disabled={working}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${
                          item.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-100 text-zinc-400"
                        }`}
                      >
                        {item.active ? (
                          <>
                            <Eye className="h-3 w-3" /> فعال
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" /> غیرفعال
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-[#F58220]/10 hover:text-[#F58220]"
                          title="ویرایش"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => remove(item.id)}
                          disabled={working}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && editing && (
        <EditModal
          item={editing}
          isNew={!editing.id}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditModal({
  item,
  isNew,
  onClose,
  onSaved,
}: {
  item: SiteStat;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({ ...item });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!String(form.key ?? "").trim()) {
      setError("کلید (key) الزامی است");
      return;
    }
    if (!String(form.labelFa ?? "").trim()) {
      setError("برچسب فارسی الزامی است");
      return;
    }
    if (form.metric === "custom_value" && !String(form.customValue ?? "").trim()) {
      setError("برای معیار custom_value یک مقدار ثابت وارد کنید");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        key: String(form.key).trim(),
        labelFa: String(form.labelFa).trim(),
        labelEn: form.labelEn ? String(form.labelEn).trim() : null,
        metric: form.metric,
        customValue:
          form.metric === "custom_value"
            ? String(form.customValue).trim()
            : form.customValue || null,
        icon: form.icon ? String(form.icon).trim() : null,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active !== false,
      };

      const res = isNew
        ? await fetch("/api/admin/site-stats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/site-stats", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: form.id, ...payload }),
          });
      const json = await res.json();
      if (json.success || json.ok) onSaved();
      else setError(json.error ?? "خطا");
    } catch {
      setError("خطای شبکه");
    }
    setSaving(false);
  };

  const inputCls =
    "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-lg font-black text-zinc-900">
            {isNew ? "آمار جدید" : "ویرایش آمار"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
              ⚠ {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>کلید (key) *</label>
              <input
                value={form.key || ""}
                onChange={(e) => set("key", e.target.value)}
                className={inputCls}
                dir="ltr"
                placeholder="categories"
                disabled={!isNew}
              />
              {!isNew && (
                <p className="mt-1 text-[10px] text-zinc-400">
                  کلید پس از ساخت قابل تغییر نیست.
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>آیکون (Lucide)</label>
              <input
                value={form.icon || ""}
                onChange={(e) => set("icon", e.target.value)}
                className={inputCls}
                dir="ltr"
                placeholder="FolderTree"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>برچسب فارسی *</label>
              <input
                value={form.labelFa || ""}
                onChange={(e) => set("labelFa", e.target.value)}
                className={inputCls}
                placeholder="دسته‌بندی اصلی"
              />
            </div>
            <div>
              <label className={labelCls}>برچسب انگلیسی</label>
              <input
                value={form.labelEn || ""}
                onChange={(e) => set("labelEn", e.target.value)}
                className={inputCls}
                dir="ltr"
                placeholder="Categories"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>معیار (metric) *</label>
            <select
              value={form.metric || "categories"}
              onChange={(e) => set("metric", e.target.value)}
              className={inputCls}
            >
              {METRIC_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.value})
                </option>
              ))}
            </select>
          </div>

          {form.metric === "custom_value" && (
            <div>
              <label className={labelCls}>مقدار ثابت *</label>
              <input
                value={form.customValue || ""}
                onChange={(e) => set("customValue", e.target.value)}
                className={inputCls}
                placeholder="مثلاً: +۱۰ سال تجربه"
              />
              <p className="mt-1 text-[10px] text-zinc-400">
                این مقدار مستقیماً نمایش داده می‌شود (ارقام به فارسی تبدیل
                می‌شوند).
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>ترتیب (sortOrder)</label>
              <input
                type="number"
                value={form.sortOrder ?? 0}
                onChange={(e) => set("sortOrder", e.target.value)}
                className={inputCls}
                dir="ltr"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-zinc-600">
                <input
                  type="checkbox"
                  checked={form.active !== false}
                  onChange={(e) => set("active", e.target.checked)}
                  className="h-4 w-4 accent-[#F58220]"
                />
                فعال
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50"
          >
            انصراف
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}
