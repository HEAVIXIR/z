"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Trash2,
  Plus,
  GitBranch,
  ShieldCheck,
  Clock,
  XCircle,
  Eye,
  Upload,
  Building2,
  BadgeCheck,
  Crown,
  Send,
  Pencil,
} from "lucide-react";
import { toFa, faDate, timeAgo } from "@/lib/format";

type Doc = {
  id: string;
  type: string;
  url: string;
  status: string;
  verifiedBy: string;
  verifiedAt: string | null;
  createdAt: string;
};

type Branch = {
  id: string;
  name: string;
  address: string;
  cityId: string;
  cityName: string | null;
  provinceName: string | null;
  phone: string;
  isHeadquarters: boolean;
  active: boolean;
  createdAt: string;
};

type Verification = {
  id: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string;
  notes: string;
};

type Listing = {
  id: string;
  slug: string;
  title: string;
  price: string | null;
  status: string;
  province: string;
  city: string;
  publishedAt: string | null;
  featured: boolean;
};

type City = {
  id: string;
  name: string;
  province: { id: string; name: string };
};

type Initial = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  coverImage: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  verified: boolean;
  premium: boolean;
  status: string;
  metaTitle: string;
  metaDescription: string;
  viewCount: number;
  createdAt: string;
  documents: Doc[];
  branches: Branch[];
  verifications: Verification[];
  listings: Listing[];
  listingsCount: number;
  documentsCount: number;
  branchesCount: number;
  verificationsCount: number;
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "فعال",
  PENDING: "در انتظار",
  SUSPENDED: "معلق",
  ARCHIVED: "بایگانی",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  BUSINESS_LICENSE: "مجوز کسب‌وکار",
  TAX_CERT: "گواهی مالیاتی",
  OWNERSHIP_PROOF: "سند مالکیت",
  REPRESENTATIVE_ID: "هویت نماینده",
  BANK_STATEMENT: "صورتحساب بانکی",
  OTHER: "سایر",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  VERIFIED: "تأیید شده",
  REJECTED: "رد شده",
};

const DOC_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

const VER_STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  UNDER_REVIEW: "در حال بررسی",
  VERIFIED: "تأیید شده",
  REJECTED: "رد شده",
};

const VER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function CompanyDetailClient({
  initial,
  cities,
}: {
  initial: Initial;
  cities: City[];
}) {
  const router = useRouter();

  // Company profile form state
  const [profile, setProfile] = useState({
    name: initial.name,
    description: initial.description,
    website: initial.website,
    phone: initial.phone,
    email: initial.email,
    address: initial.address,
    city: initial.city,
    province: initial.province,
    logoUrl: initial.logoUrl,
    status: initial.status,
    verified: initial.verified,
    premium: initial.premium,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [profileOk, setProfileOk] = useState(false);

  // Documents
  const [documents, setDocuments] = useState<Doc[]>(initial.documents);
  const [newDoc, setNewDoc] = useState({ type: "BUSINESS_LICENSE", url: "" });
  const [docBusy, setDocBusy] = useState<string | null>(null);
  const [docAdding, setDocAdding] = useState(false);

  // Branches
  const [branches, setBranches] = useState<Branch[]>(initial.branches);
  const [newBranch, setNewBranch] = useState({
    name: "",
    address: "",
    cityId: "",
    phone: "",
    isHeadquarters: false,
  });
  const [branchAdding, setBranchAdding] = useState(false);
  const [branchBusy, setBranchBusy] = useState<string | null>(null);

  // Verifications
  const [verifications, setVerifications] = useState<Verification[]>(
    initial.verifications,
  );
  const [verBusy, setVerBusy] = useState<string | null>(null);
  const [verSubmitting, setVerSubmitting] = useState(false);
  const [verNotes, setVerNotes] = useState("");

  const [globalErr, setGlobalErr] = useState<string | null>(null);

  const inputCls =
    "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-600";
  const cardCls =
    "rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4";

  /* ── Profile save ── */
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileErr(null);
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/admin/companies/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          description: profile.description || null,
          website: profile.website || null,
          phone: profile.phone || null,
          email: profile.email || null,
          address: profile.address || null,
          city: profile.city || null,
          province: profile.province || null,
          logoUrl: profile.logoUrl || null,
          status: profile.status,
          verified: profile.verified,
          premium: profile.premium,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "ذخیره ناموفق بود.");
      }
      setProfileOk(true);
      setTimeout(() => setProfileOk(false), 2000);
      router.refresh();
    } catch (e: any) {
      setProfileErr(e?.message ?? "خطا در ذخیره.");
    } finally {
      setSavingProfile(false);
    }
  }

  /* ── Documents ── */
  async function addDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!newDoc.url.trim()) return;
    setDocAdding(true);
    setGlobalErr(null);
    try {
      const res = await fetch(`/api/admin/companies/${initial.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newDoc.type, url: newDoc.url.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "افزودن سند ناموفق بود.");
      }
      const data = await res.json();
      setDocuments((prev) => [
        {
          id: data.document.id,
          type: data.document.type,
          url: data.document.url,
          status: data.document.status,
          verifiedBy: data.document.verifiedBy ?? "",
          verifiedAt: data.document.verifiedAt
            ? new Date(data.document.verifiedAt).toISOString()
            : null,
          createdAt: new Date(data.document.createdAt).toISOString(),
        },
        ...prev,
      ]);
      setNewDoc({ type: "BUSINESS_LICENSE", url: "" });
      router.refresh();
    } catch (e: any) {
      setGlobalErr(e?.message ?? "خطا در افزودن سند.");
    } finally {
      setDocAdding(false);
    }
  }

  async function reviewDocument(docId: string, status: "VERIFIED" | "REJECTED") {
    setDocBusy(docId);
    setGlobalErr(null);
    try {
      const res = await fetch(
        `/api/admin/companies/${initial.id}/documents/${docId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, verifiedBy: "admin" }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "بررسی سند ناموفق بود.");
      }
      const data = await res.json();
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                status: data.document.status,
                verifiedBy: data.document.verifiedBy ?? "admin",
                verifiedAt: data.document.verifiedAt
                  ? new Date(data.document.verifiedAt).toISOString()
                  : null,
              }
            : d,
        ),
      );
      router.refresh();
    } catch (e: any) {
      setGlobalErr(e?.message ?? "خطا در بررسی سند.");
    } finally {
      setDocBusy(null);
    }
  }

  async function deleteDocument(docId: string) {
    if (!confirm("حذف این سند؟")) return;
    setDocBusy(docId);
    setGlobalErr(null);
    try {
      const res = await fetch(
        `/api/admin/companies/${initial.id}/documents/${docId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("حذف ناموفق بود.");
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      router.refresh();
    } catch (e: any) {
      setGlobalErr(e?.message ?? "خطا در حذف سند.");
    } finally {
      setDocBusy(null);
    }
  }

  /* ── Branches ── */
  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!newBranch.name.trim()) return;
    setBranchAdding(true);
    setGlobalErr(null);
    try {
      const res = await fetch(`/api/admin/companies/${initial.id}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBranch.name.trim(),
          address: newBranch.address || null,
          cityId: newBranch.cityId || null,
          phone: newBranch.phone || null,
          isHeadquarters: newBranch.isHeadquarters,
          active: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "افزودن شعبه ناموفق بود.");
      }
      const data = await res.json();
      const city = cities.find((c) => c.id === data.branch.cityId);
      setBranches((prev) => [
        {
          id: data.branch.id,
          name: data.branch.name,
          address: data.branch.address ?? "",
          cityId: data.branch.cityId ?? "",
          cityName: city?.name ?? null,
          provinceName: city?.province?.name ?? null,
          phone: data.branch.phone ?? "",
          isHeadquarters: data.branch.isHeadquarters,
          active: data.branch.active,
          createdAt: new Date(data.branch.createdAt).toISOString(),
        },
        // demote any existing HQ if new one is HQ
        ...(newBranch.isHeadquarters
          ? prev.map((b) => (b.isHeadquarters ? { ...b, isHeadquarters: false } : b))
          : prev),
      ]);
      setNewBranch({ name: "", address: "", cityId: "", phone: "", isHeadquarters: false });
      router.refresh();
    } catch (e: any) {
      setGlobalErr(e?.message ?? "خطا در افزودن شعبه.");
    } finally {
      setBranchAdding(false);
    }
  }

  async function deleteBranch(branchId: string) {
    if (!confirm("حذف این شعبه؟")) return;
    setBranchBusy(branchId);
    setGlobalErr(null);
    try {
      const res = await fetch(
        `/api/admin/companies/${initial.id}/branches/${branchId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("حذف ناموفق بود.");
      setBranches((prev) => prev.filter((b) => b.id !== branchId));
      router.refresh();
    } catch (e: any) {
      setGlobalErr(e?.message ?? "خطا در حذف شعبه.");
    } finally {
      setBranchBusy(null);
    }
  }

  async function toggleBranchActive(b: Branch) {
    setBranchBusy(b.id);
    setGlobalErr(null);
    try {
      const res = await fetch(
        `/api/admin/companies/${initial.id}/branches/${b.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !b.active }),
        },
      );
      if (!res.ok) throw new Error("به‌روزرسانی ناموفق بود.");
      setBranches((prev) =>
        prev.map((x) => (x.id === b.id ? { ...x, active: !x.active } : x)),
      );
    } catch (e: any) {
      setGlobalErr(e?.message ?? "خطا در به‌روزرسانی شعبه.");
    } finally {
      setBranchBusy(null);
    }
  }

  /* ── Verifications ── */
  async function submitVerification() {
    setVerSubmitting(true);
    setGlobalErr(null);
    try {
      const res = await fetch(
        `/api/admin/companies/${initial.id}/verifications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: verNotes.trim() || null }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "ثبت درخواست ناموفق بود.");
      }
      const data = await res.json();
      setVerifications((prev) => [
        {
          id: data.verification.id,
          status: data.verification.status,
          submittedAt: new Date(data.verification.submittedAt).toISOString(),
          reviewedAt: data.verification.reviewedAt
            ? new Date(data.verification.reviewedAt).toISOString()
            : null,
          reviewedBy: data.verification.reviewedBy ?? "",
          notes: data.verification.notes ?? "",
        },
        ...prev,
      ]);
      setVerNotes("");
      router.refresh();
    } catch (e: any) {
      setGlobalErr(e?.message ?? "خطا در ثبت درخواست تأییدیه.");
    } finally {
      setVerSubmitting(false);
    }
  }

  async function reviewVerification(
    verId: string,
    status: "UNDER_REVIEW" | "VERIFIED" | "REJECTED",
  ) {
    setVerBusy(verId);
    setGlobalErr(null);
    try {
      const res = await fetch(
        `/api/admin/companies/${initial.id}/verifications/${verId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, reviewedBy: "admin" }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "به‌روزرسانی ناموفق بود.");
      }
      const data = await res.json();
      setVerifications((prev) =>
        prev.map((v) =>
          v.id === verId
            ? {
                ...v,
                status: data.verification.status,
                reviewedAt: data.verification.reviewedAt
                  ? new Date(data.verification.reviewedAt).toISOString()
                  : null,
                reviewedBy: data.verification.reviewedBy ?? "admin",
              }
            : v,
        ),
      );
      // If approved/rejected, also reflect on profile.verified
      if (status === "VERIFIED") {
        setProfile((p) => ({ ...p, verified: true }));
      } else if (status === "REJECTED") {
        setProfile((p) => ({ ...p, verified: false }));
      }
      router.refresh();
    } catch (e: any) {
      setGlobalErr(e?.message ?? "خطا در بررسی درخواست تأییدیه.");
    } finally {
      setVerBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {globalErr && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{globalErr}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Profile card ── */}
        <form onSubmit={saveProfile} className={cardCls}>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-lg font-black text-zinc-900">اطلاعات شرکت</h2>
            {initial.verified && (
              <BadgeCheck className="h-4 w-4 text-emerald-500" />
            )}
            {initial.premium && <Crown className="h-4 w-4 text-amber-500" />}
          </div>

          {profileErr && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {profileErr}
            </div>
          )}

          <div>
            <label className={labelCls}>نام شرکت</label>
            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>توضیحات</label>
            <textarea
              value={profile.description}
              onChange={(e) =>
                setProfile({ ...profile, description: e.target.value })
              }
              rows={3}
              className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-[#F58220]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>تلفن</label>
              <input
                value={profile.phone}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
                className={inputCls}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>ایمیل</label>
              <input
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
                className={inputCls}
                dir="ltr"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>استان</label>
              <input
                value={profile.province}
                onChange={(e) =>
                  setProfile({ ...profile, province: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>شهر</label>
              <input
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>آدرس</label>
            <input
              value={profile.address}
              onChange={(e) =>
                setProfile({ ...profile, address: e.target.value })
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>وب‌سایت</label>
            <input
              value={profile.website}
              onChange={(e) =>
                setProfile({ ...profile, website: e.target.value })
              }
              className={inputCls}
              dir="ltr"
            />
          </div>
          <div>
            <label className={labelCls}>URL لوگو</label>
            <input
              value={profile.logoUrl}
              onChange={(e) =>
                setProfile({ ...profile, logoUrl: e.target.value })
              }
              className={inputCls}
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>وضعیت</label>
              <select
                value={profile.status}
                onChange={(e) =>
                  setProfile({ ...profile, status: e.target.value })
                }
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
                  checked={profile.verified}
                  onChange={(e) =>
                    setProfile({ ...profile, verified: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#F58220]"
                />
                تأیید شده
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                <input
                  type="checkbox"
                  checked={profile.premium}
                  onChange={(e) =>
                    setProfile({ ...profile, premium: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#F58220]"
                />
                ویژه (Premium)
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
          >
            {savingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : profileOk ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {savingProfile ? "در حال ذخیره..." : profileOk ? "ذخیره شد!" : "ذخیره"}
          </button>
        </form>

        {/* ── Verification timeline ── */}
        <div className={cardCls}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-lg font-black text-zinc-900">
              چرخه‌حیات تأییدیه
            </h2>
          </div>

          {/* Submit new verification */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <label className={labelCls}>ثبت درخواست تأییدیه جدید</label>
            <textarea
              value={verNotes}
              onChange={(e) => setVerNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-[#F58220]"
              placeholder="یادداشت (اختیاری)..."
            />
            <button
              type="button"
              onClick={submitVerification}
              disabled={verSubmitting}
              className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 text-xs font-bold text-white transition hover:bg-zinc-700 disabled:opacity-60"
            >
              {verSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              ثبت درخواست
            </button>
          </div>

          {/* Timeline */}
          {verifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400">
              هنوز درخواست تأییدیه‌ای ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-3">
              {verifications.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl border border-zinc-200 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        VER_STATUS_COLORS[v.status] ?? "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {VER_STATUS_LABELS[v.status] ?? v.status}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {timeAgo(v.submittedAt)}
                    </span>
                  </div>
                  {v.notes && (
                    <p className="mt-2 text-xs text-zinc-600">{v.notes}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-zinc-400">
                    <span>ارسال: {faDate(v.submittedAt)}</span>
                    {v.reviewedAt && (
                      <span>· بررسی: {faDate(v.reviewedAt)}</span>
                    )}
                    {v.reviewedBy && <span>· توسط: {v.reviewedBy}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.status === "PENDING" && (
                      <button
                        onClick={() => reviewVerification(v.id, "UNDER_REVIEW")}
                        disabled={verBusy === v.id}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-zinc-200 px-2 text-[10px] font-bold text-zinc-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-60"
                      >
                        {verBusy === v.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        شروع بررسی
                      </button>
                    )}
                    {(v.status === "PENDING" || v.status === "UNDER_REVIEW") && (
                      <>
                        <button
                          onClick={() => reviewVerification(v.id, "VERIFIED")}
                          disabled={verBusy === v.id}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-200 px-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          تأیید
                        </button>
                        <button
                          onClick={() => reviewVerification(v.id, "REJECTED")}
                          disabled={verBusy === v.id}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-red-200 px-2 text-[10px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          <XCircle className="h-3 w-3" />
                          رد
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Documents ── */}
      <div className={cardCls}>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#F58220]" />
          <h2 className="text-lg font-black text-zinc-900">مدارک</h2>
          <span className="text-xs text-zinc-400">
            ({toFa(documents.length)})
          </span>
        </div>

        <form
          onSubmit={addDocument}
          className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[180px_1fr_auto]"
        >
          <select
            value={newDoc.type}
            onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
            className={inputCls}
          >
            {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input
            value={newDoc.url}
            onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })}
            className={inputCls}
            dir="ltr"
            placeholder="https://example.com/doc.pdf"
          />
          <button
            type="submit"
            disabled={docAdding || !newDoc.url.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#F58220] px-4 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
          >
            {docAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            افزودن سند
          </button>
        </form>

        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400">
            هنوز سندی ثبت نشده است.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-right font-bold">نوع</th>
                  <th className="px-3 py-2 text-right font-bold">URL</th>
                  <th className="px-3 py-2 text-center font-bold">وضعیت</th>
                  <th className="px-3 py-2 text-center font-bold">تاریخ</th>
                  <th className="px-3 py-2 text-center font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {documents.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 text-xs font-bold text-zinc-700">
                      {DOC_TYPE_LABELS[d.type] ?? d.type}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-zinc-500" dir="ltr">
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-[#F58220]"
                      >
                        <Eye className="h-3 w-3" />
                        {d.url.length > 50 ? d.url.slice(0, 50) + "..." : d.url}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          DOC_STATUS_COLORS[d.status] ?? "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {DOC_STATUS_LABELS[d.status] ?? d.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-[10px] text-zinc-400">
                      {faDate(d.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        {d.status !== "VERIFIED" && (
                          <button
                            onClick={() => reviewDocument(d.id, "VERIFIED")}
                            disabled={docBusy === d.id}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                            title="تأیید"
                          >
                            {docBusy === d.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                        {d.status !== "REJECTED" && (
                          <button
                            onClick={() => reviewDocument(d.id, "REJECTED")}
                            disabled={docBusy === d.id}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                            title="رد"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteDocument(d.id)}
                          disabled={docBusy === d.id}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-60"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Branches ── */}
      <div className={cardCls}>
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-[#F58220]" />
          <h2 className="text-lg font-black text-zinc-900">شعبه‌ها</h2>
          <span className="text-xs text-zinc-400">
            ({toFa(branches.length)})
          </span>
        </div>

        <form
          onSubmit={addBranch}
          className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"
        >
          <input
            value={newBranch.name}
            onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
            className={inputCls}
            placeholder="نام شعبه"
          />
          <input
            value={newBranch.address}
            onChange={(e) =>
              setNewBranch({ ...newBranch, address: e.target.value })
            }
            className={inputCls}
            placeholder="آدرس"
          />
          <select
            value={newBranch.cityId}
            onChange={(e) =>
              setNewBranch({ ...newBranch, cityId: e.target.value })
            }
            className={inputCls}
          >
            <option value="">— شهر —</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.province.name} — {c.name}
              </option>
            ))}
          </select>
          <input
            value={newBranch.phone}
            onChange={(e) =>
              setNewBranch({ ...newBranch, phone: e.target.value })
            }
            className={inputCls}
            dir="ltr"
            placeholder="تلفن"
          />
          <button
            type="submit"
            disabled={branchAdding || !newBranch.name.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#F58220] px-4 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
          >
            {branchAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            افزودن
          </button>
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 sm:col-span-2 lg:col-span-5">
            <input
              type="checkbox"
              checked={newBranch.isHeadquarters}
              onChange={(e) =>
                setNewBranch({ ...newBranch, isHeadquarters: e.target.checked })
              }
              className="h-4 w-4 accent-[#F58220]"
            />
            شعبه مرکزی
          </label>
        </form>

        {branches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400">
            هنوز شعبه‌ای ثبت نشده است.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-right font-bold">نام</th>
                  <th className="px-3 py-2 text-right font-bold">موقعیت</th>
                  <th className="px-3 py-2 text-right font-bold">تلفن</th>
                  <th className="px-3 py-2 text-center font-bold">نوع</th>
                  <th className="px-3 py-2 text-center font-bold">فعال</th>
                  <th className="px-3 py-2 text-center font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 text-xs font-bold text-zinc-700">
                      {b.name}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-zinc-500">
                      {b.provinceName && <div>{b.provinceName}</div>}
                      {b.cityName && <div>{b.cityName}</div>}
                      {b.address && <div className="text-[10px] text-zinc-400">{b.address}</div>}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-zinc-500" dir="ltr">
                      {b.phone || "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {b.isHeadquarters ? (
                        <span className="inline-block rounded-full bg-[#F58220]/15 px-2 py-0.5 text-[10px] font-bold text-[#F58220]">
                          مرکزی
                        </span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => toggleBranchActive(b)}
                        disabled={branchBusy === b.id}
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold transition disabled:opacity-60 ${
                          b.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {b.active ? "فعال" : "غیرفعال"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => deleteBranch(b.id)}
                          disabled={branchBusy === b.id}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-red-500 hover:bg-red-50 disabled:opacity-60"
                          title="حذف"
                        >
                          {branchBusy === b.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent listings ── */}
      <div className={cardCls}>
        <div className="flex items-center gap-2">
          <Pencil className="h-5 w-5 text-[#F58220]" />
          <h2 className="text-lg font-black text-zinc-900">آگهی‌های شرکت</h2>
          <span className="text-xs text-zinc-400">
            ({toFa(initial.listingsCount)})
          </span>
        </div>
        {initial.listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400">
            این شرکت هنوز آگهی ندارد.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-right font-bold">عنوان</th>
                  <th className="px-3 py-2 text-right font-bold">موقعیت</th>
                  <th className="px-3 py-2 text-center font-bold">وضعیت</th>
                  <th className="px-3 py-2 text-center font-bold">تاریخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {initial.listings.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 text-xs font-bold text-zinc-700">
                      <Link
                        href={`/admin/listings/${l.id}/edit`}
                        className="hover:text-[#F58220]"
                      >
                        {l.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-zinc-500">
                      {l.province} {l.city ? `· ${l.city}` : ""}
                    </td>
                    <td className="px-3 py-2 text-center text-[10px] text-zinc-500">
                      {l.status}
                    </td>
                    <td className="px-3 py-2 text-center text-[10px] text-zinc-400">
                      {l.publishedAt ? faDate(l.publishedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
