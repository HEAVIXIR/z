"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  Save,
  FileText,
  Eye,
  Pencil,
  Check,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

/* ============================================================
   /admin/content-factory — AI Content Factory
   Input topic + category → generate draft → preview →
   save as draft via /api/admin/articles.
   ============================================================ */

const CATEGORY_LABELS: Record<string, string> = {
  GUIDE: "راهنما",
  COMPARISON: "مقایسه",
  REVIEW: "نقد و بررسی",
  NEWS: "اخبار",
  TUTORIAL: "آموزش",
};

const SUGGESTED_TOPICS = [
  "راهنمای خرید بیل مکانیکی برای معدن",
  "مقایسهٔ لودرهای کوماتسو و کاترپیلار",
  "نکات نگهداری از گریدر در فصل سرد",
  "انتخاب بین اجاره و خرید بولدوزر",
  "معرفی برندهای چینی ماشین‌آلات سنگین",
];

type Draft = {
  title: string;
  excerpt: string | null;
  content: string;
  tags: string | null;
  category: string;
};

export default function AIContentFactoryPage() {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("GUIDE");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"preview" | "edit">("preview");

  // Save state
  const [saving, setSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const generate = async () => {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setError(null);
    setDraft(null);
    setSavedSlug(null);
    setSaveError(null);

    try {
      const res = await fetch("/api/admin/ai-content-factory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), category }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "خطا در تولید محتوا");
      }
      setDraft(json.draft);
      setMode("preview");
    } catch (e: any) {
      setError(e?.message ?? "خطای ناشناخته");
    } finally {
      setGenerating(false);
    }
  };

  const saveAsDraft = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setSaveError(null);
    setSavedSlug(null);

    try {
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          excerpt: draft.excerpt,
          content: draft.content,
          category: draft.category,
          tags: draft.tags,
          status: "DRAFT",
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "خطا در ذخیرهٔ پیش‌نویس");
      }
      const slug = json.article?.slug ?? null;
      setSavedSlug(slug);
    } catch (e: any) {
      setSaveError(e?.message ?? "خطای ناشناخته");
    } finally {
      setSaving(false);
    }
  };

  const setDraftField = (k: keyof Draft, v: string) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const inputCls =
    "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Sparkles className="h-6 w-6 text-[#F58220]" />
            کارخانهٔ محتوای هوش مصنوعی
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            با یک ایده، یک مقالهٔ حرفه‌ای فارسی تولید کنید — سپس ویرایش و
            انتشار دهید.
          </p>
        </div>
        <Link
          href="/admin/articles"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:border-[#F58220] hover:text-[#F58220]"
        >
          <FileText className="h-4 w-4" />
          مدیریت مقالات
        </Link>
      </div>

      {/* Generator panel */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto]">
          <div>
            <label className={labelCls}>موضوع مقاله</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") generate();
              }}
              placeholder="مثلاً: راهنمای خرید بیل مکانیکی برای معدن"
              maxLength={300}
              className={inputCls}
              dir="rtl"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTED_TOPICS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTopic(s)}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-600 transition hover:border-[#F58220]/40 hover:text-[#F58220]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>نوع مقاله</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputCls}
            >
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={generate}
              disabled={!topic.trim() || generating}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-40 lg:w-auto"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              تولید محتوا
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Draft preview / editor */}
      {draft && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4">
            <div className="flex gap-1 p-1">
              <button
                onClick={() => setMode("preview")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  mode === "preview"
                    ? "bg-white text-[#F58220] shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                پیش‌نمایش
              </button>
              <button
                onClick={() => setMode("edit")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  mode === "edit"
                    ? "bg-white text-[#F58220] shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <Pencil className="h-3.5 w-3.5" />
                ویرایش
              </button>
            </div>
            <div className="flex items-center gap-2 py-2">
              {savedSlug && (
                <Link
                  href={`/knowledge/${savedSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Check className="h-3.5 w-3.5" />
                  ذخیره شد — مشاهده
                </Link>
              )}
              <button
                type="button"
                onClick={saveAsDraft}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-4 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                ذخیره به‌عنوان پیش‌نویس
              </button>
            </div>
          </div>

          {saveError && (
            <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {mode === "edit" ? (
            <div className="space-y-4 p-5">
              <div>
                <label className={labelCls}>عنوان</label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraftField("title", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>خلاصه</label>
                <input
                  value={draft.excerpt ?? ""}
                  onChange={(e) =>
                    setDraftField("excerpt", e.target.value)
                  }
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>دسته</label>
                  <select
                    value={draft.category}
                    onChange={(e) =>
                      setDraftField("category", e.target.value)
                    }
                    className={inputCls}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>برچسب‌ها (با کامما)</label>
                  <input
                    value={draft.tags ?? ""}
                    onChange={(e) =>
                      setDraftField("tags", e.target.value)
                    }
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>محتوا (Markdown)</label>
                <textarea
                  value={draft.content}
                  onChange={(e) =>
                    setDraftField("content", e.target.value)
                  }
                  rows={20}
                  dir="rtl"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs leading-6 text-zinc-800 outline-none focus:border-[#F58220]"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
              {/* Article preview */}
              <article
                dir="rtl"
                className="prose prose-zinc max-w-none p-6 prose-headings:font-black prose-headings:text-zinc-900 prose-h2:mt-6 prose-h2:border-b prose-h2:border-zinc-100 prose-h2:pb-2 prose-p:leading-7 prose-li:leading-6"
              >
                <h1 className="mb-2 text-2xl font-black text-zinc-900">
                  {draft.title}
                </h1>
                {draft.excerpt && (
                  <p className="text-sm font-medium text-zinc-500">
                    {draft.excerpt}
                  </p>
                )}
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h2>{children}</h2>,
                  }}
                >
                  {draft.content}
                </ReactMarkdown>
              </article>

              {/* Meta sidebar */}
              <aside className="border-r border-zinc-100 bg-zinc-50 p-5">
                <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-zinc-500">
                  متادیتا
                </h3>
                <dl className="space-y-3 text-xs">
                  <div>
                    <dt className="text-zinc-400">نوع</dt>
                    <dd className="mt-0.5 font-bold text-zinc-800">
                      {CATEGORY_LABELS[draft.category] ?? draft.category}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-400">طول محتوا</dt>
                    <dd className="mt-0.5 font-bold text-zinc-800">
                      {draft.content.length.toLocaleString("fa-IR")} کاراکتر
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-400">برچسب‌ها</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {(draft.tags ?? "")
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-[#F58220]/10 px-2 py-0.5 text-[10px] font-bold text-[#F58220]"
                          >
                            {t}
                          </span>
                        ))}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-700">
                  این محتوا توسط هوش مصنوعی تولید شده است. پیش از انتشار،
                  آن را بازبینی و در صورت نیاز ویرایش کنید.
                </div>

                <Link
                  href="/admin/articles"
                  className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-[#F58220] hover:underline"
                >
                  رفتن به مدیریت مقالات
                  <ArrowRight className="h-3 w-3 rotate-180" />
                </Link>
              </aside>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!draft && !generating && !error && (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-16 text-center">
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-zinc-300" />
          <p className="text-sm text-zinc-500">
            یک موضوع وارد کنید و «تولید محتوا» را بزنید تا پیش‌نویس مقاله
            توسط هوش مصنوعی ساخته شود.
          </p>
        </div>
      )}
    </div>
  );
}
