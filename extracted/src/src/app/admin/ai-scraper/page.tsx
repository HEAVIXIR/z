"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, CheckCircle2, Plus, ExternalLink, RefreshCw, Tag, MapPin, Calendar, Gauge, DollarSign, Phone, Image as ImageIcon, Zap, Filter, X } from "lucide-react";

type Suggestion = {
  title: string;
  brand?: string;
  model?: string;
  price?: string;
  year?: string;
  hours?: string;
  city?: string;
  condition?: string;
  description?: string;
  phone?: string;
  images?: string[];
  sourceUrl?: string;
  sourceSite?: string;
  categoryMatch?: string;
  brandMatch?: string;
};

type Category = { id: string; name: string };

export default function AIScraperPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [importedKeys, setImportedKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalFound?: number; webFound?: number; aiGenerated?: number }>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);

  useEffect(() => {
    fetch("/api/taxonomy/categories").then((r) => r.json()).then((d) => {
      const cats = d.data || d.categories || [];
      if (Array.isArray(cats)) {
        setCategories(cats.filter((c: any) => !c.parentId).map((c: any) => ({ id: c.id, name: c.name })));
      }
    }).catch(() => {});
  }, []);

  const keyOf = (s: Suggestion, i: number) => `${i}-${s.title}`;

  const scrape = async () => {
    setLoading(true); setError(null); setMessage(null);
    setImportedKeys(new Set()); setSelected(new Set()); setSuggestions([]);
    try {
      const res = await fetch("/api/admin/ai-scraper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "scrape", limit: 10, categoryFilter: categoryFilter || null }) });
      const data = await res.json();
      if (data.ok) { setSuggestions(data.suggestions ?? []); setStats({ totalFound: data.totalFound, webFound: data.webFound, aiGenerated: data.aiGenerated }); if ((data.suggestions ?? []).length === 0) setMessage(data.message ?? "هیچ آگهی‌ای یافت نشد."); }
      else setError(data.error ?? "خطا در جستجو.");
    } catch { setError("خطای شبکه."); }
    setLoading(false);
  };

  const importListing = async (suggestion: Suggestion, idx: number) => {
    const k = keyOf(suggestion, idx); setImporting(k); setError(null);
    try {
      const res = await fetch("/api/admin/ai-scraper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import", suggestion }) });
      const data = await res.json();
      if (data.ok) setImportedKeys((prev) => new Set(prev).add(k));
      else setError(data.error ?? "خطا در ثبت آگهی.");
    } catch { setError("خطای شبکه."); }
    setImporting(null);
  };

  const bulkImport = async () => {
    if (selected.size === 0) return; setBulkImporting(true); setError(null);
    const items = suggestions.filter((_, i) => selected.has(String(i)));
    try {
      const res = await fetch("/api/admin/ai-scraper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bulk-import", suggestions: items }) });
      const data = await res.json();
      if (data.ok) { const okKeys = new Set<string>(); items.forEach((s) => { const idx = suggestions.indexOf(s); if (idx >= 0) okKeys.add(keyOf(s, idx)); }); setImportedKeys((prev) => new Set([...prev, ...okKeys])); setSelected(new Set()); setMessage(`${data.imported} از ${data.total} آگهی با موفقیت در هویکس ثبت شد.`); }
      else setError(data.error ?? "خطا در ثبت آگهی‌ها.");
    } catch { setError("خطای شبکه."); }
    setBulkImporting(false);
  };

  const toggleSelect = (k: string) => { setSelected((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; }); };
  const toggleSelectAll = () => { if (selected.size === suggestions.length) setSelected(new Set()); else setSelected(new Set(suggestions.map((_, i) => String(i)))); };
  const fmtPrice = (p?: string) => { if (!p) return "—"; const n = Number(String(p).replace(/[^\d]/g, "")); return isNaN(n) ? p : n.toLocaleString("fa-IR"); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900"><Sparkles className="h-6 w-6 text-[#F58220]" />دستیار هوش مصنوعی — پیشنهاد آگهی</h1>
          <p className="mt-1 text-sm text-zinc-500">تولید آگهی‌های ماشین‌آلات سنگین با برندها و دسته‌های هویکس — همراه با شماره تماس و تصویر</p>
        </div>
        <button onClick={scrape} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{loading ? "در حال تولید..." : "جستجوی آگهی‌ها"}</button>
      </div>
      <div className="rounded-2xl border border-[#F58220]/30 bg-[#F58220]/5 p-4"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#F58220]" /><div className="text-sm text-zinc-700"><p className="font-bold">چگونه کار می‌کند؟</p><p className="mt-1 text-zinc-600">هوش مصنوعی بر اساس برندها و دسته‌های موجود در هویکس، آگهی‌های واقع‌گرایانه تولید می‌کند — شامل عنوان، برند، مدل، قیمت، سال، ساعت کارکرد، شهر، توضیحات کامل، <b className="text-[#F58220]">شماره تماس</b> و <b className="text-[#F58220]">تصویر ماشین‌آلات</b>.</p></div></div></div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"><Filter className="h-4 w-4 text-zinc-400" /><span className="text-xs font-bold text-zinc-500">تمرکز روی دسته:</span><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220] focus:bg-white"><option value="">همه دسته‌ها</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><span className="ml-auto text-xs text-zinc-400">{suggestions.length > 0 && `${suggestions.length} پیشنهاد · ${importedKeys.size} ثبت‌شده`}</span></div>
      {error && <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">⚠ {error}</div>}
      {message && <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">✓ {message}</div>}
      {loading && <div className="flex flex-col items-center justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-[#F58220]" /><p className="mt-4 text-sm text-zinc-500">در حال تولید آگهی‌های واقع‌گرایانه با هوش مصنوعی...</p></div>}
      {!loading && suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur">
            <label className="flex items-center gap-2 text-sm font-bold text-zinc-700"><input type="checkbox" checked={selected.size === suggestions.length && suggestions.length > 0} onChange={toggleSelectAll} className="h-4 w-4 accent-[#F58220]" />انتخاب همه</label>
            <span className="text-xs text-zinc-400">{selected.size} انتخاب‌شده</span>
            <button onClick={bulkImport} disabled={selected.size === 0 || bulkImporting} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50">{bulkImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}ثبت گروهی ({selected.size})</button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {suggestions.map((s, idx) => {
              const k = keyOf(s, idx); const isImported = importedKeys.has(k); const isSelected = selected.has(String(idx));
              return (
                <div key={k} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${isImported ? "border-emerald-300 bg-emerald-50/30" : isSelected ? "border-[#F58220] ring-2 ring-[#F58220]/20" : "border-zinc-200"}`}>
                  <div className="relative h-40 bg-zinc-100">{s.images?.[0] ? <img src={s.images[0]} alt={s.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-zinc-300"><ImageIcon className="h-10 w-10" /></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" /><label className="absolute right-3 top-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white/95 shadow"><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(String(idx))} className="h-4 w-4 accent-[#F58220]" /></label>{s.sourceSite && <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">{s.sourceSite}</span>}{s.brand && <span className="absolute bottom-3 right-3 rounded-full bg-[#F58220] px-2.5 py-0.5 text-[11px] font-bold text-white">{s.brand}</span>}{s.condition && <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-zinc-700">{s.condition}</span>}</div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2"><h3 className="font-bold leading-6 text-zinc-800">{s.title}</h3>{s.sourceUrl && <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition hover:text-[#F58220]"><ExternalLink className="h-3.5 w-3.5" /></a>}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">{s.price && <div className="flex items-center gap-1.5 text-zinc-700"><DollarSign className="h-3.5 w-3.5 text-emerald-500" /><b>{fmtPrice(s.price)}</b> ت</div>}{s.year && <div className="flex items-center gap-1.5 text-zinc-600"><Calendar className="h-3.5 w-3.5 text-zinc-400" />{s.year}</div>}{s.hours && <div className="flex items-center gap-1.5 text-zinc-600"><Gauge className="h-3.5 w-3.5 text-zinc-400" />{s.hours} ساعت</div>}{s.city && <div className="flex items-center gap-1.5 text-zinc-600"><MapPin className="h-3.5 w-3.5 text-zinc-400" />{s.city}</div>}{s.model && <div className="flex items-center gap-1.5 text-zinc-600"><Tag className="h-3.5 w-3.5 text-zinc-400" />مدل: {s.model}</div>}{s.phone && <div className="flex items-center gap-1.5 text-zinc-700" dir="ltr"><Phone className="h-3.5 w-3.5 text-[#F58220]" /><b className="font-mono">{s.phone}</b></div>}</div>
                    {s.description && <p className="mt-3 line-clamp-3 text-xs leading-5 text-zinc-500">{s.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">{s.brandMatch && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">برند تطبیق شد ✓</span>}{s.categoryMatch && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">دسته تطبیق شد ✓</span>}</div>
                    <div className="mt-4 flex justify-end">{isImported ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />در هویکس ثبت شد ✓</span> : <button onClick={() => importListing(s, idx)} disabled={importing === k} className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50">{importing === k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}{importing === k ? "در حال ثبت..." : "ثبت در هویکس"}</button>}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!loading && suggestions.length === 0 && !message && !error && <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center"><Sparkles className="mx-auto mb-4 h-12 w-12 text-zinc-300" /><h3 className="text-lg font-bold text-zinc-600">آماده شروع</h3><p className="mt-1 text-sm text-zinc-400">روی «جستجوی آگهی‌ها» کلیک کنید تا هوش مصنوعی آگهی‌های ماشین‌آلات سنگین تولید کند.</p></div>}
      {!loading && suggestions.length > 0 && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-500"><span>کل: {stats.totalFound ?? suggestions.length}</span>{stats.aiGenerated !== undefined && <span>· تولید هوش مصنوعی: {stats.aiGenerated}</span>}{stats.webFound !== undefined && stats.webFound > 0 && <span>· از وب: {stats.webFound}</span>}<span className="ml-auto">ثبت‌شده: {importedKeys.size}</span></div>}
    </div>
  );
}
