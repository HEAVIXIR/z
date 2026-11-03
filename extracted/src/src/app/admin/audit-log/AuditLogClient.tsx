"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
  ScrollText,
  User as UserIcon,
  Cpu,
  ShieldCheck,
  Server,
  Calendar,
} from "lucide-react";

/* ============================================================
   /admin/audit-log — Audit Log viewer (P0-4).

   Features:
     • Filters: actorId, action (contains), entityType,
       entityId, from/to date range.
     • Server-side pagination (limit/offset).
     • Sorted by createdAt DESC.
     • Row click → expandable JSON before/after + meta.
     • Light theme, RTL, matches other admin pages.
   ============================================================ */

type AuditEntry = {
  id: string;
  actorId: string | null;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  reason: string | null;
  createdAt: string;
  actorLabel: string | null;
};

const ACTOR_TYPE_META: Record<
  string,
  { label: string; cls: string; icon: any }
> = {
  USER: { label: "کاربر", cls: "bg-blue-100 text-blue-700", icon: UserIcon },
  ADMIN: { label: "مدیر", cls: "bg-purple-100 text-purple-700", icon: ShieldCheck },
  SYSTEM: { label: "سیستم", cls: "bg-zinc-200 text-zinc-700", icon: Server },
  AI: { label: "هوش مصنوعی", cls: "bg-amber-100 text-amber-700", icon: Cpu },
};

const PAGE_SIZE = 25;

function faDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function tryPrettyJson(s: string | null): string | null {
  if (!s) return null;
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

export default function AuditLogClient() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filter inputs
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Applied filters (committed by button click)
  const [applied, setApplied] = useState({
    actorId: "",
    action: "",
    entityType: "",
    entityId: "",
    from: "",
    to: "",
  });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));
      if (applied.actorId) params.set("actorId", applied.actorId);
      if (applied.action) params.set("action", applied.action);
      if (applied.entityType) params.set("entityType", applied.entityType);
      if (applied.entityId) params.set("entityId", applied.entityId);
      if (applied.from) params.set("from", new Date(applied.from).toISOString());
      if (applied.to) {
        // Include the full end day
        const d = new Date(applied.to);
        d.setHours(23, 59, 59, 999);
        params.set("to", d.toISOString());
      }

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        setError("دسترسی غیرمجاز. لطفاً دوباره وارد شوید.");
        setEntries([]);
        setTotal(0);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "خطا در دریافت لاگ ممیزی");
        setEntries([]);
        setTotal(0);
        return;
      }
      const j = await res.json();
      setEntries(j.data ?? []);
      setTotal(j.total ?? 0);
    } catch (e: any) {
      setError(e?.message ?? "خطا در ارتباط با سرور");
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleApplyFilters = () => {
    setApplied({
      actorId: actorId.trim(),
      action: action.trim(),
      entityType: entityType.trim(),
      entityId: entityId.trim(),
      from,
      to,
    });
    setPage(0);
  };

  const handleResetFilters = () => {
    setActorId("");
    setAction("");
    setEntityType("");
    setEntityId("");
    setFrom("");
    setTo("");
    setApplied({
      actorId: "",
      action: "",
      entityType: "",
      entityId: "",
      from: "",
      to: "",
    });
    setPage(0);
  };

  const hasActiveFilters =
    applied.actorId ||
    applied.action ||
    applied.entityType ||
    applied.entityId ||
    applied.from ||
    applied.to;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <ScrollText className="text-[#F58220]" size={26} />
            لاگ ممیزی
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            ثبت append-only تمامی عملیات حساس سامانه — مطابق HEAVIX-SECURITY-BASELINE
            §10.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600">
          مجموع: <span className="font-bold text-zinc-900">{total.toLocaleString("fa-IR")}</span> رویداد
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Field label="شناسه کنش‌گر (actorId)">
            <input
              type="text"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder="مثلاً cuid کاربر"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#F58220] focus:ring-2 focus:ring-[#F58220]/20"
            />
          </Field>
          <Field label="کنش (action)">
            <input
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="مثلاً listing.publish"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#F58220] focus:ring-2 focus:ring-[#F58220]/20"
            />
          </Field>
          <Field label="نوع موجودیت (entityType)">
            <input
              type="text"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="مثلاً Listing"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#F58220] focus:ring-2 focus:ring-[#F58220]/20"
            />
          </Field>
          <Field label="شناسه موجودیت (entityId)">
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="exact match"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#F58220] focus:ring-2 focus:ring-[#F58220]/20"
            />
          </Field>
          <Field label="از تاریخ">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#F58220] focus:ring-2 focus:ring-[#F58220]/20"
            />
          </Field>
          <Field label="تا تاریخ">
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#F58220] focus:ring-2 focus:ring-[#F58220]/20"
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={handleApplyFilters}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F58220] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ff8c38]"
          >
            <Search size={16} />
            اعمال فیلترها
          </button>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <X size={16} />
            پاک کردن
          </button>
          {hasActiveFilters ? (
            <span className="inline-flex items-center gap-1 self-center text-xs text-amber-700">
              <AlertCircle size={14} />
              فیلتر فعال
            </span>
          ) : null}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-right text-sm">
            <thead className="bg-zinc-50 text-xs font-bold text-zinc-600">
              <tr>
                <th className="border-b border-zinc-200 px-4 py-3">زمان</th>
                <th className="border-b border-zinc-200 px-4 py-3">نوع کنش‌گر</th>
                <th className="border-b border-zinc-200 px-4 py-3">کنش‌گر</th>
                <th className="border-b border-zinc-200 px-4 py-3">کنش</th>
                <th className="border-b border-zinc-200 px-4 py-3">موجودیت</th>
                <th className="border-b border-zinc-200 px-4 py-3">IP</th>
                <th className="border-b border-zinc-200 px-4 py-3">دلیل</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={18} />
                      در حال بارگذاری…
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    هیچ رویدادی یافت نشد.
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const meta = ACTOR_TYPE_META[e.actorType] ?? {
                    label: e.actorType,
                    cls: "bg-zinc-100 text-zinc-600",
                    icon: AlertCircle,
                  };
                  const Icon = meta.icon;
                  const isOpen = expanded === e.id;
                  return (
                    <Fragment key={e.id}>
                      <tr
                        onClick={() => setExpanded(isOpen ? null : e.id)}
                        className={`cursor-pointer border-b border-zinc-100 transition hover:bg-amber-50/40 ${
                          isOpen ? "bg-amber-50/60" : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-600">
                          {faDateTime(e.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.cls}`}
                          >
                            <Icon size={12} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-700">
                          {e.actorLabel ? (
                            <div>
                              <div className="font-semibold">{e.actorLabel}</div>
                              <div className="font-mono text-[10px] text-zinc-400">
                                {e.actorId ?? "—"}
                              </div>
                            </div>
                          ) : (
                            <span className="font-mono text-[11px] text-zinc-500">
                              {e.actorId ?? "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800">
                            {e.action}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-700">
                          <div className="font-semibold">{e.entityType}</div>
                          <div className="font-mono text-[10px] text-zinc-400">
                            {e.entityId ?? "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                          {e.ip ?? "—"}
                        </td>
                        <td className="max-w-[220px] truncate px-4 py-3 text-xs text-zinc-500">
                          {e.reason ?? "—"}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-zinc-50/60">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                              <JsonBlock
                                title="قبل (before)"
                                json={tryPrettyJson(e.beforeJson)}
                              />
                              <JsonBlock
                                title="بعد (after)"
                                json={tryPrettyJson(e.afterJson)}
                              />
                            </div>
                            <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-zinc-600 md:grid-cols-3">
                              <MetaItem label="User-Agent" value={e.userAgent} />
                              <MetaItem label="Request ID" value={e.requestId} />
                              <MetaItem label="Reason" value={e.reason} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-white px-4 py-3">
          <div className="text-xs text-zinc-500">
            صفحه <span className="font-bold text-zinc-800">{(page + 1).toLocaleString("fa-IR")}</span> از{" "}
            <span className="font-bold text-zinc-800">{totalPages.toLocaleString("fa-IR")}</span>
            {" — "}
            نمایش{" "}
            <span className="font-bold text-zinc-800">
              {(entries.length).toLocaleString("fa-IR")}
            </span>{" "}
            از{" "}
            <span className="font-bold text-zinc-800">{total.toLocaleString("fa-IR")}</span>{" "}
            رویداد
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => canPrev && setPage((p) => Math.max(0, p - 1))}
              disabled={!canPrev || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={14} />
              قبلی
            </button>
            <button
              onClick={() => canNext && setPage((p) => p + 1)}
              disabled={!canNext || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              بعدی
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Helper note */}
      <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
        <Calendar size={14} className="mt-0.5 shrink-0" />
        <span>
          لاگ‌ها به‌صورت append-only ذخیره می‌شوند و هرگز به‌روزرسانی یا حذف نمی‌گردند.
          برای فیلتر دقیق‌تر می‌توانید از ترکیب actorId + entityType + entityId استفاده کنید
          تا تاریخچه کامل تغییرات یک موجودیت را مشاهده کنید.
        </span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-zinc-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function JsonBlock({ title, json }: { title: string; json: string | null }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700">
        {title}
      </div>
      <pre className="max-h-72 overflow-auto px-3 py-2 text-[11px] leading-relaxed text-zinc-700">
        {json ?? "—"}
      </pre>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <div className="text-[10px] font-bold uppercase text-zinc-400">{label}</div>
      <div className="mt-1 break-all font-mono text-[11px] text-zinc-700">
        {value ?? "—"}
      </div>
    </div>
  );
}
