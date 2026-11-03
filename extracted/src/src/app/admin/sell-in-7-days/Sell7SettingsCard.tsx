"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Crown, AlertCircle } from "lucide-react";
import { formatFullPrice, toFa } from "@/lib/format";

/* ============================================================
   Sell7SettingsCard — admin-editable campaign knobs for the
   "Sell in 7 Days" funnel:
     - sellIn7DaysPrepaymentAmount (Toman, BigInt)
     - sellIn7DaysCommissionRate   (percent, Float)

   FIX-ADMIN-EDITABILITY — these already live on SiteSettings but
   had no admin UI. Persisted via PUT /api/admin/site-settings
   (which now allowlists both fields).
   ============================================================ */

type Settings = {
  sellIn7DaysPrepaymentAmount: string | null;
  sellIn7DaysCommissionRate: number | null;
};

const DEFAULTS: Settings = {
  sellIn7DaysPrepaymentAmount: "500000",
  sellIn7DaysCommissionRate: 1,
};

export default function Sell7SettingsCard() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings) {
          setSettings({
            sellIn7DaysPrepaymentAmount:
              d.settings.sellIn7DaysPrepaymentAmount ?? null,
            sellIn7DaysCommissionRate:
              d.settings.sellIn7DaysCommissionRate ?? null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellIn7DaysPrepaymentAmount:
            settings.sellIn7DaysPrepaymentAmount || null,
          sellIn7DaysCommissionRate:
            settings.sellIn7DaysCommissionRate ?? null,
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setMsg("✓ ذخیره شد");
        if (d.settings) {
          setSettings({
            sellIn7DaysPrepaymentAmount:
              d.settings.sellIn7DaysPrepaymentAmount ?? null,
            sellIn7DaysCommissionRate:
              d.settings.sellIn7DaysCommissionRate ?? null,
          });
        }
      } else {
        setError("خطا: " + (d.error || "نامشخص"));
      }
    } catch {
      setError("خطای شبکه");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-6">
        <Loader2 className="h-5 w-5 animate-spin text-[#F58220]" />
      </div>
    );
  }

  const inputCls =
    "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  const prepayNum = settings.sellIn7DaysPrepaymentAmount
    ? BigInt(settings.sellIn7DaysPrepaymentAmount)
    : null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-zinc-700">
            <Crown className="h-4 w-4 text-[#F58220]" />
            تنظیمات کمپین فروش در ۷ روز
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            مبلغ پیش‌پرداخت و درصد کارمزد فروش تضمینی — در فرم ثبت و محاسبهٔ
            تسویه استفاده می‌شود.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          ذخیره
        </button>
      </div>

      {msg && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          {msg}
        </div>
      )}
      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>مبلغ پیش‌پرداخت (تومان)</label>
          <input
            dir="ltr"
            inputMode="numeric"
            value={settings.sellIn7DaysPrepaymentAmount ?? ""}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                sellIn7DaysPrepaymentAmount: e.target.value.replace(/[^\d]/g, ""),
              }))
            }
            placeholder="مثال: 500000"
            className={inputCls}
          />
          {prepayNum != null && (
            <p className="mt-1 text-[11px] text-zinc-400">
              {formatFullPrice(prepayNum)} تومان
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>درصد کارمزد فروش (٪)</label>
          <input
            dir="ltr"
            inputMode="decimal"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={settings.sellIn7DaysCommissionRate ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setSettings((s) => ({
                ...s,
                sellIn7DaysCommissionRate:
                  v === "" ? null : Math.max(0, Math.min(100, Number(v) || 0)),
              }));
            }}
            placeholder="مثال: 1"
            className={inputCls}
          />
          {settings.sellIn7DaysCommissionRate != null && (
            <p className="mt-1 text-[11px] text-zinc-400">
              کارمزد {toFa(settings.sellIn7DaysCommissionRate)}٪ از قیمت نهایی
              فروش محاسبه می‌شود.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
