"use client";

import { useState } from "react";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { toFa } from "@/lib/format";

type MenuItem = {
  id: string;
  title: string;
  href: string;
  icon?: string;
  order: number;
  parentId?: string;
  openInNew: boolean;
  active: boolean;
};

export default function MenuEditorClient({
  initialItems,
}: {
  initialItems: MenuItem[];
}) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const add = () => {
    setItems([
      ...items,
      {
        id: `new-${Date.now()}`,
        title: "آیتم جدید",
        href: "/",
        icon: "",
        order: items.length,
        parentId: "",
        openInNew: false,
        active: true,
      },
    ]);
  };

  const update = (id: string, patch: Partial<MenuItem>) => {
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const remove = (id: string) => {
    setItems((arr) => arr.filter((i) => i.id !== id));
  };

  const move = (id: string, dir: -1 | 1) => {
    setItems((arr) => {
      const idx = arr.findIndex((i) => i.id === id);
      if (idx < 0) return arr;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      const next = [...arr];
      const [item] = next.splice(idx, 1);
      next.splice(newIdx, 0, item);
      return next.map((s, i) => ({ ...s, order: i }));
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i, idx) => ({
            id: i.id.startsWith("new-") ? undefined : i.id,
            title: i.title,
            href: i.href,
            icon: i.icon || undefined,
            order: idx,
            parentId: i.parentId || undefined,
            openInNew: i.openInNew,
            active: i.active,
          })),
        }),
      });
      if (!res.ok) throw new Error("ذخیره ناموفق بود.");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: any) {
      setError(e?.message ?? "خطا در ذخیره.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">مدیریت منو</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {toFa(items.length)} آیتم منو
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={add}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-bold text-zinc-700 transition hover:border-[#F58220] hover:text-[#F58220]"
          >
            <Plus className="h-4 w-4" />
            آیتم جدید
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
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

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          منو با موفقیت ذخیره شد.
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3 ${
              item.active ? "border-zinc-200" : "border-zinc-200 opacity-60"
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-black text-zinc-500">
              {toFa(idx + 1)}
            </div>
            <input
              type="text"
              value={item.icon ?? ""}
              onChange={(e) => update(item.id, { icon: e.target.value })}
              placeholder="آیکن"
              className="h-10 w-14 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-center text-sm outline-none focus:border-[#F58220]"
            />
            <input
              type="text"
              value={item.title}
              onChange={(e) => update(item.id, { title: e.target.value })}
              placeholder="عنوان"
              className="h-10 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
            />
            <input
              type="text"
              value={item.href}
              onChange={(e) => update(item.id, { href: e.target.value })}
              placeholder="/link"
              dir="ltr"
              className="h-10 w-40 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
            />
            <select
              value={item.parentId ?? ""}
              onChange={(e) => update(item.id, { parentId: e.target.value })}
              className="h-10 w-32 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-xs text-zinc-900 outline-none focus:border-[#F58220]"
            >
              <option value="">— بدون والد —</option>
              {items
                .filter((i) => i.id !== item.id)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => update(item.id, { openInNew: !item.openInNew })}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                item.openInNew
                  ? "bg-[#F58220]/10 text-[#F58220]"
                  : "bg-zinc-100 text-zinc-400"
              }`}
              title="باز شدن در تب جدید"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => update(item.id, { active: !item.active })}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                item.active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-zinc-100 text-zinc-400"
              }`}
              title="فعال/غیرفعال"
            >
              {item.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => move(item.id, -1)}
                disabled={idx === 0}
                className="flex h-5 w-7 items-center justify-center rounded bg-zinc-100 text-zinc-500 transition hover:bg-[#F58220]/10 hover:text-[#F58220] disabled:opacity-30"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => move(item.id, 1)}
                disabled={idx === items.length - 1}
                className="flex h-5 w-7 items-center justify-center rounded bg-zinc-100 text-zinc-500 transition hover:bg-[#F58220]/10 hover:text-[#F58220] disabled:opacity-30"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 transition hover:bg-red-200"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
            <p className="text-sm text-zinc-500">آیتم منویی ثبت نشده است.</p>
          </div>
        )}
      </div>
    </div>
  );
}
