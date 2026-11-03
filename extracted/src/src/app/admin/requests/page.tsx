"use client";
import { useState, useEffect, useCallback } from "react";
import { Flame, Search, Loader2, Star, Trash2, Pencil, X, Save, Phone, CheckCircle2 } from "lucide-react";
import { toFa } from "@/lib/format";

type BuyRequest = { id: string; title: string; description: string | null; category: string | null; brandPref: string | null; transaction: string; budgetMin: string | null; budgetMax: string | null; city: string | null; deadline: string | null; status: string; verified: boolean; viewCount: number; requesterName: string | null; requesterPhone: string | null; adminNotes: string | null; createdAt: string };
const STATUS_CFG: Record<string,{label:string;cls:string}> = { ACTIVE:{label:"فعال",cls:"bg-emerald-100 text-emerald-700"}, FULFILLED:{label:"برآورده‌شده",cls:"bg-blue-100 text-blue-700"}, CLOSED:{label:"بسته‌شده",cls:"bg-zinc-100 text-zinc-500"} };

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<BuyRequest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<BuyRequest | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const params = new URLSearchParams(); if (search) params.set("q", search); if (statusFilter) params.set("status", statusFilter); const res = await fetch(`/api/admin/requests?${params}`); const json = await res.json(); if (json.success) { setRequests(json.data || []); setStats(json.stats); } } catch {}
    setLoading(false);
  }, [search, statusFilter]);
  useEffect(() => { load(); }, [load]);

  const action = async (id: string, act: string) => { try { await fetch(`/api/admin/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: act }) }); load(); } catch {} };
  const remove = async (id: string) => { if (!confirm("حذف این درخواست؟")) return; await fetch(`/api/admin/requests/${id}`, { method: "DELETE" }); load(); };
  const fmtPrice = (p: string | null) => { if (!p) return "—"; const n = Number(p); return isNaN(n) ? "—" : n.toLocaleString("fa-IR"); };

  return (
    <div className="space-y-6">
      <div><h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900"><Flame className="h-6 w-6 text-[#F58220]" />درخواست‌های خرید (HEAVIX Wanted)</h1><p className="mt-1 text-sm text-zinc-500">{stats?.total ?? 0} درخواست کل</p></div>
      {stats && <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"><p className="text-xl font-black text-zinc-900">{toFa(stats.total)}</p><p className="text-[11px] text-zinc-500">کل</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"><p className="text-xl font-black text-emerald-600">{toFa(stats.active)}</p><p className="text-[11px] text-zinc-500">فعال</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"><p className="text-xl font-black text-blue-600">{toFa(stats.fulfilled)}</p><p className="text-[11px] text-zinc-500">برآورده‌شده</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"><p className="text-xl font-black text-zinc-500">{toFa(stats.closed)}</p><p className="text-[11px] text-zinc-500">بسته‌شده</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"><p className="text-xl font-black text-teal-600">{toFa(stats.verified)}</p><p className="text-[11px] text-zinc-500">تأییدشده</p></div></div>}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px]"><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی درخواست..." className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pr-9 pl-3 text-sm text-zinc-800 outline-none focus:border-[#F58220] focus:bg-white" /></div>
        <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">{["", "ACTIVE", "FULFILLED", "CLOSED"].map((s) => <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${statusFilter === s ? "bg-white text-[#F58220] shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>{s ? STATUS_CFG[s]?.label : "همه"}</button>)}</div>
      </div>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#F58220]" /></div> : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500"><tr><th className="px-4 py-3 text-right font-bold">درخواست</th><th className="px-4 py-3 text-center font-bold">نوع</th><th className="px-4 py-3 text-right font-bold">بودجه</th><th className="px-4 py-3 text-center font-bold">تماس</th><th className="px-4 py-3 text-center font-bold">وضعیت</th><th className="px-4 py-3 text-center font-bold">عملیات</th></tr></thead><tbody className="divide-y divide-zinc-100">{requests.map((r) => { const sCfg = STATUS_CFG[r.status] ?? { label: r.status, cls: "bg-zinc-100 text-zinc-500" }; return (<tr key={r.id} className="transition hover:bg-zinc-50"><td className="px-4 py-3"><p className="flex items-center gap-1 font-bold text-zinc-800">{r.verified && <Star className="h-3 w-3 fill-teal-500 text-teal-500" />}{r.title}</p><p className="mt-0.5 truncate text-[11px] text-zinc-400">{r.category ?? "—"} · {r.brandPref ?? "—"} · {r.city ?? "—"}{r.deadline && ` · ${r.deadline}`}</p>{r.description && <p className="mt-1 line-clamp-1 text-[11px] text-zinc-300">{r.description}</p>}</td><td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.transaction === "RENT" ? "bg-blue-100 text-blue-700" : "bg-[#F58220]/10 text-[#F58220]"}`}>{r.transaction === "RENT" ? "اجاره" : "خرید"}</span></td><td className="px-4 py-3 text-xs font-bold text-zinc-700">{r.budgetMin || r.budgetMax ? <span>{r.budgetMin && fmtPrice(r.budgetMin)}{r.budgetMin && r.budgetMax && " — "}{r.budgetMax && fmtPrice(r.budgetMax)}<span className="text-[10px] text-zinc-400"> ت</span></span> : "—"}</td><td className="px-4 py-3 text-center">{r.requesterPhone ? <a href={`tel:${r.requesterPhone}`} dir="ltr" className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-0.5 text-[11px] font-mono font-bold text-zinc-700 hover:bg-[#F58220]/10 hover:text-[#F58220]"><Phone className="h-3 w-3" />{r.requesterPhone}</a> : <span className="text-zinc-300">—</span>}</td><td className="px-4 py-3 text-center"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${sCfg.cls}`}>{sCfg.label}</span></td><td className="px-4 py-3"><div className="flex items-center justify-center gap-1"><button onClick={() => action(r.id, r.verified ? "unverify" : "verify")} className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${r.verified ? "text-teal-500" : "text-zinc-300 hover:text-teal-500"}`} title={r.verified ? "حذف تأیید" : "تأیید درخواست"}><Star className="h-3.5 w-3.5" /></button><button onClick={() => action(r.id, "fulfill")} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-blue-50 hover:text-blue-500" title="برآورده‌شده"><CheckCircle2 className="h-3.5 w-3.5" /></button><button onClick={() => { setEditing(r); setShowModal(true); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-[#F58220]/10 hover:text-[#F58220]" title="ویرایش"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => remove(r.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500" title="حذف"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>);})}{requests.length === 0 && <tr><td colSpan={6} className="px-4 py-16 text-center text-zinc-400">درخواستی یافت نشد.</td></tr>}</tbody></table></div>
        </div>
      )}
      {showModal && editing && <EditModal request={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function EditModal({ request, onClose, onSaved }: { request: BuyRequest; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({ ...request });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const save = async () => { setSaving(true); try { await fetch(`/api/admin/requests/${request.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, description: form.description, category: form.category, brandPref: form.brandPref, transaction: form.transaction, budgetMin: form.budgetMin, budgetMax: form.budgetMax, city: form.city, deadline: form.deadline, status: form.status, verified: form.verified, requesterName: form.requesterName, requesterPhone: form.requesterPhone, adminNotes: form.adminNotes }) }); onSaved(); } catch {} setSaving(false); };
  const inputCls = "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4"><h2 className="text-lg font-black text-zinc-900">ویرایش درخواست</h2><button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"><X className="h-5 w-5" /></button></div>
        <div className="space-y-4 p-6">
          <div><label className={labelCls}>عنوان</label><input value={form.title || ""} onChange={(e) => set("title", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>توضیحات</label><textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} rows={3} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#F58220]" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>دسته</label><input value={form.category || ""} onChange={(e) => set("category", e.target.value)} className={inputCls} /></div><div><label className={labelCls}>برند موردنظر</label><input value={form.brandPref || ""} onChange={(e) => set("brandPref", e.target.value)} className={inputCls} /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>بودجه حداقل</label><input value={form.budgetMin || ""} onChange={(e) => set("budgetMin", e.target.value)} className={inputCls} dir="ltr" /></div><div><label className={labelCls}>بودجه حداکثر</label><input value={form.budgetMax || ""} onChange={(e) => set("budgetMax", e.target.value)} className={inputCls} dir="ltr" /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>شهر</label><input value={form.city || ""} onChange={(e) => set("city", e.target.value)} className={inputCls} /></div><div><label className={labelCls}>زمان</label><input value={form.deadline || ""} onChange={(e) => set("deadline", e.target.value)} className={inputCls} /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>نوع</label><select value={form.transaction} onChange={(e) => set("transaction", e.target.value)} className={inputCls}><option value="SALE">خرید</option><option value="RENT">اجاره</option></select></div><div><label className={labelCls}>وضعیت</label><select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}><option value="ACTIVE">فعال</option><option value="FULFILLED">برآورده‌شده</option><option value="CLOSED">بسته‌شده</option></select></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>نام درخواست‌کننده</label><input value={form.requesterName || ""} onChange={(e) => set("requesterName", e.target.value)} className={inputCls} /></div><div><label className={labelCls}>شماره تماس</label><input value={form.requesterPhone || ""} onChange={(e) => set("requesterPhone", e.target.value)} className={inputCls} dir="ltr" /></div></div>
          <label className="flex items-center gap-2 text-sm font-bold text-zinc-600"><input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} className="h-4 w-4 accent-teal-500" /><Star className="h-4 w-4 text-teal-500" />درخواست تأییدشده</label>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4"><button onClick={onClose} className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50">انصراف</button><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}ذخیره</button></div>
      </div>
    </div>
  );
}
