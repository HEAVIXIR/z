"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Crown,
  TrendingUp,
  Users,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Star,
} from "lucide-react";
import { toFa, formatCompactPrice, formatFullPrice } from "@/lib/format";

/* ============================================================
   PlansAdminClient — interactive DB-backed plan manager for the
   /admin/subscriptions page (ADMIN-EDIT-CHUNK-D-CONFIG).

   • Fetches /api/admin/subscription-plans on mount
   • Renders each plan as a Card (popular plan highlighted,
     features list parsed from featuresJson, price via toFa)
   • Create button → modal with all fields → POST
   • Edit button per plan → modal pre-filled → PATCH /[id]
   • Delete button per plan → confirm → DELETE /[id] (409 if in use)
   ============================================================ */

type Plan = {
  id: string;
  code: string;
  nameFa: string;
  nameEn: string | null;
  description: string | null;
  priceMonthly: string;
  priceYearly: string | null;
  currency: string;
  featuredCredits: number;
  analyticsAccess: boolean;
  aiAssistantAccess: boolean;
  priorityLeads: boolean;
  companyPage: boolean;
  maxListings: number;
  maxImages: number;
  verifiedBadge: boolean;
  supportLevel: string | null;
  sortOrder: number;
  active: boolean;
  popular: boolean;
  featuresJson: string | null;
  subscriberCount: number;
};

const ICONS: Record<string, any> = {
  BASIC: Users,
  PRO: TrendingUp,
  PREMIUM: Crown,
};

const COLORS: Record<string, { text: string; bg: string; border: string }> = {
  BASIC: {
    text: "text-zinc-700",
    bg: "bg-zinc-100",
    border: "border-zinc-200",
  },
  PRO: {
    text: "text-[#F58220]",
    bg: "bg-[#F58220]/10",
    border: "border-[#F58220]",
  },
  PREMIUM: {
    text: "text-amber-600",
    bg: "bg-amber-100",
    border: "border-amber-200",
  },
};

function parseFeatures(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) {
      return arr.map((x) => (typeof x === "string" ? x : String(x?.label ?? x)));
    }
    if (Array.isArray((arr as any)?.features)) {
      return (arr as any).features.map((x: any) =>
        typeof x === "string" ? x : String(x?.label ?? x),
      );
    }
    return [];
  } catch {
    return [];
  }
}

export default function PlansAdminClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscription-plans", {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) {
        setPlans(json.plans || []);
      } else {
        setError(json.error || "خطا در بارگذاری طرح‌ها");
      }
    } catch (e: any) {
      setError(e?.message ?? "خطای شبکه");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing({
      id: "",
      code: "",
      nameFa: "",
      nameEn: "",
      description: "",
      priceMonthly: "0",
      priceYearly: "",
      currency: "IRR",
      featuredCredits: 0,
      analyticsAccess: false,
      aiAssistantAccess: false,
      priorityLeads: false,
      companyPage: false,
      maxListings: 0,
      maxImages: 8,
      verifiedBadge: false,
      supportLevel: "BASIC",
      sortOrder: plans.length,
      active: true,
      popular: false,
      featuresJson: "[]",
      subscriberCount: 0,
    });
    setShowModal(true);
  };

  const openEdit = (p: Plan) => {
    setEditing({ ...p });
    setShowModal(true);
  };

  const remove = async (p: Plan) => {
    if (
      !confirm(
        `حذف طرح «${p.nameFa}» (کد: ${p.code})؟ این عمل قابل بازگشت نیست.`,
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/subscription-plans/${p.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        await load();
      } else {
        alert(json.error || "حذف ناموفق بود");
      }
    } catch (e: any) {
      alert(e?.message ?? "خطای شبکه");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-zinc-900">
            <Sparkles className="h-5 w-5 text-[#F58220]" />
            طرح‌های اشتراک
          </h2>
          <p className="text-xs text-zinc-500">
            مدیریت کامل طرح‌های پرداختی — قیمت، امکانات و ترتیب نمایش.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            به‌روزرسانی
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#e07418]"
          >
            <Plus className="h-3.5 w-3.5" />
            طرح جدید
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#F58220]" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Crown className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">هنوز طرحی تعریف نشده است.</p>
          <button
            onClick={openNew}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#F58220] px-4 py-2 text-xs font-bold text-white hover:bg-[#e07418]"
          >
            <Plus className="h-4 w-4" />
            ایجاد طرح اول
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const Icon = ICONS[p.code] ?? Star;
            const color = COLORS[p.code] ?? {
              text: "text-zinc-700",
              bg: "bg-zinc-100",
              border: "border-zinc-200",
            };
            const features = parseFeatures(p.featuresJson);
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border bg-white p-5 transition hover:shadow-md ${
                  p.popular
                    ? "border-[#F58220] bg-[#F58220]/5"
                    : "border-zinc-200"
                } ${!p.active ? "opacity-60" : ""}`}
              >
                {p.popular && (
                  <span className="absolute -top-2 right-4 rounded-full bg-[#F58220] px-2.5 py-0.5 text-[10px] font-black text-white shadow">
                    محبوب‌ترین
                  </span>
                )}
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${color.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${color.text}`} />
                  </div>
                  <span
                    className={`rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 ${color.text}`}
                    dir="ltr"
                  >
                    {p.code}
                  </span>
                </div>

                <h3 className="text-base font-black text-zinc-900">
                  {p.nameFa}
                </h3>
                {p.nameEn && (
                  <p className="text-[11px] text-zinc-400" dir="ltr">
                    {p.nameEn}
                  </p>
                )}
                {p.description && (
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {p.description}
                  </p>
                )}

                <div className="mt-3">
                  <span className="text-lg font-black text-zinc-900">
                    {Number(p.priceMonthly) === 0
                      ? "رایگان"
                      : formatFullPrice(p.priceMonthly)}
                  </span>
                  <span className="text-[11px] text-zinc-400"> / ماه</span>
                  {p.priceYearly && Number(p.priceYearly) > 0 && (
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      سالانه: {formatCompactPrice(p.priceYearly)}
                    </p>
                  )}
                </div>

                {features.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {features.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-zinc-600"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Quick specs */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.featuredCredits > 0 && (
                    <Spec>{toFa(p.featuredCredits)} آگهی ویژه</Spec>
                  )}
                  {p.analyticsAccess && <Spec>تحلیل بازار</Spec>}
                  {p.aiAssistantAccess && <Spec>هوش مصنوعی</Spec>}
                  {p.priorityLeads && <Spec>سرنخ اولویت</Spec>}
                  {p.companyPage && <Spec>صفحهٔ شرکت</Spec>}
                  {p.verifiedBadge && <Spec>تأیید رسمی</Spec>}
                  <Spec>تا {toFa(p.maxListings)} آگهی</Spec>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                  <span className="text-[11px] text-zinc-500">
                    {toFa(p.subscriberCount)} مشترك
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-[#F58220]/10 hover:text-[#F58220]"
                      title="ویرایش"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove(p)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && editing && (
        <PlanModal
          plan={editing}
          isNew={!editing.id}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function Spec({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">
      {children}
    </span>
  );
}

/* ─────────────── Create / Edit modal ─────────────── */

function PlanModal({
  plan,
  isNew,
  onClose,
  onSaved,
}: {
  plan: Plan;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({ ...plan });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: any) =>
    setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setError(null);
    if (!String(form.code ?? "").trim()) {
      setError("کد طرح الزامی است");
      return;
    }
    if (!String(form.nameFa ?? "").trim()) {
      setError("نام فارسی طرح الزامی است");
      return;
    }
    setSaving(true);
    try {
      const url = isNew
        ? "/api/admin/subscription-plans"
        : `/api/admin/subscription-plans/${plan.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: String(form.code).trim(),
          nameFa: String(form.nameFa).trim(),
          nameEn: form.nameEn || null,
          description: form.description || null,
          priceMonthly: String(form.priceMonthly ?? "0").replace(/[^\d]/g, ""),
          priceYearly: form.priceYearly
            ? String(form.priceYearly).replace(/[^\d]/g, "")
            : null,
          currency: form.currency || "IRR",
          featuredCredits: Number(form.featuredCredits) || 0,
          analyticsAccess: Boolean(form.analyticsAccess),
          aiAssistantAccess: Boolean(form.aiAssistantAccess),
          priorityLeads: Boolean(form.priorityLeads),
          companyPage: Boolean(form.companyPage),
          maxListings: Number(form.maxListings) || 0,
          maxImages: Number(form.maxImages) || 8,
          verifiedBadge: Boolean(form.verifiedBadge),
          supportLevel: form.supportLevel || null,
          sortOrder: Number(form.sortOrder) || 0,
          active: form.active !== false,
          popular: Boolean(form.popular),
          featuresJson: form.featuresJson || null,
        }),
      });
      const json = await res.json();
      if (json.success || res.ok) {
        onSaved();
      } else {
        setError(json.error || `HTTP ${res.status}`);
      }
    } catch (e: any) {
      setError(e?.message ?? "خطای شبکه");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const taCls =
    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#F58220] resize-y";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <h2 className="text-lg font-black text-zinc-900">
            {isNew ? "طرح اشتراک جدید" : "ویرایش طرح اشتراک"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
              ⚠ {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>کد طرح (یکتا) *</label>
              <input
                value={form.code || ""}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="BASIC / PRO / PREMIUM / CUSTOM"
                className={inputCls}
                dir="ltr"
                disabled={!isNew}
              />
            </div>
            <div>
              <label className={labelCls}>نام فارسی *</label>
              <input
                value={form.nameFa || ""}
                onChange={(e) => set("nameFa", e.target.value)}
                placeholder="پایه / حرفه‌ای / پرمیوم"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>نام انگلیسی</label>
              <input
                value={form.nameEn || ""}
                onChange={(e) => set("nameEn", e.target.value)}
                placeholder="Basic / Pro / Premium"
                className={inputCls}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>سطح پشتیبانی</label>
              <select
                value={form.supportLevel || ""}
                onChange={(e) => set("supportLevel", e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                <option value="BASIC">پایه</option>
                <option value="PRIORITY">اولویت‌دار</option>
                <option value="DEDICATED">اختصاصی</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>توضیحات طرح</label>
            <textarea
              value={form.description || ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="معرفی کوتاه طرح..."
              className={`${taCls} h-16`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>قیمت ماهانه (تومان)</label>
              <input
                type="number"
                value={form.priceMonthly ?? ""}
                onChange={(e) => set("priceMonthly", e.target.value)}
                placeholder="۰ برای رایگان"
                className={inputCls}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>قیمت سالانه (تومان)</label>
              <input
                type="number"
                value={form.priceYearly ?? ""}
                onChange={(e) => set("priceYearly", e.target.value)}
                placeholder="اختیاری"
                className={inputCls}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>ارز</label>
              <input
                value={form.currency || "IRR"}
                onChange={(e) => set("currency", e.target.value)}
                placeholder="IRR"
                className={inputCls}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>آگهی ویژهٔ ماهانه</label>
              <input
                type="number"
                value={form.featuredCredits ?? 0}
                onChange={(e) => set("featuredCredits", e.target.value)}
                className={inputCls}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>حداکثر آگهی فعال</label>
              <input
                type="number"
                value={form.maxListings ?? 0}
                onChange={(e) => set("maxListings", e.target.value)}
                placeholder="۰ = نامحدود"
                className={inputCls}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>حداکثر تصویر هر آگهی</label>
              <input
                type="number"
                value={form.maxImages ?? 8}
                onChange={(e) => set("maxImages", e.target.value)}
                className={inputCls}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Toggle
              checked={form.analyticsAccess}
              onChange={(v) => set("analyticsAccess", v)}
              label="دسترسی به تحلیل بازار"
            />
            <Toggle
              checked={form.aiAssistantAccess}
              onChange={(v) => set("aiAssistantAccess", v)}
              label="دسترسی به هوش مصنوعی"
            />
            <Toggle
              checked={form.priorityLeads}
              onChange={(v) => set("priorityLeads", v)}
              label="سرنخ‌های اولویت‌دار"
            />
            <Toggle
              checked={form.companyPage}
              onChange={(v) => set("companyPage", v)}
              label="صفحهٔ شرکت اختصاصی"
            />
            <Toggle
              checked={form.verifiedBadge}
              onChange={(v) => set("verifiedBadge", v)}
              label="نشان تأیید رسمی"
            />
            <Toggle
              checked={form.popular}
              onChange={(v) => set("popular", v)}
              label="برجسته به‌عنوان محبوب"
            />
            <Toggle
              checked={form.active !== false}
              onChange={(v) => set("active", v)}
              label="فعال"
            />
            <div className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-2 sm:col-span-2">
              <label className="text-xs font-bold text-zinc-500">
                ترتیب نمایش
              </label>
              <input
                type="number"
                value={form.sortOrder ?? 0}
                onChange={(e) => set("sortOrder", e.target.value)}
                className="h-9 w-24 rounded-lg border border-zinc-200 bg-white px-2 text-sm"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>امکانات (JSON آرایه‌ای از رشته‌ها)</label>
            <textarea
              value={form.featuresJson || ""}
              onChange={(e) => set("featuresJson", e.target.value)}
              placeholder={`[\n  "تا ۱۰ آگهی فعال",\n  "نمایش استاندارد در نتایج",\n  "پشتیبانی ایمیلی"\n]`}
              className={`${taCls} h-32 font-mono text-xs`}
              dir="ltr"
            />
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">
              هر آیتم یک رشته که به‌عنوان بولت در کارت طرح نمایش داده می‌شود.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50"
          >
            انصراف
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "در حال ذخیره..." : "ذخیره طرح"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-2 text-xs font-bold text-zinc-700">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#F58220]"
      />
      {label}
    </label>
  );
}
