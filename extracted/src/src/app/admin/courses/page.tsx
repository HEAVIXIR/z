"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Loader2,
  RefreshCw,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { toFa, timeAgo } from "@/lib/format";

/* ============================================================
   /admin/courses — Manage HEAVIX Academy courses + lessons.
   ============================================================ */

type Lesson = {
  id?: string;
  title: string;
  content?: string;
  videoUrl?: string;
  sortOrder: number;
};

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  level: string;
  duration: number;
  coverImage: string | null;
  status: string;
  createdAt: string;
  lessonCount?: number;
};

const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "مقدماتی",
  INTERMEDIATE: "متوسط",
  ADVANCED: "پیشرفته",
};
const STATUS: { value: string; label: string }[] = [
  { value: "DRAFT", label: "پیش‌نویس" },
  { value: "PUBLISHED", label: "منتشر شده" },
  { value: "ARCHIVED", label: "بایگانی" },
];

const empty = {
  title: "",
  slug: "",
  description: "",
  category: "",
  level: "BEGINNER",
  duration: 0,
  coverImage: "",
  status: "PUBLISHED",
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses");
      const json = await res.json();
      setCourses(json.courses || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const reset = () => {
    setForm({ ...empty });
    setLessons([]);
    setEditId(null);
    setShowForm(false);
  };

  const edit = (c: Course) => {
    setEditId(c.id);
    setForm({
      title: c.title,
      slug: c.slug,
      description: c.description ?? "",
      category: c.category ?? "",
      level: c.level,
      duration: c.duration,
      coverImage: c.coverImage ?? "",
      status: c.status,
    });
    setShowForm(true);
    // Load full lessons for this course
    fetch(`/api/courses/${c.slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.course?.lessons) {
          setLessons(
            json.course.lessons.map((l: any) => ({
              id: l.id,
              title: l.title,
              content: l.content ?? "",
              videoUrl: l.videoUrl ?? "",
              sortOrder: l.sortOrder,
            })),
          );
        }
      })
      .catch(() => {});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast("عنوان دوره الزامی است");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: editId,
          duration: Number(form.duration) || 0,
          lessons,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast(editId ? "دوره به‌روزرسانی شد ✓" : "دوره ساخته شد ✓");
        reset();
        await load();
      } else {
        showToast(json.error ?? "خطا");
      }
    } catch {
      showToast("خطا در ارتباط با سرور");
    }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm("آیا از حذف این دوره مطمئن هستید؟")) return;
    try {
      await fetch(`/api/admin/courses?id=${id}`, { method: "DELETE" });
      showToast("دوره حذف شد");
      await load();
    } catch {
      showToast("خطا در حذف");
    }
  };

  const addLesson = () => {
    setLessons((p) => [
      ...p,
      { title: "", content: "", videoUrl: "", sortOrder: p.length },
    ]);
  };

  const updateLesson = (i: number, field: keyof Lesson, value: string) => {
    setLessons((p) =>
      p.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)),
    );
  };

  const removeLesson = (i: number) => {
    setLessons((p) => p.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <BookOpen className="h-6 w-6 text-[#F58220]" />
            آکادمی هویکس
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            مدیریت دوره‌های آموزشی و درس‌های هر دوره
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            به‌روزرسانی
          </button>
          <button
            onClick={() => {
              reset();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2 text-xs font-bold text-white hover:bg-[#ff8c38]"
          >
            <Plus className="h-4 w-4" />
            دوره جدید
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-sm font-black text-zinc-900">
            {editId ? "ویرایش دوره" : "افزودن دوره جدید"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="عنوان دوره *">
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </Field>
            <Field label="اسلاگ (خالی = خودکار)">
              <input
                type="text"
                dir="ltr"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto-generated"
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </Field>
            <Field label="دسته (اختیاری)">
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="مثلاً: خرید و فروش"
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </Field>
            <Field label="سطح">
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABEL[l]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="مدت زمان کل (دقیقه)">
              <input
                type="number"
                min="0"
                dir="ltr"
                value={form.duration}
                onChange={(e) =>
                  setForm({ ...form, duration: Number(e.target.value) })
                }
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </Field>
            <Field label="وضعیت">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              >
                {STATUS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="تصویر کاور (URL)">
              <input
                type="url"
                dir="ltr"
                value={form.coverImage}
                onChange={(e) =>
                  setForm({ ...form, coverImage: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </Field>
          </div>
          <Field label="توضیحات">
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
            />
          </Field>

          {/* Lessons */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-black text-zinc-700">
                درس‌های دوره ({toFa(lessons.length)})
              </h3>
              <button
                type="button"
                onClick={addLesson}
                className="inline-flex items-center gap-1 rounded-lg bg-[#F58220] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#ff8c38]"
              >
                <Plus className="h-3.5 w-3.5" />
                افزودن درس
              </button>
            </div>
            <div className="space-y-3">
              {lessons.map((l, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-200 bg-white p-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#F58220]/10 text-[11px] font-bold text-[#F58220]">
                      {toFa(i + 1)}
                    </span>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={l.title}
                        onChange={(e) => updateLesson(i, "title", e.target.value)}
                        placeholder="عنوان درس"
                        className="h-9 w-full rounded border border-zinc-200 px-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
                      />
                      <input
                        type="url"
                        dir="ltr"
                        value={l.videoUrl}
                        onChange={(e) => updateLesson(i, "videoUrl", e.target.value)}
                        placeholder="آدرس ویدیو (اختیاری)"
                        className="h-9 w-full rounded border border-zinc-200 px-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        value={l.content ?? ""}
                        onChange={(e) => updateLesson(i, "content", e.target.value)}
                        placeholder="محتوای متنی درس"
                        className="w-full resize-none rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLesson(i)}
                      className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {lessons.length === 0 && (
                <p className="text-xs text-zinc-400">
                  هنوز درسی اضافه نشده — می‌توانید بعداً اضافه کنید.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-xs font-bold text-white hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {editId ? "ذخیره تغییرات" : "ساخت دوره"}
            </button>
          </div>
        </form>
      )}

      {/* Courses list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">هنوز دوره‌ای ساخته نشده.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <div
              key={c.id}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              <div className="aspect-[16/9] bg-gradient-to-br from-zinc-100 to-zinc-200">
                {c.coverImage ? (
                  <img
                    src={c.coverImage}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <BookOpen className="h-8 w-8 text-zinc-300" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-[#F58220]/10 px-2 py-0.5 text-[10px] font-bold text-[#F58220]">
                    {LEVEL_LABEL[c.level] ?? c.level}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      c.status === "PUBLISHED"
                        ? "bg-emerald-100 text-emerald-700"
                        : c.status === "DRAFT"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {STATUS.find((s) => s.value === c.status)?.label ?? c.status}
                  </span>
                </div>
                <h3 className="truncate text-sm font-black text-zinc-900">
                  {c.title}
                </h3>
                <p className="mt-1 text-[10px] text-zinc-400">
                  {toFa(c.lessonCount ?? 0)} درس · {timeAgo(c.createdAt)}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
                  <a
                    href={`/academy/${c.slug}`}
                    target="_blank"
                    className="text-[11px] font-bold text-[#F58220] hover:underline"
                  >
                    مشاهده
                  </a>
                  <div className="flex gap-1">
                    <button
                      onClick={() => edit(c)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-[#F58220]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => del(c.id)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-zinc-500">{label}</label>
      {children}
    </div>
  );
}
