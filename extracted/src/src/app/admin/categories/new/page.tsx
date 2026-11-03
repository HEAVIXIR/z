"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Loader2,
  Save,
  FolderPlus,
  ChevronLeft,
  CheckCircle2,
  Link2,
  AlertCircle,
} from "lucide-react";
import MediaUploader from "@/components/admin/MediaUploader";

type RootCategory = {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  layer?: string;
};

const LAYERS = [
  { value: "CATALOG", label: "CATALOG — کاتالوگ" },
  { value: "MARKETPLACE", label: "MARKETPLACE — بازار" },
  { value: "SERVICE", label: "SERVICE — خدمت" },
  { value: "FALLBACK", label: "FALLBACK — پیش‌فرض" },
];

/** Convert a string into a URL-safe slug. */
function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\-ا-ی]/g, "") // keep word chars, hyphens, Persian letters
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewCategoryPage() {
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [parentId, setParentId] = useState("");
  const [layer, setLayer] = useState("CATALOG");
  const [domain, setDomain] = useState("");
  const [icon, setIcon] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  const [roots, setRoots] = useState<RootCategory[]>([]);
  const [loadingRoots, setLoadingRoots] = useState(true);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/taxonomy/categories?root=true")
      .then((r) => r.json())
      .then((d) => {
        const list: RootCategory[] = d.categories || d.flat || [];
        setRoots(list);
      })
      .catch(() => {})
      .finally(() => setLoadingRoots(false));
  }, []);

  // Auto-generate slug from nameEn (preferred) or name, unless user has edited it
  const autoSlug = useMemo(() => {
    const src = nameEn.trim() || name.trim();
    return src ? slugify(src) : "";
  }, [nameEn, name]);

  const effectiveSlug = slugTouched ? slug : autoSlug;

  const canSubmit = name.trim().length > 0 && !saving;

  const submit = async () => {
    setSaving(true);
    setMsg(null);
    setError(null);
    setCreatedId(null);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        nameEn: nameEn.trim() || null,
        slug: effectiveSlug || undefined,
        parentId: parentId || null,
        layer,
        domain: domain.trim() || null,
        icon: icon.trim() || null,
        imageUrl: imageUrl || null,
        description: description.trim() || null,
        featured,
        sortOrder: Number(sortOrder) || 0,
        active: true,
        showOnHome: true,
      };
      const res = await fetch("/api/taxonomy/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.ok) {
        setMsg("✓ دسته با موفقیت ساخته شد");
        setCreatedId(d.category?.id ?? null);
        // Reset form
        setName("");
        setNameEn("");
        setSlug("");
        setSlugTouched(false);
        setParentId("");
        setLayer("CATALOG");
        setDomain("");
        setIcon("");
        setImageUrl(null);
        setDescription("");
        setFeatured(false);
        setSortOrder(0);
      } else {
        setError("خطا: " + (d.error || "نامشخص"));
      }
    } catch {
      setError("خطای شبکه");
    }
    setSaving(false);
  };

  const inputCls =
    "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/admin/taxonomy" className="hover:text-[#F58220]">
            تاکسونومی
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <Link href="/admin/categories" className="hover:text-[#F58220]">
            دسته‌ها
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span>دستهٔ جدید</span>
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-zinc-900">
          <FolderPlus className="h-6 w-6 text-[#F58220]" />
          ساختن دستهٔ جدید
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          فرم ساخت دسته با لایه‌بندی HBR-1.0 — نام، اسلاگ، والد، لایه و
          متادیتا.
        </p>
      </div>

      {msg && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <span>{msg}</span>
          <Link
            href="/admin/categories"
            className="mr-auto inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white transition hover:bg-emerald-700"
          >
            بازگشت به فهرست دسته‌ها
            <ChevronLeft className="h-3 w-3" />
          </Link>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* Identity */}
          <Section title="هویت دسته">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>
                  نام (فارسی) <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً: لودر"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>نام انگلیسی</label>
                <input
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Wheel Loader"
                  className={inputCls}
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>اسلاگ (URL)</label>
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 shrink-0 text-zinc-400" />
                <input
                  value={effectiveSlug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  placeholder="auto-generated"
                  className={`${inputCls} dir-ltr`}
                  dir="ltr"
                />
                {slugTouched && (
                  <button
                    type="button"
                    onClick={() => {
                      setSlugTouched(false);
                      setSlug("");
                    }}
                    className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-bold text-zinc-500 transition hover:bg-zinc-50"
                  >
                    خودکار
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-400">
                از نام انگلیسی یا فارسی به‌صورت خودکار ساخته می‌شود. قابل
                ویرایش است.
              </p>
            </div>

            <div>
              <label className={labelCls}>توضیحات</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیح کوتاه دربارهٔ این دسته..."
                className={`${inputCls} h-24 resize-none py-2`}
              />
            </div>
          </Section>

          {/* Hierarchy & layer */}
          <Section title="ساختار و لایه">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>دستهٔ والد</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className={inputCls}
                  disabled={loadingRoots}
                >
                  <option value="">
                    {loadingRoots
                      ? "در حال بارگذاری..."
                      : "— بدون والد (ریشه) —"}
                  </option>
                  {roots.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.nameEn ? ` (${r.nameEn})` : ""}
                      {r.layer ? ` · ${r.layer}` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] text-zinc-400">
                  فقط دسته‌های ریشه (سطح ۰) نمایش داده می‌شوند. سطح دستهٔ
                  جدید به‌صورت خودکار از والد محاسبه می‌شود.
                </p>
              </div>
              <div>
                <label className={labelCls}>لایه</label>
                <select
                  value={layer}
                  onChange={(e) => setLayer(e.target.value)}
                  className={inputCls}
                >
                  {LAYERS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] text-zinc-400">
                  CATALOG = کاتالوگ ماشین‌آلات · MARKETPLACE = بازار · SERVICE
                  = خدمت · FALLBACK = پیش‌فرض.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>دامنه (Domain)</label>
                <input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="مثلاً: heavy-machinery"
                  className={inputCls}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelCls}>ترتیب نمایش</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className={inputCls}
                  dir="ltr"
                />
              </div>
            </div>
          </Section>

          {/* Display */}
          <Section title="نمایش و آیکون">
            <div>
              <label className={labelCls}>آیکون (اموجی یا متن)</label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="مثلاً: 🚜 یا loader"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>تصویر دسته</label>
              <MediaUploader
                value={imageUrl}
                onChange={(v) => setImageUrl(v)}
                endpoint="/api/admin/upload"
                hint="اختیاری — تصویر شاخص برای کارت دسته."
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#F58220]"
              />
              <div>
                <div className="text-sm font-bold text-zinc-800">
                  دستهٔ ویژه
                </div>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  دسته‌های ویژه در بخش‌های برجسته سایت نمایش داده می‌شوند.
                </p>
              </div>
            </label>
          </Section>

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              ساختن دسته
            </button>
            <Link
              href="/admin/categories"
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50"
            >
              انصراف
            </Link>
            {createdId && (
              <span className="text-xs text-zinc-400">
                شناسهٔ دسته: <code className="text-[#F58220]">{createdId}</code>
              </span>
            )}
          </div>
        </div>

        {/* Side summary */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-black text-zinc-700">
              خلاصهٔ ورودی
            </h3>
            <dl className="space-y-2.5 text-xs">
              <Row k="نام" v={name || "—"} />
              <Row k="نام انگلیسی" v={nameEn || "—"} ltr />
              <Row k="اسلاگ" v={effectiveSlug || "—"} ltr />
              <Row
                k="والد"
                v={
                  parentId
                    ? roots.find((r) => r.id === parentId)?.name || "—"
                    : "ریشه (سطح ۰)"
                }
              />
              <Row k="لایه" v={layer} ltr />
              <Row k="دامنه" v={domain || "—"} ltr />
              <Row k="آیکون" v={icon || "—"} />
              <Row k="ترتیب" v={String(sortOrder)} ltr />
              <Row k="ویژه" v={featured ? "بله" : "خیر"} />
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-black text-zinc-700">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({
  k,
  v,
  ltr,
}: {
  k: string;
  v: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
      <dt className="shrink-0 font-bold text-zinc-500">{k}</dt>
      <dd
        className={`max-w-[60%] truncate text-left font-bold text-zinc-800 ${
          ltr ? "" : ""
        }`}
        dir={ltr ? "ltr" : "rtl"}
      >
        {v}
      </dd>
    </div>
  );
}
