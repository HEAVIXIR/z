"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderTree,
  Plus,
  Loader2,
  CheckCircle2,
  Save,
  Trash2,
  Globe,
  Building2,
  X,
  AlertCircle,
} from "lucide-react";
import { toFa } from "@/lib/format";

type Family = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  country: string | null;
  sortOrder: number;
  _count: { brands: number };
};

const EMPTY_FORM = {
  name: "",
  nameEn: "",
  slug: "",
  description: "",
  website: "",
  country: "",
  logoUrl: "",
};

function slugifyEn(s: string): string {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function BrandFamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brand-families", { cache: "no-store" });
      const data = await res.json();
      setFamilies(data.families ?? []);
    } catch {
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (k: string, v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      // Auto-generate slug from nameEn if slug hasn't been manually edited.
      if (k === "nameEn" && !slugEdited) {
        next.slug = slugifyEn(v);
      }
      return next;
    });
  };

  const submit = async () => {
    setErr(null);
    if (!form.name.trim()) {
      setErr("نام خانواده الزامی است.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/brand-families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          nameEn: form.nameEn.trim() || null,
          slug: form.slug.trim() || undefined,
          description: form.description.trim() || null,
          website: form.website.trim() || null,
          country: form.country.trim() || null,
          logoUrl: form.logoUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "ذخیره ناموفق بود.");
      }
      setForm({ ...EMPTY_FORM });
      setSlugEdited(false);
      setCreated(true);
      setTimeout(() => setCreated(false), 2500);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "خطا در ذخیره.");
    } finally {
      setCreating(false);
    }
  };

  const inputCls =
    "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <FolderTree className="h-6 w-6 text-[#F58220]" />
          خانواده برندها
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          مدیریت خانواده‌های برند — گروه‌بندی برندهای وابسته به یک شرکت مادر.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Create form */}
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-lg font-black text-zinc-900">خانواده جدید</h2>
          </div>

          {err && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">نام *</label>
            <input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className={inputCls}
              placeholder="مثلاً گروه صنعتی caterpillar"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">نام انگلیسی</label>
            <input
              value={form.nameEn}
              onChange={(e) => setField("nameEn", e.target.value)}
              className={inputCls}
              dir="ltr"
              placeholder="Caterpillar Group"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">اسلاگ (URL)</label>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugEdited(true);
                setField("slug", e.target.value);
              }}
              className={inputCls}
              dir="ltr"
              placeholder="auto-generated from nameEn"
            />
            {!form.slug && form.nameEn && (
              <p className="mt-1 text-[10px] text-zinc-400" dir="ltr">
                پیش‌فرض: {slugifyEn(form.nameEn)}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">توضیحات</label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
              placeholder="توضیحات کوتاه درباره این خانواده..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-500">کشور</label>
              <input
                value={form.country}
                onChange={(e) => setField("country", e.target.value)}
                className={inputCls}
                placeholder="USA"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-500">وب‌سایت</label>
              <input
                value={form.website}
                onChange={(e) => setField("website", e.target.value)}
                className={inputCls}
                dir="ltr"
                placeholder="https://"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">لوگو (URL)</label>
            <input
              value={form.logoUrl}
              onChange={(e) => setField("logoUrl", e.target.value)}
              className={inputCls}
              dir="ltr"
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : created ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {creating ? "در حال ذخیره..." : created ? "ذخیره شد!" : "افزودن خانواده"}
            </button>
          </div>
        </div>

        {/* Families list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-zinc-700">
              {loading ? "در حال بارگذاری..." : `${toFa(families.length)} خانواده ثبت شده`}
            </p>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-zinc-200 bg-white">
              <Loader2 className="h-5 w-5 animate-spin text-[#F58220]" />
            </div>
          ) : families.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400">
              هنوز هیچ خانواده برندی ثبت نشده است.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {families.map((f) => (
                <div
                  key={f.id}
                  className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-[#F58220]/30"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100">
                      {f.logoUrl ? (
                        <img src={f.logoUrl} alt={f.name} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <FolderTree className="h-6 w-6 text-zinc-400" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-black text-zinc-900">{f.name}</h3>
                      {f.nameEn && (
                        <p className="truncate text-xs text-zinc-500" dir="ltr">{f.nameEn}</p>
                      )}
                      <p className="truncate text-[10px] text-zinc-400" dir="ltr">{f.slug}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F58220]/10 px-2 py-0.5 text-[10px] font-bold text-[#F58220]">
                      <Building2 className="h-3 w-3" />
                      {toFa(f._count.brands)} برند
                    </span>
                  </div>

                  {f.description && (
                    <p className="line-clamp-2 text-xs text-zinc-500">{f.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                    {f.country && (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {f.country}
                      </span>
                    )}
                    {f.website && (
                      <a
                        href={f.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 truncate text-[#F58220] hover:underline"
                        dir="ltr"
                      >
                        {f.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>

                  <div className="flex justify-end border-t border-zinc-100 pt-2">
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                      aria-label="حذف"
                      onClick={() => {
                        // Soft placeholder: no DELETE route provided in scope.
                        // Visualizes delete affordance for future work.
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
