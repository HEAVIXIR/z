"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Loader2,
  RefreshCw,
  Save,
  RotateCcw,
  ShieldCheck,
  Power,
  CircleDollarSign,
  Clock,
  Hash,
  FormInput as InputIcon,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /admin/ai-budget — AI Budget + Task Policy dashboard
   P0-7 (HEAVIX-SECURITY-BASELINE-V1.md §8)
   ------------------------------------------------------------
   • Budget singleton: daily/monthly USD spend vs limits
     (progress bars + editable limits + reset-spend buttons).
   • Per-task AITaskPolicy table — each row inline-editable.
   ============================================================ */

type Budget = {
  id: string;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  dailySpendUsd: number;
  monthlySpendUsd: number;
  dailyResetAt: string | null;
  monthlyResetAt: string | null;
  active: boolean;
};

type Policy = {
  id: string;
  taskType: string;
  allowedRoles: string;
  hourlyLimit: number;
  dailyLimit: number;
  maxInputChars: number;
  maxOutputTokens: number;
  model: string;
  timeoutMs: number;
  costCeilingUsd: number;
  active: boolean;
};

const TASK_LABELS: Record<string, string> = {
  SEARCH: "جستجو",
  SEMANTIC_SEARCH: "جستجوی معنایی",
  LISTING_BUILDER: "سازنده آگهی",
  PRICE_ANALYSIS: "تحلیل قیمت",
  MARKET_ANALYST: "تحلیل‌گر بازار",
  SELLER_ASSISTANT: "دستیار فروشنده",
  SCRAPER: "استخراج آگهی",
  MODERATION: "مدیریت محتوا",
};

type PolicyDraft = {
  allowedRoles: string;
  hourlyLimit: string;
  dailyLimit: string;
  maxInputChars: string;
  costCeilingUsd: string;
  timeoutMs: string;
  active: boolean;
};

function toDraft(p: Policy): PolicyDraft {
  return {
    allowedRoles: p.allowedRoles,
    hourlyLimit: String(p.hourlyLimit),
    dailyLimit: String(p.dailyLimit),
    maxInputChars: String(p.maxInputChars),
    costCeilingUsd: String(p.costCeilingUsd),
    timeoutMs: String(p.timeoutMs),
    active: p.active,
  };
}

function isDirty(p: Policy, d: PolicyDraft): boolean {
  return (
    d.allowedRoles !== p.allowedRoles ||
    Number(d.hourlyLimit) !== p.hourlyLimit ||
    Number(d.dailyLimit) !== p.dailyLimit ||
    Number(d.maxInputChars) !== p.maxInputChars ||
    Number(d.costCeilingUsd) !== p.costCeilingUsd ||
    Number(d.timeoutMs) !== p.timeoutMs ||
    d.active !== p.active
  );
}

export default function AIBudgetPage() {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PolicyDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState<string | null>(null);
  const [savingBudget, setSavingBudget] = useState(false);
  const [resetting, setResetting] = useState<"daily" | "monthly" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Budget edits
  const [dailyLimit, setDailyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [budgetActive, setBudgetActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-budget");
      const json = await res.json();
      if (json.success) {
        setBudget(json.budget);
        setPolicies(json.policies || []);
        setDailyLimit(String(json.budget?.dailyLimitUsd ?? 10));
        setMonthlyLimit(String(json.budget?.monthlyLimitUsd ?? 200));
        setBudgetActive(Boolean(json.budget?.active));
        const next: Record<string, PolicyDraft> = {};
        for (const p of json.policies || []) next[p.taskType] = toDraft(p);
        setDrafts(next);
      }
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
    setTimeout(() => setToast(null), 2500);
  };

  const saveBudget = async (opts?: { resetDaily?: boolean; resetMonthly?: boolean }) => {
    setSavingBudget(true);
    try {
      const body: Record<string, unknown> = {
        dailyLimitUsd: Number(dailyLimit),
        monthlyLimitUsd: Number(monthlyLimit),
        active: budgetActive,
      };
      if (opts?.resetDaily) body.resetDaily = true;
      if (opts?.resetMonthly) body.resetMonthly = true;
      const res = await fetch("/api/admin/ai-budget", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setBudget(json.budget);
        setDailyLimit(String(json.budget?.dailyLimitUsd ?? 10));
        setMonthlyLimit(String(json.budget?.monthlyLimitUsd ?? 200));
        setBudgetActive(Boolean(json.budget?.active));
        showToast(opts?.resetDaily ? "مصرف روزانه صفر شد" : opts?.resetMonthly ? "مصرف ماهانه صفر شد" : "بودجه ذخیره شد");
      } else {
        showToast(json.error || "خطا در ذخیره بودجه");
      }
    } finally {
      setSavingBudget(false);
      setResetting(null);
    }
  };

  const savePolicy = async (p: Policy) => {
    const d = drafts[p.taskType];
    if (!d) return;
    setSavingPolicy(p.taskType);
    try {
      const res = await fetch(`/api/admin/ai-policies/${encodeURIComponent(p.taskType)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowedRoles: d.allowedRoles,
          hourlyLimit: Number(d.hourlyLimit),
          dailyLimit: Number(d.dailyLimit),
          maxInputChars: Number(d.maxInputChars),
          costCeilingUsd: Number(d.costCeilingUsd),
          timeoutMs: Number(d.timeoutMs),
          active: d.active,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPolicies((prev) => prev.map((x) => (x.taskType === p.taskType ? json.policy : x)));
        setDrafts((prev) => ({ ...prev, [p.taskType]: toDraft(json.policy) }));
        showToast(`سیاست ${TASK_LABELS[p.taskType] ?? p.taskType} ذخیره شد`);
      } else {
        showToast(json.error || "خطا در ذخیره سیاست");
      }
    } finally {
      setSavingPolicy(null);
    }
  };

  const updateDraft = (taskType: string, patch: Partial<PolicyDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [taskType]: { ...prev[taskType], ...patch },
    }));
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("fa-IR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const dailyPct = budget
    ? Math.min(100, (budget.dailySpendUsd / Math.max(0.0001, budget.dailyLimitUsd)) * 100)
    : 0;
  const monthlyPct = budget
    ? Math.min(100, (budget.monthlySpendUsd / Math.max(0.0001, budget.monthlyLimitUsd)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Wallet className="h-6 w-6 text-[#F58220]" />
            بودجه و سیاست هوش مصنوعی
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            کنترل هزینه USD، سهمیه و سطوح دسترسی هر تسک AI —
            <span className="font-bold text-zinc-700"> دروازه مبتنی بر سیاست</span>
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220] hover:text-[#F58220]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          به‌روزرسانی
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : (
        <>
          {/* ───── Budget panel ───── */}
          {budget && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F58220]/10">
                    <CircleDollarSign className="h-5 w-5 text-[#F58220]" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-zinc-900">بودجه کلی هوش مصنوعی</h2>
                    <p className="text-xs text-zinc-500">
                      سقف هزینه روزانه و ماهانه — به‌صورت خودکار هنگام گذشت پنجره بازنشانی می‌شود
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBudgetActive((v) => !v)}
                  className="flex shrink-0 items-center gap-2"
                  aria-label="تغییر وضعیت بودجه"
                >
                  <Power className={`h-5 w-5 ${budgetActive ? "text-emerald-500" : "text-zinc-300"}`} />
                  <span className={`text-xs font-bold ${budgetActive ? "text-emerald-600" : "text-zinc-400"}`}>
                    {budgetActive ? "فعال" : "غیرفعال"}
                  </span>
                </button>
              </div>

              {/* Progress bars */}
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <BudgetBar
                  label="مصرف روزانه"
                  spend={budget.dailySpendUsd}
                  limit={budget.dailyLimitUsd}
                  pct={dailyPct}
                  resetAt={budget.dailyResetAt}
                  fmtDate={fmtDate}
                  tone="amber"
                />
                <BudgetBar
                  label="مصرف ماهانه"
                  spend={budget.monthlySpendUsd}
                  limit={budget.monthlyLimitUsd}
                  pct={monthlyPct}
                  resetAt={budget.monthlyResetAt}
                  fmtDate={fmtDate}
                  tone="orange"
                />
              </div>

              {/* Editable limits + reset buttons */}
              <div className="mt-6 grid gap-4 border-t border-zinc-100 pt-5 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-500">سقف روزانه (USD)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value.replace(/[^\d.]/g, ""))}
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-800 focus:border-[#F58220] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-500">سقف ماهانه (USD)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value.replace(/[^\d.]/g, ""))}
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-800 focus:border-[#F58220] focus:outline-none"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    disabled={savingBudget || resetting !== null}
                    onClick={() => saveBudget()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#F58220] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
                  >
                    {savingBudget ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    ذخیره سقف
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingBudget || resetting !== null}
                  onClick={async () => {
                    setResetting("daily");
                    await saveBudget({ resetDaily: true });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-amber-400 hover:text-amber-600 disabled:opacity-60"
                >
                  {resetting === "daily" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  صفر کردن مصرف روزانه
                </button>
                <button
                  type="button"
                  disabled={savingBudget || resetting !== null}
                  onClick={async () => {
                    setResetting("monthly");
                    await saveBudget({ resetMonthly: true });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-orange-400 hover:text-orange-600 disabled:opacity-60"
                >
                  {resetting === "monthly" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  صفر کردن مصرف ماهانه
                </button>
              </div>
            </div>
          )}

          {/* ───── Policies table ───── */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
              <ShieldCheck className="h-5 w-5 text-[#F58220]" />
              <div>
                <h2 className="text-base font-black text-zinc-900">سیاست تسک‌های AI</h2>
                <p className="text-xs text-zinc-500">
                  هر تسک فقط در صورت وجود سیاست فعال مجاز است — deny-by-default
                </p>
              </div>
            </div>

            {policies.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm text-zinc-400">
                  سیاستی یافت نشد. اجرای{" "}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">bun run db:seed-ai-policies</code>
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="border-b border-zinc-100 bg-zinc-50 text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 text-right font-bold">تسک</th>
                      <th className="px-4 py-3 text-right font-bold">نقش‌های مجاز</th>
                      <th className="px-4 py-3 text-center font-bold">ساعتانه</th>
                      <th className="px-4 py-3 text-center font-bold">روزانه</th>
                      <th className="px-4 py-3 text-center font-bold">حد ورودی</th>
                      <th className="px-4 py-3 text-center font-bold">سقف هزینه</th>
                      <th className="px-4 py-3 text-center font-bold">تایم‌اوت</th>
                      <th className="px-4 py-3 text-center font-bold">فعال</th>
                      <th className="px-4 py-3 text-center font-bold">ذخیره</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {policies.map((p) => {
                      const d = drafts[p.taskType];
                      if (!d) return null;
                      const dirty = isDirty(p, d);
                      return (
                        <tr key={p.id} className="align-middle hover:bg-zinc-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <code className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[10px] font-bold text-[#F58220]">
                                {p.taskType}
                              </code>
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-400">
                              {TASK_LABELS[p.taskType] ?? p.taskType}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={d.allowedRoles}
                              onChange={(e) => updateDraft(p.taskType, { allowedRoles: e.target.value })}
                              placeholder="ADMIN,SELLER یا *"
                              className="h-9 w-36 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-bold text-zinc-800 focus:border-[#F58220] focus:outline-none"
                            />
                            <p className="mt-1 text-[10px] text-zinc-400">* = همه</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <NumInput
                              icon={<Clock className="h-3 w-3" />}
                              value={d.hourlyLimit}
                              onChange={(v) => updateDraft(p.taskType, { hourlyLimit: v })}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <NumInput
                              icon={<Hash className="h-3 w-3" />}
                              value={d.dailyLimit}
                              onChange={(v) => updateDraft(p.taskType, { dailyLimit: v })}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <NumInput
                              icon={<InputIcon className="h-3 w-3" />}
                              value={d.maxInputChars}
                              onChange={(v) => updateDraft(p.taskType, { maxInputChars: v })}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <NumInput
                              prefix="$"
                              value={d.costCeilingUsd}
                              onChange={(v) => updateDraft(p.taskType, { costCeilingUsd: v })}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <NumInput
                              suffix="ms"
                              value={d.timeoutMs}
                              onChange={(v) => updateDraft(p.taskType, { timeoutMs: v })}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => updateDraft(p.taskType, { active: !d.active })}
                              className="inline-flex items-center justify-center"
                              aria-label="تغییر وضعیت سیاست"
                            >
                              <Power className={`h-5 w-5 ${d.active ? "text-emerald-500" : "text-zinc-300"}`} />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              disabled={!dirty || savingPolicy === p.taskType}
                              onClick={() => savePolicy(p)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                                dirty
                                  ? "bg-[#F58220] text-white hover:bg-[#ff8c38]"
                                  : "cursor-not-allowed bg-zinc-100 text-zinc-400"
                              }`}
                            >
                              {savingPolicy === p.taskType ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                              ذخیره
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ───────────── Sub-components ───────────── */

function BudgetBar({
  label,
  spend,
  limit,
  pct,
  resetAt,
  fmtDate,
  tone,
}: {
  label: string;
  spend: number;
  limit: number;
  pct: number;
  resetAt: string | null;
  fmtDate: (iso: string | null) => string;
  tone: "amber" | "orange";
}) {
  const toneClasses =
    tone === "amber"
      ? { bar: "bg-amber-500", text: "text-amber-600", soft: "bg-amber-50" }
      : { bar: "bg-[#F58220]", text: "text-[#F58220]", soft: "bg-orange-50" };
  const over = pct >= 100;
  return (
    <div className={`rounded-xl border border-zinc-100 p-4 ${toneClasses.soft}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold text-zinc-600">{label}</span>
        <span className={`text-sm font-black ${over ? "text-red-600" : toneClasses.text}`}>
          ${spend.toFixed(4)} / ${limit.toFixed(2)}
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-red-500" : toneClasses.bar}`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-zinc-400">
        بازنشانی بعدی: {fmtDate(resetAt)} — {toFa(pct.toFixed(1))}٪ مصرف شده
      </p>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  prefix,
  suffix,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2">
      {prefix && <span className="text-[11px] font-bold text-zinc-400">{prefix}</span>}
      {icon}
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        className="h-8 w-16 bg-transparent text-center text-xs font-bold text-zinc-800 focus:outline-none"
      />
      {suffix && <span className="text-[10px] font-bold text-zinc-400">{suffix}</span>}
    </div>
  );
}
