"use client";

import { useState } from "react";
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  Save,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { toFa, faDate } from "@/lib/format";
import MediaUploader from "@/components/admin/MediaUploader";

type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  coverImage: string;
  status: string;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  GUIDE: "راهنمای خرید",
  NEWS: "اخبار",
  REVIEW: "نقد و بررسی",
  EDUCATION: "آموزشی",
  INDUSTRY: "صنعت",
};

const CATEGORIES = ["GUIDE", "NEWS", "REVIEW", "EDUCATION", "INDUSTRY"];

export default function ArticlesClient({
  articles,
  stats,
}: {
  articles: Article[];
  stats: { total: number; published: number; draft: number };
}) {
  const [list, setList] = useState<Article[]>(articles);
  const [editing, setEditing] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const newArticle = (): Article => ({
    id: `new-${Date.now()}`,
    slug: "",
    title: "",
    excerpt: "",
    content: "",
    category: "GUIDE",
    tags: "",
    coverImage: "",
    status: "DRAFT",
    viewCount: 0,
    publishedAt: null,
    createdAt: new Date().toISOString(),
  });

  const save = async (a: Article) => {
    setLoading(true);
    setError(null);
    try {
      const isNew = a.id.startsWith("new-");
      const res = await fetch(
        isNew ? "/api/admin/articles" : `/api/admin/articles/${a.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(a),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "ذخیره ناموفق بود.");
      }
      const saved = await res.json();
      if (isNew) {
        setList([{ ...saved, ...saved }, ...list]);
      } else {
        setList(list.map((x) => (x.id === a.id ? { ...a, ...saved } : x)));
      }
      setEditing(null);
    } catch (e: any) {
      setError(e?.message ?? "خطا در ذخیره.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("آیا از حذف این مقاله مطمئن هستید؟")) return;
    try {
      await fetch(`/api/admin/articles/${id}`, { method: "DELETE" });
      setList(list.filter((x) => x.id !== id));
    } catch {
      setError("حذف ناموفق بود.");
    }
  };

  const bulkAction = async (action: string) => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: selected }),
      });
      setList(
        list.map((a) =>
          selected.includes(a.id)
            ? {
                ...a,
                status:
                  action === "publish"
                    ? "PUBLISHED"
                    : action === "draft"
                      ? "DRAFT"
                      : action === "archive"
                        ? "ARCHIVED"
                        : a.status,
              }
            : a,
        ),
      );
      setSelected([]);
    } catch {
      setError("عملیات گروهی ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">مقالات</h1>
          <p className="mt-1 text-sm text-zinc-500">
            کل: {toFa(stats.total)} · منتشرشده: {toFa(stats.published)} · پیش‌نویس:{" "}
            {toFa(stats.draft)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(newArticle())}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
        >
          <Plus className="h-4 w-4" />
          مقالهٔ جدید
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <span className="text-xs font-bold text-zinc-700">
            {toFa(selected.length)} انتخاب‌شده
          </span>
          <button
            type="button"
            onClick={() => bulkAction("publish")}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
          >
            انتشار
          </button>
          <button
            type="button"
            onClick={() => bulkAction("draft")}
            disabled={loading}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600"
          >
            پیش‌نویس
          </button>
          <button
            type="button"
            onClick={() => bulkAction("archive")}
            disabled={loading}
            className="rounded-lg bg-zinc-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-600"
          >
            بایگانی
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100"
          >
            لغو انتخاب
          </button>
        </div>
      )}

      {/* Articles table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  onChange={(e) =>
                    setSelected(e.target.checked ? list.map((a) => a.id) : [])
                  }
                  checked={selected.length === list.length && list.length > 0}
                  className="h-4 w-4 rounded border-zinc-300"
                />
              </th>
              <th className="px-4 py-3 text-right font-bold">عنوان</th>
              <th className="px-4 py-3 text-right font-bold">دسته</th>
              <th className="px-4 py-3 text-right font-bold">وضعیت</th>
              <th className="px-4 py-3 text-right font-bold">بازدید</th>
              <th className="px-4 py-3 text-right font-bold">تاریخ</th>
              <th className="px-4 py-3 text-center font-bold">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {list.map((a) => (
              <tr key={a.id} className="hover:bg-zinc-50">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(a.id)}
                    onChange={() => toggleSelect(a.id)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 shrink-0 text-zinc-400" />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-zinc-900">{a.title}</p>
                      <p className="truncate text-[11px] text-zinc-400" dir="ltr">
                        {a.slug}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {CATEGORY_LABELS[a.category] ?? a.category}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      a.status === "PUBLISHED"
                        ? "bg-emerald-100 text-emerald-700"
                        : a.status === "DRAFT"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {a.status === "PUBLISHED"
                      ? "منتشرشده"
                      : a.status === "DRAFT"
                        ? "پیش‌نویس"
                        : a.status === "ARCHIVED"
                          ? "بایگانی"
                          : a.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">{toFa(a.viewCount)}</td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {faDate(a.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <a
                      href={`/knowledge/${a.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-[#F58220] hover:text-[#F58220]"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setEditing(a)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-[#F58220] hover:text-[#F58220]"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
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
                  مقاله‌ای یافت نشد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <ArticleModal
          article={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          loading={loading}
        />
      )}
    </div>
  );
}

function ArticleModal({
  article,
  onClose,
  onSave,
  loading,
}: {
  article: Article;
  onClose: () => void;
  onSave: (a: Article) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<Article>(article);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-5 text-xl font-black text-zinc-900">
          {article.id.startsWith("new-") ? "مقالهٔ جدید" : "ویرایش مقاله"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-zinc-700">
              عنوان
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">
                Slug (نامک)
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                dir="ltr"
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">
                دسته
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-zinc-700">
              خلاصه (Excerpt)
            </label>
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-zinc-700">
              محتوا (Markdown)
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={10}
              dir="ltr"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-xs text-zinc-900 outline-none focus:border-[#F58220]"
              placeholder="# عنوان...&#10;## زیر عنوان...&#10;- مورد 1&#10;- مورد 2"
            />
            <p className="mt-1 text-[10px] text-zinc-400">
              از Markdown استفاده کنید: # H1, ## H2, ### H3, - لیست, &gt; نقل قول
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">
                تگ‌ها (با کاما جدا کنید)
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">
                تصویر کاور
              </label>
              <MediaUploader
                value={form.coverImage}
                onChange={(v) => setForm({ ...form, coverImage: v ?? "" })}
                endpoint="/api/admin/upload"
                hint="تصویر کاور در صفحه مقاله و کارت‌های مقالات نمایش داده می‌شود."
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-zinc-700">وضعیت</label>
            <div className="grid grid-cols-3 gap-2">
              {["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, status: s })}
                  className={`h-10 rounded-xl text-xs font-bold transition ${
                    form.status === s
                      ? "bg-[#F58220] text-white"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {s === "DRAFT" ? "پیش‌نویس" : s === "PUBLISHED" ? "منتشرشده" : "بایگانی"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
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
              disabled={loading || !form.title.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : form.status === "PUBLISHED" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              ذخیره
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
