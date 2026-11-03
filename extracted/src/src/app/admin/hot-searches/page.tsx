"use client";
import { useState, useEffect, useCallback } from "react";
import { Flame, Plus, Loader2, Trash2, Pencil, X, Save, CheckSquare, Square, Zap, Eye, EyeOff, GripVertical } from "lucide-react";
import { toFa } from "@/lib/format";

type HotSearch = { id: string; term: string; link: string | null; count: number; active: boolean; sortOrder: number };

export default function AdminHotSearchesPage() {
  const [items, setItems] = useState<HotSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<HotSearch | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkWorking, setBulkWorking] = useState(false);

  const load = useCallback(async () => { setLoading(true); try { const res = await fetch("/api/admin/hot-searches"); const json = await res.json(); if (json.success) setItems(json.data || []); } catch {} setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  const toggleActive = async (item: HotSearch) => { await fetch(`/api/admin/hot-searches/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !item.active }) }); load(); };
  const remove = async (id: string) => { if (!confirm("حذف این مورد؟")) return; await fetch(`/api/admin/hot-searches/${id}`, { method: "DELETE" }); load(); };
  const openNew = () => { setEditing({ id: "", term: "", link: "", count: 0, active: true, sortOrder: items.length } as HotSearch); setShowModal(true); };
  const openEdit = (item: HotSearch) => { setEditing(item); setShowModal(true); };
  const runBulk = async () => { if (!bulkAction || selected.size === 0) return; if (bulkAction === "delete" && !confirm(`${selected.size} مورد حذف شود؟`)) return; setBulkWorking(true); try { await fetch("/api/admin/hot-searches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: bulkAction, ids: Array.from(selected) }) }); setSelected(new Set()); setBulkAction(""); load(); } catch {} setBulkWorking(false); };
  const toggleSelect = (id: string) => { setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900"><Flame className="h-6 w-6 text-[#F58220]" />داغ‌ترین بازار — مدیریت</h1><p className="mt-1 text-sm text-zinc-500">{toFa(items.length)} مورد — در صفحه اصلی نمایش داده می‌شود</p></div><button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38]"><Plus className="h-4 w-4" />مورد جدید</button></div>
      {selected.size > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#F58220]/5 border border-[#F58220]/20 px-3 py-2"><span className="text-xs font-bold text-[#F58220]">{toFa(selected.size)} انتخاب‌شده</span><select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-800 outline-none focus:border-[#F58220]"><option value="">انتخاب عملیات...</option><option value="activate">فعال کردن</option><option value="deactivate">غیرفعال کردن</option><option value="delete">حذف</option></select><button onClick={runBulk} disabled={!bulkAction || bulkWorking} className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-40">{bulkWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}اجرا</button><button onClick={() => { setSelected(new Set()); setBulkAction(""); }} className="mr-auto text-xs text-zinc-400 hover:text-zinc-600">لغو انتخاب</button></div>}
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#F58220]" /></div> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center"><Flame className="mx-auto mb-4 h-12 w-12 text-zinc-300" /><p className="text-sm text-zinc-400">هنوز موردی اضافه نشده.</p></div> : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm"><thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500"><tr><th className="px-3 py-3 text-center w-10"><button onClick={() => { if (selected.size === items.length) setSelected(new Set()); else setSelected(new Set(items.map(i => i.id))); }} className="text-zinc-400 hover:text-[#F58220]">{selected.size === items.length && items.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}</button></th><th className="px-3 py-3 text-center w-10">#</th><th className="px-4 py-3 text-right font-bold">عبارت</th><th className="px-4 py-3 text-right font-bold">لینک</th><th className="px-4 py-3 text-center font-bold">شمارش</th><th className="px-4 py-3 text-center font-bold">وضعیت</th><th className="px-4 py-3 text-center font-bold">عملیات</th></tr></thead><tbody className="divide-y divide-zinc-100">{items.map((item, idx) => (<tr key={item.id} className={`transition hover:bg-zinc-50 ${selected.has(item.id) ? "bg-[#F58220]/5" : ""} ${!item.active ? "opacity-50" : ""}`}><td className="px-3 py-3 text-center"><button onClick={() => toggleSelect(item.id)} className="text-zinc-400 hover:text-[#F58220]">{selected.has(item.id) ? <CheckSquare className="h-4 w-4 text-[#F58220]" /> : <Square className="h-4 w-4" />}</button></td><td className="px-3 py-3 text-center text-xs text-zinc-400"><GripVertical className="mx-auto h-4 w-4" />{idx + 1}</td><td className="px-4 py-3 font-bold text-zinc-800">{item.term}</td><td className="px-4 py-3 text-xs text-zinc-400 truncate max-w-xs" dir="ltr">{item.link || "—"}</td><td className="px-4 py-3 text-center text-zinc-500">{item.count.toLocaleString("fa-IR")}</td><td className="px-4 py-3 text-center"><button onClick={() => toggleActive(item)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${item.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"}`}>{item.active ? <><Eye className="h-3 w-3" /> فعال</> : <><EyeOff className="h-3 w-3" /> غیرفعال</>}</button></td><td className="px-4 py-3"><div className="flex items-center justify-center gap-1"><button onClick={() => openEdit(item)} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-[#F58220]/10 hover:text-[#F58220]" title="ویرایش"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => remove(item.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500" title="حذف"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>))}</tbody></table>
        </div>
      )}
      {showModal && editing && <EditModal item={editing} isNew={!editing.id} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function EditModal({ item, isNew, onClose, onSaved }: { item: HotSearch; isNew: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({ ...item });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const save = async () => { if (!form.term || String(form.term).trim().length < 2) { setError("عبارت حداقل ۲ نویسه باشد"); return; } setSaving(true); setError(null); try { const url = isNew ? "/api/admin/hot-searches" : `/api/admin/hot-searches/${item.id}`; const method = isNew ? "POST" : "PATCH"; const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ term: form.term, link: form.link || null, count: Number(form.count) || 0, active: form.active, sortOrder: Number(form.sortOrder) || 0 }) }); const json = await res.json(); if (json.success || json.ok) onSaved(); else setError(json.error ?? "خطا"); } catch { setError("خطای شبکه"); } setSaving(false); };
  const inputCls = "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4"><h2 className="text-lg font-black text-zinc-900">{isNew ? "مورد جدید" : "ویرایش"}</h2><button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"><X className="h-5 w-5" /></button></div>
        <div className="space-y-4 p-6">{error && <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">⚠ {error}</div>}<div><label className={labelCls}>عبارت جستجو *</label><input value={form.term || ""} onChange={(e) => set("term", e.target.value)} className={inputCls} placeholder="مثلاً: بیل مکانیکی ۲۰ تن" /></div><div><label className={labelCls}>لینک (اختیاری)</label><input value={form.link || ""} onChange={(e) => set("link", e.target.value)} className={inputCls} dir="ltr" placeholder="/listings?q=بیل" /></div><div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>شمارش جستجو</label><input type="number" value={form.count || 0} onChange={(e) => set("count", e.target.value)} className={inputCls} dir="ltr" /></div><div><label className={labelCls}>ترتیب</label><input type="number" value={form.sortOrder || 0} onChange={(e) => set("sortOrder", e.target.value)} className={inputCls} dir="ltr" /></div></div><label className="flex items-center gap-2 text-sm font-bold text-zinc-600"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[#F58220]" />فعال</label></div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4"><button onClick={onClose} className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50">انصراف</button><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}ذخیره</button></div>
      </div>
    </div>
  );
}
