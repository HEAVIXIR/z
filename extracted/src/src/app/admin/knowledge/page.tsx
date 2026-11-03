"use client";

import { useState, useEffect } from "react";
import { BookOpen, Loader2, ShieldCheck, Sparkles, Plus, X, Save } from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /admin/knowledge — AI Knowledge Base management
   Priority #58, #59, #60
   ============================================================ */

type Entry = {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  key: string;
  value: string;
  unit: string | null;
  source: string;
  sourceUrl: string | null;
  verified: boolean;
  aiSuggested: boolean;
  createdAt: string;
};

const SOURCE_LABELS: Record<string, string> = {
  MANUFACTURER: "سازنده",
  SELLER: "فروشنده",
  HEAVIX: "هویکس",
  USER: "کاربر",
  AI: "هوش مصنوعی",
  EXTERNAL: "منبع خارجی",
};

const SOURCE_COLORS: Record<string, string> = {
  MANUFACTURER: "bg-emerald-100 text-emerald-700",
  SELLER: "bg-blue-100 text-blue-700",
  HEAVIX: "bg-[#F58220]/10 text-[#F58220]",
  USER: "bg-zinc-100 text-zinc-600",
  AI: "bg-purple-100 text-purple-700",
  EXTERNAL: "bg-amber-100 text-amber-700",
};

export default function KnowledgePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter ? `?entityType=${filter}` : "";
      const res = await fetch(`/api/admin/knowledge-entries${params}`);
      const json = await res.json();
      if (json.success) { setEntries(json.data || []); setStats(json.stats); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <BookOpen className="h-6 w-6 text-[#F58220]" />
            پایگاه دانش هویکس
          </h1>
          <p className="mt-1 text-sm text-zinc-500">مدیریت مشخصات ماشین‌آلات با منبع و وضعیت تأیید</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38]">
          <Plus className="h-4 w-4" />ثبت مشخصه
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="text-xl font-black text-zinc-900">{toFa(stats.total)}</p>
            <p className="text-[11px] text-zinc-500">کل مشخصه‌ها</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="text-xl font-black text-emerald-600">{toFa(stats.verified)}</p>
            <p className="text-[11px] text-zinc-500">تأییدشده</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="text-xl font-black text-purple-600">{toFa(stats.aiSuggested)}</p>
            <p className="text-[11px] text-zinc-500">پیشنهاد AI</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="text-xl font-black text-amber-600">{toFa(stats.total - stats.verified)}</p>
            <p className="text-[11px] text-zinc-500">در انتظار تأیید</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter("")} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${!filter ? "bg-[#F58220] text-white" : "bg-zinc-100 text-zinc-500"}`}>همه</button>
        {["BRAND", "MODEL", "MACHINE", "CATEGORY"].map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${filter === t ? "bg-[#F58220] text-white" : "bg-zinc-100 text-zinc-500"}`}>{t}</button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#F58220]" /></div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">هنوز مشخصه‌ای ثبت نشده.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-right font-bold">عنوان</th>
                <th className="px-4 py-3 text-right font-bold">مقدار</th>
                <th className="px-4 py-3 text-center font-bold">منبع</th>
                <th className="px-4 py-3 text-center font-bold">تأیید</th>
                <th className="px-4 py-3 text-center font-bold">AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {entries.map((e) => (
                <tr key={e.id} className="transition hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-zinc-800">{e.title}</p>
                    <p className="text-[10px] text-zinc-400">{e.entityType} · {e.key}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {e.value}{e.unit && <span className="text-xs text-zinc-400"> {e.unit}</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SOURCE_COLORS[e.source] || "bg-zinc-100 text-zinc-500"}`}>
                      {SOURCE_LABELS[e.source] || e.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {e.verified ? <ShieldCheck className="mx-auto h-4 w-4 text-emerald-500" /> : <span className="text-xs text-amber-500">در انتظار</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {e.aiSuggested ? <Sparkles className="mx-auto h-4 w-4 text-purple-500" /> : <span className="text-xs text-zinc-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <EntryModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function EntryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ entityType: "MACHINE", entityId: "", title: "", key: "", value: "", unit: "", source: "HEAVIX", sourceUrl: "", verified: false, aiSuggested: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.entityId || !form.key || !form.value) { setError("شناسه موجودیت، کلید و مقدار الزامی است"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/admin/knowledge-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) onSaved();
      else setError(json.error ?? "خطا");
    } catch { setError("خطای شبکه"); }
    setSaving(false);
  };

  const inputCls = "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <h2 className="text-lg font-black text-zinc-900">ثبت مشخصه دانش</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          {error && <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">⚠ {error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>نوع موجودیت</label><select value={form.entityType} onChange={(e) => set("entityType", e.target.value)} className={inputCls}><option value="MACHINE">ماشین</option><option value="MODEL">مدل</option><option value="BRAND">برند</option><option value="CATEGORY">دسته</option></select></div>
            <div><label className={labelCls}>شناسه موجودیت *</label><input value={form.entityId} onChange={(e) => set("entityId", e.target.value)} className={inputCls} placeholder="cuid..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>عنوان</label><input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} placeholder="قدرت موتور" /></div>
            <div><label className={labelCls}>کلید *</label><input value={form.key} onChange={(e) => set("key", e.target.value)} className={inputCls} dir="ltr" placeholder="engine_power" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>مقدار *</label><input value={form.value} onChange={(e) => set("value", e.target.value)} className={inputCls} placeholder="145" /></div>
            <div><label className={labelCls}>واحد</label><input value={form.unit} onChange={(e) => set("unit", e.target.value)} className={inputCls} placeholder="kW" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>منبع</label><select value={form.source} onChange={(e) => set("source", e.target.value)} className={inputCls}>{Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className={labelCls}>URL منبع</label><input value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} className={inputCls} dir="ltr" placeholder="https://..." /></div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-bold text-zinc-600"><input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} className="h-4 w-4 accent-emerald-500" /><ShieldCheck className="h-4 w-4 text-emerald-500" />تأییدشده</label>
            <label className="flex items-center gap-2 text-sm font-bold text-zinc-600"><input type="checkbox" checked={form.aiSuggested} onChange={(e) => set("aiSuggested", e.target.checked)} className="h-4 w-4 accent-purple-500" /><Sparkles className="h-4 w-4 text-purple-500" />پیشنهاد AI</label>
          </div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50">انصراف</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}ذخیره</button>
        </div>
      </div>
    </div>
  );
}
