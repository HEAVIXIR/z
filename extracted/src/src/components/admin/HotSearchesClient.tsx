"use client";

import { useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Flame,
  Eye,
  EyeOff,
} from "lucide-react";
import { toFa, faDate } from "@/lib/format";

type HotSearch = {
  id: string;
  term: string;
  link: string;
  count: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
};

export default function HotSearchesClient({
  hotSearches,
}: {
  hotSearches: HotSearch[];
}) {
  const [list, setList] = useState<HotSearch[]>(hotSearches);
  const [editing, setEditing] = useState<HotSearch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newItem = (): HotSearch => ({
    id: `new-${Date.now()}`,
    term: "",
    link: "",
    count: 0,
    active: true,
    sortOrder: list.length,
    createdAt: new Date().toISOString(),
  });

  const save = async (h: HotSearch) => {
    setLoading(true);
    setError(null);
    try {
      const isNew = h.id.startsWith("new-");
      const res = await fetch(
        isNew ? "/api/admin/hot-searches" : `/api/admin/hot-searches/${h.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            term: h.term,
            link: h.link || undefined,
            count: h.count,
            active: h.active,
            sortOrder: h.sortOrder,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "ذخیره ناموفق بود.");
      }
      const saved = await res.json();
      if (isNew) {
        setList([{ ...h, ...saved }, ...list]);
      } else {
        setList(list.map((x) => (x.id === h.id ? { ...h, ...saved } : x)));
      }
      setEditing(null);
    } catch (e: any) {
      setError(e?.message ?? "خطا.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف شود؟")) return;
    try {
      await fetch(`/api/admin/hot-searches/${id}`, { method: "DELETE" });
      setList(list.filter((x) => x.id !== id));
    } catch {
      setError("حذف ناموفق بود.");
    }
  };

  const toggleActive = async (h: HotSearch) => {
    try {
      await fetch(`/api/admin/hot-searches/${h.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !h.active }),
      });
      setList(list.map((x) => (x.id === h.id ? { ...x, active: !x.active } : x)));
    } catch {
      setError("عملیات ناموفق بود.");
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setEditing(newItem())}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
        >
          <Plus className="h-4 w-4" />
          کلیدواژهٔ جدید
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-right font-bold">کلیدواژه</th>
              <th className="px-4 py-3 text-right font-bold">لینک</th>
              <th className="px-4 py-3 text-right font-bold">تعداد</th>
              <th className="px-4 py-3 text-right font-bold">ترتیب</th>
              <th className="px-4 py-3 text-right font-bold">وضعیت</th>
              <th className="px-4 py-3 text-right font-bold">تاریخ</th>
              <th className="px-4 py-3 text-center font-bold">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {list.map((h) => (
              <tr key={h.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 shrink-0 text-[#F58220]" />
                    <span className="font-bold text-zinc-900">{h.term}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={h.link || "#"}
                    className="truncate text-xs text-blue-600 hover:underline"
                    dir="ltr"
                  >
                    {h.link || "—"}
                  </a>
                </td>
                <td className="px-4 py-3 text-zinc-700">{toFa(h.count)}</td>
                <td className="px-4 py-3 text-zinc-500">{toFa(h.sortOrder)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(h)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                      h.active
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    }`}
                  >
                    {h.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {h.active ? "فعال" : "غیرفعال"}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {faDate(h.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(h)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-[#F58220] hover:text-[#F58220]"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(h.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                  کلیدواژه‌ای ثبت نشده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <HotSearchModal
          item={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          loading={loading}
        />
      )}
    </div>
  );
}

function HotSearchModal({
  item,
  onClose,
  onSave,
  loading,
}: {
  item: HotSearch;
  onClose: () => void;
  onSave: (h: HotSearch) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<HotSearch>(item);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-zinc-900">
            {item.id.startsWith("new-") ? "کلیدواژهٔ جدید" : "ویرایش کلیدواژه"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-zinc-700">
              کلیدواژه
            </label>
            <input
              type="text"
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value })}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              placeholder="مثلاً بیل مکانیکی کوماتسو"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-zinc-700">لینک</label>
            <input
              type="text"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              dir="ltr"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              placeholder="/listings?q=..."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">تعداد</label>
              <input
                type="number"
                value={form.count}
                onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">ترتیب</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                فعال
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-bold text-zinc-600 transition hover:bg-zinc-100"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={loading || !form.term.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}
