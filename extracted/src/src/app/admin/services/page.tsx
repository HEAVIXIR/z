"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wrench,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  X,
  Save,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Star,
} from "lucide-react";
import { toFa } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

/* ============================================================
   /admin/services — admin CRUD for the homepage Services
   section. FIX-SERVICES-KNOWLEDGE-CATS-BRANDS (Part 3).
   List + create/edit/delete + reorder + toggle active/featured.
   ============================================================ */

type Service = {
  id: string;
  key: string;
  nameFa: string;
  nameEn: string | null;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  sortOrder: number;
  active: boolean;
  featured: boolean;
};

export default function AdminServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Service | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [working, setWorking] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/services", { cache: "no-store" });
      const json = await res.json();
      setItems(Array.isArray(json?.services) ? json.services : []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (s: Service, field: "active" | "featured") => {
    setWorking(true);
    try {
      await fetch("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, [field]: !s[field] }),
      });
      await load();
    } finally {
      setWorking(false);
    }
  };

  const remove = async (s: Service) => {
    if (!confirm(`حذف «${s.nameFa}»؟`)) return;
    setWorking(true);
    try {
      await fetch(`/api/admin/services/${s.id}`, { method: "DELETE" });
      toast({ title: "خدمت حذف شد" });
      await load();
    } finally {
      setWorking(false);
    }
  };

  const reorder = async (s: Service, dir: -1 | 1) => {
    const idx = items.findIndex((x) => x.id === s.id);
    const swapWith = items[idx + dir];
    if (!swapWith) return;
    setWorking(true);
    try {
      // Swap sortOrder between the two
      await Promise.all([
        fetch("/api/admin/services", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: s.id, sortOrder: swapWith.sortOrder }),
        }),
        fetch("/api/admin/services", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: swapWith.id, sortOrder: s.sortOrder }),
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
      nameFa: "",
      nameEn: "",
      description: "",
      icon: "⚙️",
      imageUrl: "",
      sortOrder: items.length + 1,
      active: true,
      featured: false,
    });
    setShowModal(true);
  };

  const openEdit = (s: Service) => {
    setEditing({ ...s });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Wrench className="h-6 w-6 text-[#F58220]" />
            خدمات هویکس
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            مدیریت خدمات نمایش‌داده‌شده در صفحه اصلی — {toFa(items.length)} خدمت
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
        >
          <Plus className="h-4 w-4" />
          خدمت جدید
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">
        💡 خدمت‌ها به ترتیب «sortOrder» در صفحه اصلی نمایش داده می‌شوند. برای
        جابه‌جایی از فلش‌های بالا/پایین استفاده کنید. فقط خدمت‌های «فعال» در
        سایت نمایش داده می‌شوند.
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Wrench className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">هنوز خدمتی ثبت نشده.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-3 text-center font-bold w-20">ترتیب</th>
                  <th className="px-4 py-3 text-right font-bold">خدمت</th>
                  <th className="px-4 py-3 text-right font-bold">کلید</th>
                  <th className="px-4 py-3 text-center font-bold">ویژه</th>
                  <th className="px-4 py-3 text-center font-bold">فعال</th>
                  <th className="px-4 py-3 text-center font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((s, idx) => (
                  <tr key={s.id} className="transition hover:bg-zinc-50">
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => reorder(s, -1)}
                          disabled={working || idx === 0}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-[#F58220] hover:text-[#F58220] disabled:opacity-30"
                          title="بالا"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-zinc-400">
                          {toFa(idx + 1)}
                        </span>
                        <button
                          onClick={() => reorder(s, 1)}
                          disabled={working || idx === items.length - 1}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-[#F58220] hover:text-[#F58220] disabled:opacity-30"
                          title="پایین"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 text-lg">
                          {s.imageUrl ? (
                            <img
                              src={s.imageUrl}
                              alt={s.nameFa}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{s.icon ?? "⚙️"}</span>
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-zinc-800">
                            {s.nameFa}
                          </p>
                          {s.description && (
                            <p className="line-clamp-1 text-[11px] text-zinc-400">
                              {s.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code
                        className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600"
                        dir="ltr"
                      >
                        {s.key}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggle(s, "featured")}
                        disabled={working}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-amber-50"
                        title={s.featured ? "حذف از ویژه" : "افزودن به ویژه"}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            s.featured
                              ? "fill-amber-500 text-amber-500"
                              : "text-zinc-300"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggle(s, "active")}
                        disabled={working}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-zinc-100"
                        title={s.active ? "غیرفعال کردن" : "فعال کردن"}
                      >
                        {s.active ? (
                          <Eye className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-zinc-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-[#F58220]/10 hover:text-[#F58220]"
                          title="ویرایش"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => remove(s)}
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
        <ServiceModal
          service={editing}
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

/* ──────────────────────────────────────────────────────────── */

function ServiceModal({
  service,
  isNew,
  onClose,
  onSaved,
}: {
  service: Service;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Service>({ ...service });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Service, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.nameFa.trim()) {
      setError("نام فارسی خدمت الزامی است.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = isNew
        ? "/api/admin/services"
        : "/api/admin/services";
      const method = isNew ? "POST" : "PATCH";
      const body: any = {
        nameFa: form.nameFa,
        nameEn: form.nameEn || null,
        description: form.description || null,
        icon: form.icon || null,
        imageUrl: form.imageUrl || null,
        sortOrder: Number(form.sortOrder) || 0,
        active: !!form.active,
        featured: !!form.featured,
      };
      if (isNew) body.key = form.key;
      else body.id = form.id;
      if (form.key) body.key = form.key;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "ذخیره ناموفق بود.");
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message ?? "خطای شبکه");
    } finally {
      setSaving(false);
    }
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
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <h2 className="text-lg font-black text-zinc-900">
            {isNew ? "خدمت جدید" : "ویرایش خدمت"}
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
          <div>
            <label className={labelCls}>نام فارسی *</label>
            <input
              value={form.nameFa}
              onChange={(e) => set("nameFa", e.target.value)}
              className={inputCls}
              placeholder="مثلاً کارشناسی فنی"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>نام انگلیسی</label>
              <input
                value={form.nameEn ?? ""}
                onChange={(e) => set("nameEn", e.target.value)}
                className={inputCls}
                dir="ltr"
                placeholder="Technical Inspection"
              />
            </div>
            <div>
              <label className={labelCls}>کلید (slug)</label>
              <input
                value={form.key}
                onChange={(e) => set("key", e.target.value)}
                className={inputCls}
                dir="ltr"
                placeholder="auto from name"
                disabled={!isNew && false}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>آیکون (اموجی)</label>
              <input
                value={form.icon ?? ""}
                onChange={(e) => set("icon", e.target.value)}
                className={inputCls}
                placeholder="⚙️"
              />
            </div>
            <div>
              <label className={labelCls}>ترتیب</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value))}
                className={inputCls}
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>URL تصویر (اختیاری)</label>
            <input
              value={form.imageUrl ?? ""}
              onChange={(e) => set("imageUrl", e.target.value)}
              className={inputCls}
              dir="ltr"
              placeholder="/uploads/..."
            />
            {form.imageUrl && (
              <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200">
                <img
                  src={form.imageUrl}
                  alt=""
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>توضیحات</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
              placeholder="توضیح کوتاه خدمت..."
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-bold text-zinc-600">
              <input
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => set("active", e.target.checked)}
                className="h-4 w-4 accent-[#F58220]"
              />
              فعال
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-zinc-600">
              <input
                type="checkbox"
                checked={!!form.featured}
                onChange={(e) => set("featured", e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              ویژه
            </label>
          </div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4">
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
