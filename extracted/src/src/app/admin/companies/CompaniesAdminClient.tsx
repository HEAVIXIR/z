"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Loader2,
  CheckCircle2,
  Save,
  Trash2,
  Pencil,
  AlertCircle,
  Search,
  BadgeCheck,
  Crown,
  FileText,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import { toFa, faDate } from "@/lib/format";

type LatestVerification = {
  id: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
} | null;

type Company = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  province: string | null;
  verified: boolean;
  premium: boolean;
  status: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  listingsCount: number;
  documentsCount: number;
  branchesCount: number;
  verificationsCount: number;
  latestVerification: LatestVerification;
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "فعال",
  PENDING: "در انتظار",
  SUSPENDED: "معلق",
  ARCHIVED: "بایگانی",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  SUSPENDED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-zinc-200 text-zinc-600",
};

const VER_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  UNDER_REVIEW: "در حال بررسی",
  VERIFIED: "تأیید شده",
  REJECTED: "رد شده",
};

const VER_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  website: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  province: "",
  status: "ACTIVE",
  verified: false,
  premium: false,
  logoUrl: "",
};

function slugifyFa(s: string): string {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export default function CompaniesAdminClient() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterVerified, setFilterVerified] = useState("");
  const [filterQ, setFilterQ] = useState("");

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [slugEdited, setSlugEdited] = useState(false);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterVerified) params.set("verified", filterVerified);
      if (filterQ.trim()) params.set("q", filterQ.trim());
      const res = await fetch(`/api/admin/companies?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setCompanies(data.companies ?? []);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterVerified, filterQ]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "name" && !slugEdited) {
        next.slug = slugifyFa(String(v));
      }
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim()) {
      setErr("نام شرکت الزامی است.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
          description: form.description.trim() || null,
          website: form.website.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          province: form.province.trim() || null,
          status: form.status,
          verified: form.verified,
          premium: form.premium,
          logoUrl: form.logoUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "ذخیره ناموفق بود.");
      }
      const data = await res.json();
      setForm({ ...EMPTY_FORM });
      setSlugEdited(false);
      setCreated(true);
      setTimeout(() => setCreated(false), 2500);
      await loadCompanies();
      router.refresh();
      // navigate to the detail page for the new company
      if (data?.company?.id) {
        router.push(`/admin/companies/${data.company.id}`);
      }
    } catch (e: any) {
      setErr(e?.message ?? "خطا در ذخیره.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(c: Company) {
    if (!confirm(`حذف شرکت «${c.name}»؟ این عمل قابل بازگشت نیست.`)) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/companies/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "حذف ناموفق بود.");
      }
      setCompanies((prev) => prev.filter((x) => x.id !== c.id));
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "خطا در حذف.");
    } finally {
      setBusyId(null);
    }
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-600";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <Building2 className="h-6 w-6 text-[#F58220]" />
          شرکت‌ها
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          مدیریت چرخه‌حیات تأیید شرکت‌ها — مدارک، شعبه‌ها و درخواست‌های
          تأییدیه (P1-17).
        </p>
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Create form */}
        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-lg font-black text-zinc-900">شرکت جدید</h2>
          </div>

          <div>
            <label className={labelCls}>نام شرکت *</label>
            <input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className={inputCls}
              placeholder="مثلاً شرکت صنعتی هویکس"
            />
          </div>
          <div>
            <label className={labelCls}>اسلاگ (URL)</label>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugEdited(true);
                setField("slug", e.target.value);
              }}
              className={inputCls}
              dir="ltr"
              placeholder="auto-generated"
            />
          </div>
          <div>
            <label className={labelCls}>توضیحات</label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
              placeholder="معرفی کوتاه..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>تلفن</label>
              <input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                className={inputCls}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>ایمیل</label>
              <input
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className={inputCls}
                dir="ltr"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>استان</label>
              <input
                value={form.province}
                onChange={(e) => setField("province", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>شهر</label>
              <input
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>آدرس</label>
            <input
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>وب‌سایت</label>
            <input
              value={form.website}
              onChange={(e) => setField("website", e.target.value)}
              className={inputCls}
              dir="ltr"
              placeholder="https://"
            />
          </div>
          <div>
            <label className={labelCls}>URL لوگو</label>
            <input
              value={form.logoUrl}
              onChange={(e) => setField("logoUrl", e.target.value)}
              className={inputCls}
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>وضعیت</label>
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                className={inputCls}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.verified}
                  onChange={(e) => setField("verified", e.target.checked)}
                  className="h-4 w-4 accent-[#F58220]"
                />
                تأیید شده
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.premium}
                  onChange={(e) => setField("premium", e.target.checked)}
                  className="h-4 w-4 accent-[#F58220]"
                />
                ویژه (Premium)
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : created ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {submitting ? "در حال ذخیره..." : created ? "ذخیره شد!" : "افزودن شرکت"}
          </button>
        </form>

        {/* List */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
                placeholder="جستجوی شرکت..."
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-[#F58220]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#F58220]"
            >
              <option value="">همه وضعیت‌ها</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={filterVerified}
              onChange={(e) => setFilterVerified(e.target.value)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#F58220]"
            >
              <option value="">همه</option>
              <option value="true">تأیید شده</option>
              <option value="false">تأیید نشده</option>
            </select>
          </div>

          <p className="text-sm font-bold text-zinc-700">
            {loading ? "در حال بارگذاری..." : `${toFa(companies.length)} شرکت`}
          </p>

          {loading ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-zinc-200 bg-white">
              <Loader2 className="h-5 w-5 animate-spin text-[#F58220]" />
            </div>
          ) : companies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400">
              هنوز شرکتی ثبت نشده است.
            </div>
          ) : (
            <div className="max-h-[700px] overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 text-right font-bold">نام شرکت</th>
                    <th className="px-4 py-3 text-right font-bold">موقعیت</th>
                    <th className="px-4 py-3 text-center font-bold">تأیید</th>
                    <th className="px-4 py-3 text-center font-bold">وضعیت</th>
                    <th className="px-4 py-3 text-center font-bold">مدارک</th>
                    <th className="px-4 py-3 text-center font-bold">شعبه‌ها</th>
                    <th className="px-4 py-3 text-center font-bold">آگهی‌ها</th>
                    <th className="px-4 py-3 text-center font-bold">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {companies.map((c) => {
                    const v = c.latestVerification;
                    return (
                      <tr key={c.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-zinc-900">{c.name}</div>
                            {c.verified && (
                              <BadgeCheck className="h-4 w-4 text-emerald-500" />
                            )}
                            {c.premium && (
                              <Crown className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400" dir="ltr">
                            {c.slug}
                          </div>
                          {v && (
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                VER_COLORS[v.status] ?? "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {VER_LABELS[v.status] ?? v.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-600">
                          {c.province && <div>{c.province}</div>}
                          {c.city && <div className="text-[11px] text-zinc-500">{c.city}</div>}
                          {!c.province && !c.city && (
                            <span className="text-zinc-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {c.verified ? (
                            <ShieldCheck className="mx-auto h-4 w-4 text-emerald-500" />
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              STATUS_COLORS[c.status] ?? "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {STATUS_LABELS[c.status] ?? c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-zinc-700">
                          <span className="inline-flex items-center gap-1">
                            <FileText className="h-3 w-3 text-zinc-400" />
                            {toFa(c.documentsCount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-zinc-700">
                          <span className="inline-flex items-center gap-1">
                            <GitBranch className="h-3 w-3 text-zinc-400" />
                            {toFa(c.branchesCount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-zinc-700">
                          {toFa(c.listingsCount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/admin/companies/${c.id}`}
                              className="flex h-8 items-center justify-center gap-1 rounded-lg border border-zinc-200 px-2 text-xs text-zinc-600 transition hover:border-[#F58220] hover:text-[#F58220]"
                              title="مشاهده / ویرایش"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              ویرایش
                            </Link>
                            <button
                              onClick={() => remove(c)}
                              disabled={busyId === c.id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-red-500 transition hover:bg-red-50 disabled:opacity-60"
                              title="حذف"
                            >
                              {busyId === c.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-zinc-400">
            آخرین به‌روزرسانی: {faDate(new Date())}
          </p>
        </div>
      </div>
    </div>
  );
}
