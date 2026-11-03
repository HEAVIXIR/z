"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  Pencil,
  Eye,
  Trash2,
  X,
  Save,
  AlertCircle,
  UserPlus,
  Mail,
  Phone,
  ShieldCheck,
  ShieldX,
  Clock,
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";

/* ============================================================
   /admin/users — real users table.

   Features:
     • Search by name / mobile / email / companyName
     • Filter by role, status, emailVerified, mobileVerified
     • Sort by createdAt / lastLoginAt / listings count
     • Stats bar (total, active, pending, verified email/mobile, listings)
     • Row actions: ویرایش (modal), جزئیات (link), حذف (confirm)
     • Verification deadline shown with red highlight if expired
   ============================================================ */

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  userType: string;
  status: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  companyName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  listingsCount: number;
  offersCount: number;
  requestsCount: number;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "مدیر",
  SELLER: "فروشنده",
  BUYER: "خریدار",
  INDIVIDUAL: "فرد",
};

const ROLE_CLS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  SELLER: "bg-amber-100 text-amber-700",
  BUYER: "bg-blue-100 text-blue-700",
  INDIVIDUAL: "bg-zinc-100 text-zinc-600",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "فعال",
  PENDING: "در انتظار",
  BLOCKED: "مسدود",
  REJECTED: "ردشده",
};

const STATUS_CLS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  BLOCKED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
};

/* Verification deadline = createdAt + 7 days (per FIX 7). */
function verificationDeadline(iso: string): Date {
  return new Date(new Date(iso).getTime() + 7 * 24 * 60 * 60 * 1000);
}

function faDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function faDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function AdminUsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [editing, setEditing] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (emailVerifiedFilter === "yes") params.set("emailVerified", "true");
      if (emailVerifiedFilter === "no") params.set("emailVerified", "false");
      if (sort) params.set("sort", sort);
      params.set("limit", "100");
      const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setUsers(json.data ?? []);
        setTotal(json.total ?? 0);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [search, roleFilter, statusFilter, emailVerifiedFilter, sort]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const remove = async (u: User) => {
    if (!confirm(`حذف کاربر «${u.firstName} ${u.lastName}»؟\n\nتوجه: آگهی‌های این کاربر حذف نمی‌شوند (فقط فروشندهٔ آنها null می‌شود). این عمل قابل بازگشت نیست.`)) return;
    try {
      await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      load();
    } catch {
      /* ignore */
    }
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setShowEditModal(true);
  };

  // ── Stats ──
  const stats = {
    total,
    active: users.filter((u) => u.status === "ACTIVE").length,
    pending: users.filter((u) => u.status === "PENDING").length,
    emailVerified: users.filter((u) => u.emailVerified).length,
    mobileVerified: users.filter((u) => u.mobileVerified).length,
    sellers: users.filter((u) => u.userType === "SELLER").length,
  };

  const inputCls =
    "h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220] focus:bg-white";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <UsersIcon className="h-6 w-6 text-[#F58220]" />
            کاربران
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total.toLocaleString("fa-IR")} کاربر ثبت‌شده · {users.length.toLocaleString("fa-IR")} نمایش داده شده
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
        >
          <UserPlus className="h-4 w-4" /> کاربر جدید
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="کل" value={stats.total} icon={<UsersIcon className="h-4 w-4" />} color="text-zinc-700 bg-zinc-100" />
        <StatCard label="فعال" value={stats.active} icon={<CheckCircle2 className="h-4 w-4" />} color="text-emerald-700 bg-emerald-100" />
        <StatCard label="در انتظار" value={stats.pending} icon={<Clock className="h-4 w-4" />} color="text-amber-700 bg-amber-100" />
        <StatCard label="ایمیل تأییدشده" value={stats.emailVerified} icon={<Mail className="h-4 w-4" />} color="text-blue-700 bg-blue-100" />
        <StatCard label="موبایل تأییدشده" value={stats.mobileVerified} icon={<Phone className="h-4 w-4" />} color="text-teal-700 bg-teal-100" />
        <StatCard label="فروشندگان" value={stats.sellers} icon={<Building2 className="h-4 w-4" />} color="text-purple-700 bg-purple-100" />
      </div>

      {/* Toolbar */}
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو: نام، موبایل، ایمیل، شرکت..."
              className={`${inputCls} w-full pr-9`}
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={inputCls}>
            <option value="">همه نقش‌ها</option>
            <option value="ADMIN">مدیر</option>
            <option value="SELLER">فروشنده</option>
            <option value="BUYER">خریدار</option>
            <option value="INDIVIDUAL">فرد</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
            <option value="">همه وضعیت‌ها</option>
            <option value="ACTIVE">فعال</option>
            <option value="PENDING">در انتظار</option>
            <option value="BLOCKED">مسدود</option>
            <option value="REJECTED">ردشده</option>
          </select>
          <select value={emailVerifiedFilter} onChange={(e) => setEmailVerifiedFilter(e.target.value)} className={inputCls}>
            <option value="">تأیید ایمیل: همه</option>
            <option value="yes">تأییدشده</option>
            <option value="no">تأییدنشده</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputCls}>
            <option value="createdAt">جدیدترین</option>
            <option value="lastLoginAt">آخرین ورود</option>
            <option value="name">نام (الفبا)</option>
            <option value="listings">بیشترین آگهی</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-3 text-right font-bold">نام</th>
                  <th className="px-3 py-3 text-right font-bold">موبایل</th>
                  <th className="px-3 py-3 text-right font-bold">ایمیل</th>
                  <th className="px-3 py-3 text-center font-bold">نقش</th>
                  <th className="px-3 py-3 text-center font-bold">وضعیت</th>
                  <th className="px-3 py-3 text-center font-bold">تأیید</th>
                  <th className="px-3 py-3 text-center font-bold">مهلت تأیید</th>
                  <th className="px-3 py-3 text-center font-bold">آگهی</th>
                  <th className="px-3 py-3 text-center font-bold">درخواست</th>
                  <th className="px-3 py-3 text-center font-bold">آخرین ورود</th>
                  <th className="px-3 py-3 text-center font-bold">ثبت‌نام</th>
                  <th className="px-3 py-3 text-center font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((u) => {
                  const deadline = verificationDeadline(u.createdAt);
                  const isExpired = !u.emailVerified && deadline.getTime() < Date.now();
                  const daysLeft = Math.ceil(
                    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                  );
                  return (
                    <tr key={u.id} className="group transition hover:bg-zinc-50">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F58220]/10 text-xs font-black text-[#F58220]">
                            {(u.firstName?.[0] ?? "؟") + (u.lastName?.[0] ?? "")}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-zinc-800">
                              {u.firstName} {u.lastName}
                            </p>
                            {u.companyName && (
                              <p className="truncate text-[10px] text-zinc-400">{u.companyName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <a
                          href={`tel:${u.mobile}`}
                          dir="ltr"
                          className="inline-flex items-center gap-1 text-[12px] font-mono font-bold text-zinc-700 hover:text-[#F58220]"
                        >
                          <Phone className="h-3 w-3 text-zinc-400" />
                          {u.mobile}
                        </a>
                      </td>
                      <td className="px-3 py-3">
                        <a
                          href={`mailto:${u.email}`}
                          dir="ltr"
                          className="block max-w-[180px] truncate text-[12px] text-zinc-600 hover:text-[#F58220]"
                          title={u.email}
                        >
                          {u.email}
                        </a>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            ROLE_CLS[u.userType] ?? "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {ROLE_LABEL[u.userType] ?? u.userType}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            STATUS_CLS[u.status] ?? "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {STATUS_LABEL[u.status] ?? u.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {u.emailVerified ? (
                            <span title="ایمیل تأییدشده" className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span title="ایمیل تأییدنشده" className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-500">
                              <ShieldX className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {u.mobileVerified ? (
                            <span title="موبایل تأییدشده" className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span title="موبایل تأییدنشده" className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-500">
                              <XCircle className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {u.emailVerified ? (
                          <span className="text-[11px] text-zinc-400">تأییدشده</span>
                        ) : isExpired ? (
                          <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                            منقضی
                          </span>
                        ) : (
                          <span
                            className={`text-[11px] font-bold ${
                              daysLeft <= 2 ? "text-red-600" : daysLeft <= 5 ? "text-amber-600" : "text-zinc-500"
                            }`}
                          >
                            {daysLeft.toLocaleString("fa-IR")} روز
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-zinc-700">
                        {u.listingsCount.toLocaleString("fa-IR")}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-zinc-700">
                        {u.requestsCount.toLocaleString("fa-IR")}
                      </td>
                      <td className="px-3 py-3 text-center text-[11px] text-zinc-500">
                        {u.lastLoginAt ? (
                          <span title={faDateTime(u.lastLoginAt)}>
                            {faDate(u.lastLoginAt)}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-[11px] text-zinc-500">
                        {faDate(u.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-[#F58220]/10 hover:text-[#F58220]"
                            title="ویرایش"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-blue-50 hover:text-blue-500"
                            title="جزئیات"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => remove(u)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                            title="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-16 text-center text-zinc-400">
                      <AlertCircle className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
                      کاربری یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && editing && (
        <UserEditModal
          user={editing}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            load();
          }}
        />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <UserCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <p className="text-xl font-black text-zinc-900">{value.toLocaleString("fa-IR")}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}

/* ============================================================
   UserEditModal — edit role/status/verified/companyName/password
   ============================================================ */
function UserEditModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [mobile, setMobile] = useState(user.mobile);
  const [userType, setUserType] = useState(user.userType);
  const [status, setStatus] = useState(user.status);
  const [companyName, setCompanyName] = useState(user.companyName ?? "");
  const [emailVerified, setEmailVerified] = useState(user.emailVerified);
  const [mobileVerified, setMobileVerified] = useState(user.mobileVerified);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        userType,
        status,
        companyName: companyName.trim() || null,
        emailVerified,
        mobileVerified,
      };
      if (password.trim()) payload.password = password.trim();
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.success) {
        onSaved();
      } else {
        setError(d.error ?? "خطا در ذخیره");
      }
    } catch {
      setError("خطای شبکه");
    }
    setSaving(false);
  };

  const inputCls = "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-600";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-zinc-900">ویرایش کاربر</h2>
            <p className="text-xs text-zinc-400" dir="ltr">
              {user.email}
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
              ⚠ {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>نام</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>نام خانوادگی</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>موبایل</label>
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputCls} dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>ایمیل</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} dir="ltr" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>نقش</label>
              <select value={userType} onChange={(e) => setUserType(e.target.value)} className={inputCls}>
                <option value="ADMIN">مدیر</option>
                <option value="SELLER">فروشنده</option>
                <option value="BUYER">خریدار</option>
                <option value="INDIVIDUAL">فرد</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>وضعیت</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="ACTIVE">فعال</option>
                <option value="PENDING">در انتظار</option>
                <option value="BLOCKED">مسدود</option>
                <option value="REJECTED">ردشده</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>نام شرکت (اختیاری)</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${emailVerified ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-white text-zinc-600 hover:border-emerald-200"}`}>
              <input type="checkbox" checked={emailVerified} onChange={(e) => setEmailVerified(e.target.checked)} className="h-4 w-4 accent-emerald-500" />
              <Mail className="h-4 w-4 text-emerald-600" />
              تأیید ایمیل
            </label>
            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${mobileVerified ? "border-teal-300 bg-teal-50 text-teal-700" : "border-zinc-200 bg-white text-zinc-600 hover:border-teal-200"}`}>
              <input type="checkbox" checked={mobileVerified} onChange={(e) => setMobileVerified(e.target.checked)} className="h-4 w-4 accent-teal-600" />
              <Phone className="h-4 w-4 text-teal-600" />
              تأیید موبایل
            </label>
          </div>

          <div>
            <label className={labelCls}>بازنشانی رمز عبور (اختیاری)</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              dir="ltr"
              placeholder="خالی = بدون تغییر"
              type="password"
            />
            <p className="mt-1 text-[10px] text-zinc-400">حداقل ۶ نویسه</p>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50">
            انصراف
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   UserCreateModal — admin creates a new user
   ============================================================ */
function UserCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("BUYER");
  const [status, setStatus] = useState("ACTIVE");
  const [companyName, setCompanyName] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [mobileVerified, setMobileVerified] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          mobile: mobile.trim(),
          password: password.trim(),
          userType,
          status,
          companyName: companyName.trim() || null,
          emailVerified,
          mobileVerified,
        }),
      });
      const d = await res.json();
      if (d.success) {
        onCreated();
      } else {
        setError(d.error ?? "خطا در ایجاد کاربر");
      }
    } catch {
      setError("خطای شبکه");
    }
    setSaving(false);
  };

  const inputCls = "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-600";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <h2 className="text-lg font-black text-zinc-900">کاربر جدید</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
              ⚠ {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>نام *</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>نام خانوادگی *</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>موبایل *</label>
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputCls} dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>ایمیل *</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} dir="ltr" />
            </div>
          </div>

          <div>
            <label className={labelCls}>رمز عبور *</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              dir="ltr"
              type="password"
              placeholder="حداقل ۶ نویسه"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>نقش</label>
              <select value={userType} onChange={(e) => setUserType(e.target.value)} className={inputCls}>
                <option value="ADMIN">مدیر</option>
                <option value="SELLER">فروشنده</option>
                <option value="BUYER">خریدار</option>
                <option value="INDIVIDUAL">فرد</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>وضعیت</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="ACTIVE">فعال</option>
                <option value="PENDING">در انتظار</option>
                <option value="BLOCKED">مسدود</option>
                <option value="REJECTED">ردشده</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>نام شرکت (اختیاری)</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${emailVerified ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-white text-zinc-600"}`}>
              <input type="checkbox" checked={emailVerified} onChange={(e) => setEmailVerified(e.target.checked)} className="h-4 w-4 accent-emerald-500" />
              <Mail className="h-4 w-4" />
              تأیید ایمیل
            </label>
            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${mobileVerified ? "border-teal-300 bg-teal-50 text-teal-700" : "border-zinc-200 bg-white text-zinc-600"}`}>
              <input type="checkbox" checked={mobileVerified} onChange={(e) => setMobileVerified(e.target.checked)} className="h-4 w-4 accent-teal-600" />
              <Phone className="h-4 w-4" />
              تأیید موبایل
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50">
            انصراف
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            ایجاد کاربر
          </button>
        </div>
      </div>
    </div>
  );
}
