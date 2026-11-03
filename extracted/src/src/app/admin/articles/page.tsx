"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Search, Loader2, Trash2, Pencil, X, Save, Eye, CheckSquare, Square, Zap, ExternalLink, Sparkles, Image as ImageIcon } from "lucide-react";

type Article = { id: string; slug: string; title: string; excerpt: string | null; content: string; category: string; tags: string | null; coverImage: string | null; status: string; viewCount: number; publishedAt: string | null; createdAt: string };
const STATUS_CFG: Record<string, { label: string; cls: string }> = { PUBLISHED: { label: "منتشرشده", cls: "bg-emerald-100 text-emerald-700" }, DRAFT: { label: "پیش‌نویس", cls: "bg-zinc-100 text-zinc-500" }, ARCHIVED: { label: "بایگانی", cls: "bg-amber-100 text-amber-700" } };
const CATEGORY_LABELS: Record<string, string> = { GUIDE: "راهنما", COMPARISON: "مقایسه", REVIEW: "نقد و بررسی", NEWS: "اخبار", TUTORIAL: "آموزش" };

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<Article | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [imageWorkingId, setImageWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/articles?${params}`);
      const json = await res.json();
      // FIX-SERVICES-KNOWLEDGE-CATS-BRANDS (Part 4): API returns
      // { articles, stats } (no `success` field). Read it directly
      // (defensive fallback to json.data for backward compat).
      setArticles(Array.isArray(json?.articles) ? json.articles : (json?.data || []));
      setStats(json?.stats ?? null);
    } catch {}
    setLoading(false);
  }, [search, statusFilter]);

  const generateImage = async (a: Article) => {
    if (!confirm(`تولید تصویر کاور با AI برای «${a.title}»؟ (۲۰-۴۰ ثانیه)`)) return;
    setImageWorkingId(a.id);
    try {
      const res = await fetch("/api/admin/knowledge/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: a.id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "تولید تصویر ناموفق بود.");
      }
      alert("✓ تصویر کاور ساخته و ذخیره شد.");
      load();
    } catch (e: any) {
      alert("⚠ " + (e?.message ?? "خطای شبکه"));
    } finally {
      setImageWorkingId(null);
    }
  };

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => { if (!confirm("حذف این مقاله؟")) return; await fetch(`/api/admin/articles/${id}`, { method: "DELETE" }); setSelected((p) => { const n = new Set(p); n.delete(id); return n; }); load(); };
  const openNew = () => { setEditing({ id: "", slug: "", title: "", excerpt: "", content: "", category: "GUIDE", tags: "", coverImage: "", status: "DRAFT", viewCount: 0, publishedAt: null, createdAt: new Date().toISOString() } as Article); setShowModal(true); };
  const openEdit = (a: Article) => { setEditing(a); setShowModal(true); };
  const runBulk = async () => { if (!bulkAction || selected.size === 0) return; if (bulkAction === "delete" && !confirm(`${selected.size} مقاله حذف شود؟`)) return; setBulkWorking(true); try { await fetch("/api/admin/articles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: bulkAction, ids: Array.from(selected) }) }); setSelected(new Set()); setBulkAction(""); load(); } catch {} setBulkWorking(false); };
  const toggleSelect = (id: string) => { setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const toggleSelectAll = () => { if (selected.size === articles.length) setSelected(new Set()); else setSelected(new Set(articles.map((a) => a.id))); };
  const fmtDate = (iso: string | null) => { if (!iso) return "—"; try { return new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" }); } catch { return "—"; } };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900"><BookOpen className="h-6 w-6 text-[#F58220]" />هویکس دانش — مدیریت مقالات</h1><p className="mt-1 text-sm text-zinc-500">{stats?.total ?? 0} مقاله کل</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowAiModal(true)} className="inline-flex items-center gap-2 rounded-xl border border-purple-300 bg-purple-50 px-4 py-2.5 text-sm font-bold text-purple-700 transition hover:bg-purple-100"><Sparkles className="h-4 w-4" />تولید مقاله با AI</button>
          <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38]"><Plus className="h-4 w-4" />مقاله جدید</button>
        </div>
      </div>
      {stats && <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"><p className="text-xl font-black text-zinc-900">{(stats.total||0).toLocaleString("fa-IR")}</p><p className="text-[11px] text-zinc-500">کل</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"><p className="text-xl font-black text-emerald-600">{(stats.published||0).toLocaleString("fa-IR")}</p><p className="text-[11px] text-zinc-500">منتشرشده</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"><p className="text-xl font-black text-zinc-600">{(stats.draft||0).toLocaleString("fa-IR")}</p><p className="text-[11px] text-zinc-500">پیش‌نویس</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"><p className="text-xl font-black text-amber-700">{(stats.archived||0).toLocaleString("fa-IR")}</p><p className="text-[11px] text-zinc-500">بایگانی</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"><p className="text-xl font-black text-purple-700">{(stats.totalViews||0).toLocaleString("fa-IR")}</p><p className="text-[11px] text-zinc-500">بازدید کل</p></div></div>}
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]"><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی عنوان..." className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pr-9 pl-3 text-sm text-zinc-800 outline-none focus:border-[#F58220] focus:bg-white" /></div>
          <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">{["", "PUBLISHED", "DRAFT", "ARCHIVED"].map((s) => <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${statusFilter === s ? "bg-white text-[#F58220] shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>{s ? STATUS_CFG[s]?.label : "همه"}</button>)}</div>
        </div>
        {selected.size > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#F58220]/5 border border-[#F58220]/20 px-3 py-2"><span className="text-xs font-bold text-[#F58220]">{selected.size} انتخاب‌شده</span><select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-800 outline-none focus:border-[#F58220]"><option value="">انتخاب عملیات...</option><option value="publish">📢 انتشار</option><option value="draft">📝 پیش‌نویس</option><option value="archive">📦 بایگانی</option><option value="delete">🗑 حذف</option></select><button onClick={runBulk} disabled={!bulkAction || bulkWorking} className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-40">{bulkWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}اجرا</button><button onClick={() => { setSelected(new Set()); setBulkAction(""); }} className="mr-auto text-xs text-zinc-400 hover:text-zinc-600">لغو انتخاب</button></div>}
      </div>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#F58220]" /></div> : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500"><tr><th className="px-3 py-3 text-center w-10"><button onClick={toggleSelectAll} className="text-zinc-400 hover:text-[#F58220]">{selected.size === articles.length && articles.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}</button></th><th className="px-4 py-3 text-right font-bold">مقاله</th><th className="px-4 py-3 text-center font-bold">دسته</th><th className="px-4 py-3 text-center font-bold">بازدید</th><th className="px-4 py-3 text-center font-bold">تاریخ</th><th className="px-4 py-3 text-center font-bold">وضعیت</th><th className="px-4 py-3 text-center font-bold">عملیات</th></tr></thead><tbody className="divide-y divide-zinc-100">{articles.map((a) => { const sCfg = STATUS_CFG[a.status] ?? { label: a.status, cls: "bg-zinc-100 text-zinc-500" }; return (<tr key={a.id} className={`transition hover:bg-zinc-50 ${selected.has(a.id) ? "bg-[#F58220]/5" : ""}`}><td className="px-3 py-3 text-center"><button onClick={() => toggleSelect(a.id)} className="text-zinc-400 hover:text-[#F58220]">{selected.has(a.id) ? <CheckSquare className="h-4 w-4 text-[#F58220]" /> : <Square className="h-4 w-4" />}</button></td><td className="px-4 py-3"><p className="font-bold text-zinc-800 line-clamp-1">{a.title}</p>{a.excerpt && <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{a.excerpt}</p>}<p className="text-[10px] text-zinc-300 mt-0.5">/{a.slug}</p></td><td className="px-4 py-3 text-center"><span className="rounded-full bg-[#F58220]/10 px-2 py-0.5 text-[10px] font-bold text-[#F58220]">{CATEGORY_LABELS[a.category] || a.category}</span></td><td className="px-4 py-3 text-center text-zinc-500"><span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{a.viewCount.toLocaleString("fa-IR")}</span></td><td className="px-4 py-3 text-center text-xs text-zinc-500">{fmtDate(a.publishedAt || a.createdAt)}</td><td className="px-4 py-3 text-center"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${sCfg.cls}`}>{sCfg.label}</span></td><td className="px-4 py-3"><div className="flex items-center justify-center gap-1"><button onClick={() => openEdit(a)} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-[#F58220]/10 hover:text-[#F58220]" title="ویرایش"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => generateImage(a)} disabled={imageWorkingId === a.id} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-purple-50 hover:text-purple-600 disabled:opacity-40" title="تولید تصویر کاور با AI">{imageWorkingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}</button>{a.status === "PUBLISHED" && <a href={`/knowledge/${a.slug}`} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:text-blue-500" title="مشاهده در سایت"><ExternalLink className="h-3.5 w-3.5" /></a>}<button onClick={() => remove(a.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500" title="حذف"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>);})}{articles.length === 0 && <tr><td colSpan={7} className="px-4 py-16 text-center text-zinc-400">مقاله‌ای یافت نشد.</td></tr>}</tbody></table></div>
        </div>
      )}
      {/* Per-row AI image button — appended to each row's action cell.
          Because the existing table is one giant JSX expression, we
          add a small inline helper above the table to inject the
          button via a click handler keyed off the article id. */}
      {showModal && editing && <EditModal article={editing} isNew={!editing.id} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
      {showAiModal && <AiArticleModal onClose={() => setShowAiModal(false)} onSaved={() => { setShowAiModal(false); load(); }} />}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   AI Article Modal — admin enters a topic, the assistant
   generates a full draft article (title + excerpt + content +
   cover image) via the LLM + image gen, then saves it as a
   DRAFT. The admin reviews/edits before publishing.
─────────────────────────────────────────────────────────── */
function AiArticleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("GUIDE");
  const [generateImage, setGenerateImage] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);

  const generate = async () => {
    if (topic.trim().length < 3) {
      setError("موضوع را وارد کنید (حداقل ۳ حرف).");
      return;
    }
    setWorking(true); setError(null); setPreview(null);
    try {
      const res = await fetch("/api/admin/knowledge/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, category, generateImage }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "تولید مقاله ناموفق بود.");
      }
      setPreview(json.article);
    } catch (e: any) {
      setError(e?.message ?? "خطای شبکه");
    } finally {
      setWorking(false);
    }
  };

  const inputCls = "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-zinc-900"><Sparkles className="h-5 w-5 text-purple-600" />تولید مقاله با AI</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          {error && <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">⚠ {error}</div>}
          {!preview && (
            <>
              <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-xs leading-6 text-purple-800">
                ✨ موضوع مورد نظر را وارد کنید. هوش مصنوعی یک مقاله فارسی کامل
                (عنوان + خلاصه + محتوای Markdown) می‌نویسد و در صورت تمایل یک
                تصویر کاور صنعتی هم تولید می‌کند. مقاله به‌صورت <b>پیش‌نویس</b>
                ذخیره می‌شود — قبل از انتشار آن را بازبینی و ویرایش کنید.
              </div>
              <div>
                <label className={labelCls}>موضوع مقاله *</label>
                <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#F58220]" placeholder="مثلاً: راهنمای خرید بیل مکانیکی کارکرده" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>دسته</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                    <option value="GUIDE">راهنما</option>
                    <option value="COMPARISON">مقایسه</option>
                    <option value="REVIEW">نقد و بررسی</option>
                    <option value="NEWS">اخبار</option>
                    <option value="TUTORIAL">آموزش</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm font-bold text-zinc-600">
                    <input type="checkbox" checked={generateImage} onChange={(e) => setGenerateImage(e.target.checked)} className="h-4 w-4 accent-purple-500" />
                    تولید تصویر کاور با AI
                  </label>
                </div>
              </div>
            </>
          )}
          {preview && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">✓ مقاله با موفقیت ساخته و به‌صورت پیش‌نویس ذخیره شد.</div>
              {preview.coverImage && (
                <div className="overflow-hidden rounded-xl border border-zinc-200">
                  <img src={preview.coverImage} alt={preview.title} className="aspect-[16/9] w-full object-cover" />
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-zinc-500">عنوان</p>
                <p className="text-sm font-black text-zinc-900">{preview.title}</p>
              </div>
              {preview.excerpt && (
                <div>
                  <p className="text-xs font-bold text-zinc-500">خلاصه</p>
                  <p className="text-sm text-zinc-700">{preview.excerpt}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-zinc-500">محتوا (پیش‌نمایش)</p>
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700">{preview.content}</pre>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="rounded bg-zinc-100 px-2 py-0.5">/{preview.slug}</span>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">پیش‌نویس</span>
              </div>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4">
          {preview ? (
            <>
              <button onClick={onClose} className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50">بستن</button>
              <button onClick={onSaved} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38]">ویرایش مقاله</button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50">انصراف</button>
              <button onClick={generate} disabled={working} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-50">{working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{working ? "در حال تولید..." : "تولید مقاله"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EditModal({ article, isNew, onClose, onSaved }: { article: Article; isNew: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({ ...article });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const save = async () => { setSaving(true); setError(null); try { const url = isNew ? "/api/admin/articles" : `/api/admin/articles/${article.id}`; const method = isNew ? "POST" : "PATCH"; const body: any = { title: form.title, excerpt: form.excerpt, content: form.content, category: form.category, tags: form.tags, coverImage: form.coverImage, status: form.status }; if (isNew) body.slug = form.slug; const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const json = await res.json(); if (json.success || json.ok) onSaved(); else setError(json.error ?? "خطا در ذخیره"); } catch { setError("خطای شبکه"); } setSaving(false); };
  const inputCls = "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4"><h2 className="text-lg font-black text-zinc-900">{isNew ? "مقاله جدید" : "ویرایش مقاله"}</h2><button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"><X className="h-5 w-5" /></button></div>
        <div className="space-y-4 p-6">
          {error && <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">⚠ {error}</div>}
          <div><label className={labelCls}>عنوان *</label><input value={form.title || ""} onChange={(e) => set("title", e.target.value)} className={inputCls} placeholder="عنوان مقاله" /></div>
          {isNew && <div><label className={labelCls}>نامک (slug) — اختیاری</label><input value={form.slug || ""} onChange={(e) => set("slug", e.target.value)} className={inputCls} dir="ltr" placeholder="auto-generated if empty" /></div>}
          <div><label className={labelCls}>خلاصه</label><input value={form.excerpt || ""} onChange={(e) => set("excerpt", e.target.value)} className={inputCls} placeholder="خلاصه کوتاه مقاله" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>دسته</label><select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>{Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div><div><label className={labelCls}>وضعیت</label><select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>{Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}</select></div></div>
          <div><label className={labelCls}>تصویر کاور (URL)</label><input value={form.coverImage || ""} onChange={(e) => set("coverImage", e.target.value)} className={inputCls} dir="ltr" placeholder="/images/..." />{form.coverImage && <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200"><img src={form.coverImage} alt="" className="aspect-[16/9] w-full object-cover" /></div>}</div>
          <div><label className={labelCls}>برچسب‌ها (با کامما)</label><input value={form.tags || ""} onChange={(e) => set("tags", e.target.value)} className={inputCls} placeholder="بیل مکانیکی, خرید, راهنما" /></div>
          <div><label className={labelCls}>محتوا (Markdown: # تیتر، ## زیرتیتر، - لیست)</label><textarea value={form.content || ""} onChange={(e) => set("content", e.target.value)} rows={12} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-800 outline-none focus:border-[#F58220]" placeholder={"# تیتر اصلی\n\n## زیرتیتر\n\nمتن پاراگراف...\n\n- مورد لیست ۱\n- مورد لیست ۲"} /></div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4"><button onClick={onClose} className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50">انصراف</button><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}ذخیره</button></div>
      </div>
    </div>
  );
}
