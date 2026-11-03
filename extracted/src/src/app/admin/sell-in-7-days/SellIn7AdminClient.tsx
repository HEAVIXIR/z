"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BadgeDollarSign,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Crown,
  Eye,
  FileSignature,
  Loader2,
  Phone,
  Pencil,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import { toFa, formatFullPrice, faDate } from "@/lib/format";
import Sell7SettingsCard from "./Sell7SettingsCard";

/* ============================================================
   /admin/sell-in-7-days — admin table of Sell-in-7-Days
   applications. Filter, search, update status, schedule
   inspection, set valuation price, and mark as sold (auto
   computes 1% commission).
   ============================================================ */

type App = {
  id: string;
  trackingCode: string;
  sellerName: string;
  sellerMobile: string;
  sellerEmail: string | null;
  deviceName: string;
  categoryId: string | null;
  brandId: string | null;
  modelName: string | null;
  year: number | null;
  workingHours: number | null;
  condition: string | null;
  province: string | null;
  city: string | null;
  expectedPrice: string | null;
  description: string | null;
  prepaymentPaid: boolean;
  prepaymentAmount: string | null;
  status: string;
  currentStep: number;
  inspectionDate: string | null;
  valuationPrice: string | null;
  salePrice: string | null;
  commissionAmount: string | null;
  soldAt: string | null;
  createdAt: string;
  updatedAt: string;
  brand: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING_PREPAYMENT: { label: "در انتظار پیش‌پرداخت", cls: "bg-amber-100 text-amber-700" },
  PREPAYMENT_PAID: { label: "پیش‌پرداخت پرداخت شد", cls: "bg-emerald-100 text-emerald-700" },
  INSPECTION_SCHEDULED: { label: "کارشناسی برنامه‌ریزی شد", cls: "bg-blue-100 text-blue-700" },
  INSPECTED: { label: "کارشناسی شد", cls: "bg-blue-100 text-blue-700" },
  VALUATION_DONE: { label: "ارزش‌گذاری شد", cls: "bg-purple-100 text-purple-700" },
  LISTED: { label: "ارائه شد", cls: "bg-[#F58220]/15 text-[#F58220]" },
  SOLD: { label: "فروخته شد", cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "لغو شد", cls: "bg-red-100 text-red-700" },
};

const CONDITION_LABELS: Record<string, string> = {
  NEW: "نو",
  USED: "کارکرده",
  REFURBISHED: "بازسازی‌شده",
  FOR_PARTS: "قطعات",
};

export default function SellIn7AdminClient() {
  const [apps, setApps] = useState<App[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<App | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/sell-in-7-days?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setApps(json.data || []);
        setStats(json.stats || {});
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id: string, body: any) => {
    try {
      const res = await fetch(`/api/admin/sell-in-7-days`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert(json.error || "خطا در به‌روزرسانی.");
        return;
      }
      load();
    } catch (e: any) {
      alert(e?.message || "خطای شبکه.");
    }
  };

  const fmtPrice = (p: string | null) =>
    p ? formatFullPrice(BigInt(p)) : "—";

  const statuses = Object.keys(STATUS_CFG);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <Crown className="h-6 w-6 text-[#F58220]" />
          فروش در ۷ روز
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          مدیریت درخواست‌های کمپین فروش تضمینی هویکس
        </p>
      </div>

      {/* FIX-ADMIN-EDITABILITY — campaign pricing knobs (prepayment
          amount + commission rate) editable inline. */}
      <Sell7SettingsCard />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <StatBox label="کل" value={stats.total ?? 0} color="text-zinc-900" />
        <StatBox
          label="در انتظار پیش‌پرداخت"
          value={stats.PENDING_PREPAYMENT ?? 0}
          color="text-amber-600"
        />
        <StatBox
          label="پرداخت‌شده"
          value={(stats.PREPAYMENT_PAID ?? 0) + (stats.INSPECTION_SCHEDULED ?? 0)}
          color="text-emerald-600"
        />
        <StatBox
          label="در کارشناسی"
          value={stats.INSPECTED ?? 0}
          color="text-blue-600"
        />
        <StatBox
          label="ارزش‌گذاری‌شده"
          value={stats.VALUATION_DONE ?? 0}
          color="text-purple-600"
        />
        <StatBox label="فروخته‌شده" value={stats.SOLD ?? 0} color="text-emerald-700" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس کد رهگیری، نام دستگاه، فروشنده یا موبایل..."
            className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pr-9 pl-3 text-sm text-zinc-800 outline-none focus:border-[#F58220] focus:bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1">
          <button
            onClick={() => setStatusFilter("")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              statusFilter === ""
                ? "bg-white text-[#F58220] shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            همه
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === s
                  ? "bg-white text-[#F58220] shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {STATUS_CFG[s].label}
            </button>
          ))}
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
                  <th className="px-4 py-3 text-right font-bold">دستگاه</th>
                  <th className="px-4 py-3 text-right font-bold">فروشنده</th>
                  <th className="px-4 py-3 text-center font-bold">گام</th>
                  <th className="px-4 py-3 text-center font-bold">پیش‌پرداخت</th>
                  <th className="px-4 py-3 text-center font-bold">قیمت فروش</th>
                  <th className="px-4 py-3 text-center font-bold">کارمزد ۱٪</th>
                  <th className="px-4 py-3 text-center font-bold">وضعیت</th>
                  <th className="px-4 py-3 text-center font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {apps.map((a) => {
                  const cfg = STATUS_CFG[a.status] ?? {
                    label: a.status,
                    cls: "bg-zinc-100 text-zinc-500",
                  };
                  const isCancelled = a.status === "CANCELLED";
                  return (
                    <tr key={a.id} className="transition hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F58220]/10 text-[#F58220]">
                            <ClipboardList className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-zinc-800">
                              {a.deviceName}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                              {a.brand?.name ?? "—"} · {a.modelName ?? "—"}
                              {a.year ? ` · ${toFa(a.year)}` : ""}
                            </p>
                            <p
                              dir="ltr"
                              className="mt-0.5 text-right font-mono text-[10px] text-[#F58220]"
                            >
                              {a.trackingCode}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-zinc-800">{a.sellerName}</p>
                        <p className="mt-0.5 flex items-center justify-start gap-1 text-[11px] text-zinc-500">
                          <Phone className="h-3 w-3" />
                          <span dir="ltr">{a.sellerMobile}</span>
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-400">
                          {[a.province, a.city].filter(Boolean).join("، ") || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-black text-zinc-700">
                          {toFa(a.currentStep)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.prepaymentPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> پرداخت شد
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            <AlertCircle className="h-3 w-3" /> پرداخت نشده
                          </span>
                        )}
                        <div className="mt-1 text-[10px] text-zinc-400">
                          {fmtPrice(a.prepaymentAmount)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-zinc-700">
                        {fmtPrice(a.salePrice)}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-emerald-600">
                        {fmtPrice(a.commissionAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.cls}`}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {!a.prepaymentPaid && (
                            <button
                              onClick={() => patch(a.id, { action: "markPrepaid" })}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-500 transition hover:bg-emerald-50"
                              title="تأیید پیش‌پرداخت"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {a.prepaymentPaid && a.status === "PREPAYMENT_PAID" && (
                            <button
                              onClick={() => patch(a.id, { action: "scheduleInspection" })}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-500 transition hover:bg-blue-50"
                              title="زمان‌بندی کارشناسی"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {(a.status === "INSPECTION_SCHEDULED" ||
                            a.status === "PREPAYMENT_PAID") && (
                            <button
                              onClick={() => patch(a.id, { action: "markInspected" })}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-500 transition hover:bg-blue-50"
                              title="کارشناسی انجام شد"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {(a.status === "INSPECTED" ||
                            a.status === "VALUATION_DONE") && (
                            <button
                              onClick={() => setEditing(a)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-purple-500 transition hover:bg-purple-50"
                              title="ثبت ارزش‌گذاری / فروش"
                            >
                              <BadgeDollarSign className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {a.status === "VALUATION_DONE" && (
                            <button
                              onClick={() => patch(a.id, { action: "markListed" })}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#F58220] transition hover:bg-[#F58220]/10"
                              title="ارائه برای فروش"
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {a.status === "LISTED" && (
                            <button
                              onClick={() => setEditing(a)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-500 transition hover:bg-emerald-50"
                              title="ثبت فروش و تسویه"
                            >
                              <FileSignature className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setEditing(a)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                            title="ویرایش"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {!isCancelled && a.status !== "SOLD" && (
                            <button
                              onClick={() => {
                                if (confirm("این درخواست لغو شود؟")) patch(a.id, { action: "cancel" });
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50 hover:text-red-600"
                              title="لغو درخواست"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {apps.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-zinc-400">
                      درخواستی یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <EditModal
          app={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <p className={`text-xl font-black ${color}`}>{toFa(value)}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}

function EditModal({
  app,
  onClose,
  onSaved,
}: {
  app: App;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(app.status);
  const [currentStep, setCurrentStep] = useState(app.currentStep);
  const [inspectionDate, setInspectionDate] = useState(
    app.inspectionDate ? app.inspectionDate.slice(0, 10) : "",
  );
  const [valuationPrice, setValuationPrice] = useState(app.valuationPrice ?? "");
  const [salePrice, setSalePrice] = useState(app.salePrice ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (action?: string) => {
    setSaving(true);
    setError(null);
    try {
      const body: any = {
        id: app.id,
        status,
        currentStep: Number(currentStep),
        valuationPrice: valuationPrice || null,
        salePrice: salePrice || null,
      };
      if (inspectionDate) body.inspectionDate = inspectionDate;
      else body.inspectionDate = null;
      if (action) body.action = action;
      const res = await fetch(`/api/admin/sell-in-7-days`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "خطا در ذخیره.");
        setSaving(false);
        return;
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || "خطای شبکه.");
      setSaving(false);
    }
  };

  const inputCls =
    "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-zinc-900">ویرایش درخواست</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {app.deviceName} ·{" "}
              <span dir="ltr" className="font-mono text-[#F58220]">
                {app.trackingCode}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* Read-only summary */}
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-zinc-50 p-3 text-xs">
            <div>
              <div className="text-zinc-400">فروشنده</div>
              <div className="mt-0.5 font-bold text-zinc-800">{app.sellerName}</div>
              <div className="mt-0.5 text-zinc-500" dir="ltr">
                {app.sellerMobile}
              </div>
            </div>
            <div>
              <div className="text-zinc-400">موقعیت</div>
              <div className="mt-0.5 font-bold text-zinc-800">
                {[app.province, app.city].filter(Boolean).join("، ") || "—"}
              </div>
              <div className="mt-0.5 text-zinc-500">
                {app.brand?.name ?? "—"} · {app.modelName ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-zinc-400">قیمت پیشنهادی</div>
              <div className="mt-0.5 font-bold text-zinc-800">
                {app.expectedPrice ? formatFullPrice(BigInt(app.expectedPrice)) : "—"}
              </div>
            </div>
            <div>
              <div className="text-zinc-400">پیش‌پرداخت</div>
              <div className="mt-0.5 font-bold text-zinc-800">
                {app.prepaymentPaid
                  ? `${app.prepaymentAmount ? formatFullPrice(BigInt(app.prepaymentAmount)) : ""} ✓`
                  : "پرداخت نشده"}
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <div>
            <label className={labelCls}>وضعیت</label>
            <select
              className={inputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {Object.entries(STATUS_CFG).map(([v, cfg]) => (
                <option key={v} value={v}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>گام (۱ تا ۴)</label>
              <select
                className={inputCls}
                value={currentStep}
                onChange={(e) => setCurrentStep(Number(e.target.value))}
              >
                {[1, 2, 3, 4].map((s) => (
                  <option key={s} value={s}>
                    گام {toFa(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>تاریخ کارشناسی</label>
              <input
                type="date"
                className={inputCls}
                dir="ltr"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>قیمت کارشناسی (تومان)</label>
            <input
              className={inputCls}
              dir="ltr"
              inputMode="numeric"
              value={valuationPrice}
              onChange={(e) => setValuationPrice(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="مثال: 8500000000"
            />
            {valuationPrice && (
              <p className="mt-1 text-[11px] text-zinc-400">
                {formatFullPrice(BigInt(valuationPrice))}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>قیمت فروش نهایی (تومان)</label>
            <input
              className={inputCls}
              dir="ltr"
              inputMode="numeric"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="مثال: 9000000000"
            />
            {salePrice && (
              <p className="mt-1 text-[11px] text-zinc-400">
                {formatFullPrice(BigInt(salePrice))} · کارمزد ۱٪ ={" "}
                {formatFullPrice(BigInt(salePrice) / 100n)}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600">
              {error}
            </div>
          )}

          {app.description && (
            <div className="rounded-xl bg-zinc-50 p-3 text-xs leading-6 text-zinc-600">
              <div className="mb-1 font-bold text-zinc-500">توضیحات فروشنده:</div>
              {app.description}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50"
          >
            انصراف
          </button>
          <button
            onClick={() => save("markValuationDone")}
            disabled={saving}
            className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
          >
            ثبت ارزش‌گذاری
          </button>
          <button
            onClick={() => save("markSold")}
            disabled={saving || !salePrice}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            ثبت فروش + کارمزد ۱٪
          </button>
        </div>
      </div>
    </div>
  );
}

void Eye;
void faDate;
