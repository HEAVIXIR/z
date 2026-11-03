"use client";
import { useState, useEffect, useCallback } from "react";
import { Menu as MenuIcon, Plus, Loader2, Trash2, Pencil, X, Save, ArrowUp, ArrowDown } from "lucide-react";
import { toFa } from "@/lib/format";

type MenuItem = {
  id: string;
  title: string;
  href: string | null;
  icon: string | null;
  order: number;
  parentId: string | null;
  openInNew: boolean;
  active: boolean;
};

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menu");
      const json = await res.json();
      // API returns { items: [...] } (NOT { success, data }). Read items directly.
      if (Array.isArray(json.items)) setItems(json.items);
      else if (Array.isArray(json.data)) setItems(json.data);
      else setItems([]);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm("حذف این مورد منو؟")) return;
    await fetch(`/api/admin/menu/${id}`, { method: "DELETE" });
    load();
  };

  const toggleActive = async (item: MenuItem) => {
    await fetch(`/api/admin/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    load();
  };

  const openNew = () => {
    setEditing({
      id: "",
      title: "",
      href: "",
      icon: "",
      order: items.length,
      parentId: null,
      openInNew: false,
      active: true,
    } as MenuItem);
    setShowModal(true);
  };
  const openEdit = (item: MenuItem) => { setEditing(item); setShowModal(true); };

  // Reorder within the same parent group (so children stay under their parent).
  const reorder = async (item: MenuItem, direction: "up" | "down") => {
    const siblings = [...items]
      .filter((i) => (i.parentId ?? null) === (item.parentId ?? null))
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((i) => i.id === item.id);
    if (direction === "up" && idx > 0) {
      const tmp = siblings[idx]; siblings[idx] = siblings[idx - 1]; siblings[idx - 1] = tmp;
    }
    if (direction === "down" && idx < siblings.length - 1) {
      const tmp = siblings[idx]; siblings[idx] = siblings[idx + 1]; siblings[idx + 1] = tmp;
    }
    // Persist new order for each sibling.
    for (let i = 0; i < siblings.length; i++) {
      const s = siblings[i];
      const newOrder = i;
      if (s.order === newOrder) continue;
      await fetch(`/api/admin/menu/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: newOrder }),
      });
    }
    load();
  };

  // Build a flat display list: top-level items first, then their children
  // indented right after them. Sorted by order within each group.
  const topLevel = items
    .filter((i) => !i.parentId)
    .sort((a, b) => a.order - b.order);
  const display: { item: MenuItem; depth: number; parentTitle: string | null }[] = [];
  for (const parent of topLevel) {
    display.push({ item: parent, depth: 0, parentTitle: null });
    const children = items
      .filter((i) => i.parentId === parent.id)
      .sort((a, b) => a.order - b.order);
    for (const child of children) {
      display.push({ item: child, depth: 1, parentTitle: parent.title });
    }
  }
  // Orphans (parentId points to a non-existent item) — show at end as top-level.
  const knownIds = new Set(items.map((i) => i.id));
  items
    .filter((i) => i.parentId && !knownIds.has(i.parentId))
    .forEach((i) => display.push({ item: i, depth: 0, parentTitle: null }));

  // Sibling index lookup for disabling first/last reorder buttons.
  const siblingIndex = (item: MenuItem) => {
    const sibs = items
      .filter((i) => (i.parentId ?? null) === (item.parentId ?? null))
      .sort((a, b) => a.order - b.order);
    return { idx: sibs.findIndex((i) => i.id === item.id), total: sibs.length };
  };

  // Candidates for parent: only top-level items, excluding the item being
  // edited (to prevent self-parenting).
  const parentCandidates = items.filter((i) => !i.parentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <MenuIcon className="h-6 w-6 text-[#F58220]" />
            مدیریت منوی سایت
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {toFa(items.length)} مورد منو · {toFa(topLevel.length)} سر‌گروه · {toFa(items.length - topLevel.length)} زیرمجموعه
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
        >
          <Plus className="h-4 w-4" />
          مورد جدید
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : display.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <MenuIcon className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">هنوز موردی اضافه نشده.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-center w-20">ترتیب</th>
                  <th className="px-4 py-3 text-right font-bold">عنوان</th>
                  <th className="px-4 py-3 text-right font-bold">لینک</th>
                  <th className="px-4 py-3 text-center font-bold">تب جدید</th>
                  <th className="px-4 py-3 text-center font-bold">وضعیت</th>
                  <th className="px-4 py-3 text-center font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {display.map(({ item, depth, parentTitle }) => {
                  const { idx, total } = siblingIndex(item);
                  return (
                    <tr
                      key={item.id}
                      className={`transition hover:bg-zinc-50 ${!item.active ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => reorder(item, "up")}
                            disabled={idx <= 0}
                            className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 disabled:opacity-30"
                            title="بالا"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => reorder(item, "down")}
                            disabled={idx >= total - 1}
                            className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 disabled:opacity-30"
                            title="پایین"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-800">
                        <div
                          className="flex items-center gap-1.5"
                          style={{ paddingRight: depth * 20 }}
                        >
                          {depth > 0 && (
                            <span className="text-zinc-300" title={`زیرمجموعه ${parentTitle}`}>↳</span>
                          )}
                          {item.icon && <span className="ml-1">{item.icon}</span>}
                          <span className={depth > 0 ? "text-zinc-600" : ""}>{item.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400" dir="ltr">
                        {item.href || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.openInNew ? (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">بله</span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActive(item)}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${
                            item.active
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
                          }`}
                        >
                          {item.active ? "فعال" : "غیرفعال"}
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
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                            title="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && editing && (
        <EditModal
          item={editing}
          isNew={!editing.id}
          parentCandidates={parentCandidates}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function EditModal({
  item,
  isNew,
  parentCandidates,
  onClose,
  onSaved,
}: {
  item: MenuItem;
  isNew: boolean;
  parentCandidates: MenuItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<MenuItem>({ ...item });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof MenuItem>(k: K, v: MenuItem[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title) { setError("عنوان الزامی است"); return; }
    setSaving(true);
    setError(null);
    try {
      const url = isNew ? "/api/admin/menu" : `/api/admin/menu/${item.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          href: form.href || null,
          icon: form.icon || null,
          order: Number(form.order) || 0,
          parentId: form.parentId || null,
          openInNew: Boolean(form.openInNew),
          active: Boolean(form.active),
        }),
      });
      const json = await res.json();
      // API returns { ok: true, item } on POST, { ok: true, success: true, item } on PATCH.
      if (res.ok && (json.ok || json.success)) onSaved();
      else setError(json.error ?? "خطا در ذخیره‌سازی");
    } catch {
      setError("خطای شبکه");
    }
    setSaving(false);
  };

  const inputCls = "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-lg font-black text-zinc-900">
            {isNew ? "مورد منو جدید" : "ویرایش منو"}
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
            <label className={labelCls}>عنوان *</label>
            <input
              value={form.title || ""}
              onChange={(e) => set("title", e.target.value)}
              className={inputCls}
              placeholder="مثلاً: ماشین‌آلات"
            />
          </div>
          <div>
            <label className={labelCls}>لینک</label>
            <input
              value={form.href || ""}
              onChange={(e) => set("href", e.target.value)}
              className={inputCls}
              dir="ltr"
              placeholder="/listings"
            />
          </div>
          <div>
            <label className={labelCls}>آیکون (اموجی یا نام)</label>
            <input
              value={form.icon || ""}
              onChange={(e) => set("icon", e.target.value)}
              className={inputCls}
              placeholder="🚜"
            />
          </div>
          <div>
            <label className={labelCls}>مادر (برای ساخت زیرمنو)</label>
            <select
              value={form.parentId || ""}
              onChange={(e) => set("parentId", e.target.value || null)}
              className={inputCls}
            >
              <option value="">— سر‌گروه (بدون مادر) —</option>
              {parentCandidates
                .filter((p) => p.id !== item.id) // prevent self-parenting
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon ? `${p.icon} ` : ""}{p.title}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-[11px] text-zinc-400">
              برای ساخت زیرمنو، یک سر‌گروه انتخاب کنید.
            </p>
          </div>
          <div>
            <label className={labelCls}>ترتیب</label>
            <input
              type="number"
              value={form.order ?? 0}
              onChange={(e) => set("order", Number(e.target.value) || 0)}
              className={inputCls}
              dir="ltr"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-zinc-600">
            <input
              type="checkbox"
              checked={form.openInNew}
              onChange={(e) => set("openInNew", e.target.checked)}
              className="h-4 w-4 accent-[#F58220]"
            />
            باز کردن در تب جدید
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-zinc-600">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="h-4 w-4 accent-[#F58220]"
            />
            فعال
          </label>
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
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}
