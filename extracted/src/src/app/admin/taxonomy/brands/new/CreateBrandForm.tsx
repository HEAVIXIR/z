"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Save,
  Loader2,
  Star,
  AlertCircle,
  CheckCircle2,
  Globe,
} from "lucide-react";

/* ============================================================
   CreateBrandForm — mirror of the Identity tab in
   BrandControlCenter. POSTs to /api/taxonomy/brands and
   redirects to /admin/taxonomy/brands/[id] on success.
   ============================================================ */

const TYPE_OPTIONS = [
  "MANUFACTURER",
  "DISTRIBUTOR",
  "DEALER",
  "RESELLER",
  "OEM",
  "IMPORTER",
  "EXPORTER",
  "WHOLESALER",
  "RETAILER",
  "SERVICE_PROVIDER",
  "RENTAL_COMPANY",
  "TRADING_COMPANY",
  "SUBSIDIARY",
  "JOINT_VENTURE",
  "PRIVATE_LABEL",
];

const STATUS_OPTIONS = [
  "ACTIVE",
  "INACTIVE",
  "DRAFT",
  "PENDING",
  "ARCHIVED",
  "DISCONTINUED",
  "LEGACY",
  "HISTORICAL",
  "ACQUIRED",
  "MERGED",
  "BANKRUPT",
];

const VERIFICATION_OPTIONS = [
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "DISPUTED",
  "REJECTED",
];

const EMPTY_FORM = {
  name: "",
  nameEn: "",
  shortName: "",
  slug: "",
  type: "",
  status: "ACTIVE",
  verification: "UNVERIFIED",
  country: "",
  description: "",
  logoUrl: "",
  website: "",
  featured: false,
  active: true,
  sortOrder: 0,
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

export default function CreateBrandForm() {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (k: string, v: any) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "nameEn" && !slugEdited) {
        next.slug = slugifyEn(v);
      }
      return next;
    });
  };

  const submit = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError("نام برند الزامی است.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/taxonomy/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          nameEn: form.nameEn.trim() || null,
          shortName: form.shortName.trim() || null,
          slug: form.slug.trim() || undefined,
          type: form.type || null,
          status: form.status,
          verification: form.verification,
          country: form.country.trim() || null,
          description: form.description.trim() || null,
          logoUrl: form.logoUrl.trim() || null,
          website: form.website.trim() || null,
          featured: form.featured,
          active: form.active,
          sortOrder: Number(form.sortOrder) || 0,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "ذخیره ناموفق بود.");
      }
      // Redirect to the brand control center for the newly created brand.
      const newId = json?.brand?.id;
      if (newId) {
        router.push(`/admin/taxonomy/brands/${newId}`);
      } else {
        router.push("/admin/taxonomy/brands");
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "خطا در ذخیره.");
      setSaving(false);
    }
  };

  const inputCls =
    "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link
            href="/admin/taxonomy/brands"
            className="inline-flex items-center gap-1 hover:text-[#F58220]"
          >
            <ArrowRight className="h-3 w-3" />
            بازگشت به فهرست برندها
          </Link>
        </div>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-zinc-900">
          <Building2 className="h-6 w-6 text-[#F58220]" />
          برند جدید
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          ایجاد برند جدید — پس از ذخیره، به پنل کامل مدیریت برند هدایت می‌شوید.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-[#F58220]" />
          <h2 className="text-lg font-black text-zinc-900">مشخصات هویتی</h2>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {/* Name (full width on its own row) */}
          <div className="md:col-span-2">
            <label className={labelCls}>نام برند *</label>
            <input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className={inputCls}
              placeholder="مثلاً کوماتسو"
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>نام انگلیسی</label>
            <input
              value={form.nameEn}
              onChange={(e) => setField("nameEn", e.target.value)}
              className={inputCls}
              dir="ltr"
              placeholder="Komatsu"
            />
          </div>

          <div>
            <label className={labelCls}>نام کوتاه</label>
            <input
              value={form.shortName}
              onChange={(e) => setField("shortName", e.target.value)}
              className={inputCls}
              dir="ltr"
              placeholder="KOM"
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>اسلاگ (URL)</label>
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
            <label className={labelCls}>نوع</label>
            <select
              value={form.type}
              onChange={(e) => setField("type", e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>کشور</label>
            <input
              value={form.country}
              onChange={(e) => setField("country", e.target.value)}
              className={inputCls}
              placeholder="Japan"
            />
          </div>

          <div>
            <label className={labelCls}>وضعیت</label>
            <select
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
              className={inputCls}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>تأیید</label>
            <select
              value={form.verification}
              onChange={(e) => setField("verification", e.target.value)}
              className={inputCls}
            >
              {VERIFICATION_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>وب‌سایت</label>
            <input
              value={form.website}
              onChange={(e) => setField("website", e.target.value)}
              className={inputCls}
              dir="ltr"
              placeholder="https://"
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>لوگو (URL)</label>
            <input
              value={form.logoUrl}
              onChange={(e) => setField("logoUrl", e.target.value)}
              className={inputCls}
              dir="ltr"
              placeholder="https://..."
            />
            {form.logoUrl && (
              <div className="mt-2 inline-flex overflow-hidden rounded-xl border border-zinc-200">
                <img
                  src={form.logoUrl}
                  alt="logo preview"
                  className="h-16 w-16 object-contain"
                />
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>توضیحات</label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
              placeholder="معرفی کوتاه برند..."
            />
          </div>

          <div>
            <label className={labelCls}>ترتیب نمایش</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setField("sortOrder", Number(e.target.value))}
              className={inputCls}
              dir="ltr"
            />
          </div>

          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setField("featured", e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              <Star className="h-4 w-4 text-amber-500" />
              ویژه
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setField("active", e.target.checked)}
                className="h-4 w-4 accent-[#F58220]"
              />
              <CheckCircle2 className="h-4 w-4 text-[#F58220]" />
              فعال
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
          <Link
            href="/admin/taxonomy/brands"
            className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50"
          >
            انصراف
          </Link>
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "در حال ذخیره..." : "ایجاد برند"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
        <Globe className="h-4 w-4 text-zinc-400" />
        پس از ایجاد، می‌توانید در پنل مدیریت برند: alias‌ها، صنایع، دامنه‌ها،
        دسته‌بندی‌ها، مدل‌ها، رسانه، SEO و نمایش را ویرایش کنید.
      </div>
    </div>
  );
}
