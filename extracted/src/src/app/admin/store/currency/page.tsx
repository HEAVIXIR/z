"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Loader2,
  RefreshCw,
  Save,
  Plus,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { toFa, faDate, timeAgo } from "@/lib/format";

/* ============================================================
   /admin/store/currency — HEAVIX USD→Toman rate management
   ============================================================ */

type Rate = {
  id: string;
  date: string;
  rate: string;
  marginPercent: string;
  source: string;
  note: string | null;
  createdAt: string;
};

type Setting = {
  id: string;
  defaultRate: string;
  marginPercent: string;
  autoUpdateEnabled: boolean;
  autoSource: string;
  lastAutoRate: string | null;
  lastAutoStatus: string | null;
  lastAutoFetchAt: string | null;
  updatedAt: string;
};

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
const LABEL_CLS = "mb-1.5 block text-xs font-bold text-zinc-500";
const onlyDigits = (v: string) => v.replace(/[^\d.]/g, "");

export default function StoreCurrencyPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [setting, setSetting] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savingSetting, setSavingSetting] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [settingForm, setSettingForm] = useState({
    defaultRate: "",
    marginPercent: "",
    autoUpdateEnabled: false,
    autoSource: "telegram",
  });
  const [rateForm, setRateForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    rate: "",
    marginPercent: "",
    source: "MANUAL",
    note: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/store/currency?limit=30", { cache: "no-store" });
      if (!res.ok) throw new Error("خطا");
      const json = await res.json();
      if (json.success) {
        setRates(json.data.rates);
        setSetting(json.data.setting);
        if (json.data.setting) {
          setSettingForm({
            defaultRate: json.data.setting.defaultRate,
            marginPercent: json.data.setting.marginPercent,
            autoUpdateEnabled: json.data.setting.autoUpdateEnabled,
            autoSource: json.data.setting.autoSource,
          });
        }
      } else throw new Error(json.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSetting = async () => {
    setSavingSetting(true);
    try {
      const res = await fetch("/api/admin/store/currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-setting",
          defaultRate: Number(settingForm.defaultRate) || 0,
          marginPercent: Number(settingForm.marginPercent) || 0,
          autoUpdateEnabled: settingForm.autoUpdateEnabled,
          autoSource: settingForm.autoSource,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setToast("تنظیمات ارز به‌روزرسانی شد");
      await load();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setSavingSetting(false);
    }
  };

  const saveRate = async () => {
    if (!rateForm.date || !rateForm.rate) { setToast("تاریخ و نرخ الزامی است"); return; }
    setSavingRate(true);
    try {
      const res = await fetch("/api/admin/store/currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-rate",
          date: rateForm.date,
          rate: Number(rateForm.rate) || 0,
          marginPercent: Number(rateForm.marginPercent) || 0,
          source: rateForm.source,
          note: rateForm.note || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setToast("نرخ جدید ثبت شد");
      setShowRateForm(false);
      setRateForm({ ...rateForm, rate: "", note: "" });
      await load();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setSavingRate(false);
    }
  };

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">نرخ ارز فروشگاه هویکس</h1>
          <p className="text-sm text-zinc-500">مدیریت نرخ دلار به تومان و حاشیه سود</p>
        </div>
        <button onClick={load} disabled={loading} className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Settings card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-zinc-700">
            <DollarSign size={18} className="text-[#F58220]" />
            <h3 className="font-bold">تنظیمات کلی</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className={LABEL_CLS}>نرخ پایه (تومان / دلار)</label>
              <input value={settingForm.defaultRate} onChange={(e) => setSettingForm({ ...settingForm, defaultRate: onlyDigits(e.target.value) })} className={INPUT_CLS} dir="ltr" />
            </div>
            <div>
              <label className={LABEL_CLS}>حاشیه سود (٪)</label>
              <input value={settingForm.marginPercent} onChange={(e) => setSettingForm({ ...settingForm, marginPercent: onlyDigits(e.target.value) })} className={INPUT_CLS} dir="ltr" />
            </div>
            <div>
              <label className={LABEL_CLS}>منبع بروزرسانی خودکار</label>
              <select value={settingForm.autoSource} onChange={(e) => setSettingForm({ ...settingForm, autoSource: e.target.value })} className={INPUT_CLS}>
                <option value="telegram">تلگرام</option>
                <option value="manual">دستی</option>
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={settingForm.autoUpdateEnabled} onChange={(e) => setSettingForm({ ...settingForm, autoUpdateEnabled: e.target.checked })} className="h-4 w-4 accent-[#F58220]" />
              بروزرسانی خودکار فعال
            </label>
            <button onClick={saveSetting} disabled={savingSetting} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white hover:bg-[#e0701a] disabled:opacity-50">
              {savingSetting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              ذخیره تنظیمات
            </button>
          </div>

          {setting?.lastAutoRate && (
            <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
              <div className="font-bold">آخرین بروزرسانی خودکار</div>
              <div>نرخ: {toFa(Number(setting.lastAutoRate).toLocaleString("en-US"))} تومان</div>
              <div>وضعیت: {setting.lastAutoStatus ?? "—"}</div>
              {setting.lastAutoFetchAt && <div>{timeAgo(setting.lastAutoFetchAt)}</div>}
            </div>
          )}
        </div>

        {/* Today's rate + new rate form */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-700">
              <TrendingUp size={18} className="text-emerald-500" />
              <h3 className="font-bold">نرخ امروز</h3>
            </div>
            <button onClick={() => setShowRateForm((s) => !s)} className="flex h-8 items-center gap-1 rounded-lg bg-zinc-100 px-3 text-xs font-bold text-zinc-700 hover:bg-zinc-200">
              <Plus size={12} />
              ثبت نرخ جدید
            </button>
          </div>
          {rates[0] && (
            <div className="rounded-xl bg-gradient-to-br from-[#F58220] to-amber-500 p-5 text-white">
              <div className="text-xs opacity-80">{rates[0].date}</div>
              <div className="mt-1 text-3xl font-extrabold">
                {toFa(Number(rates[0].rate).toLocaleString("en-US"))}
                <span className="mr-1 text-sm font-normal opacity-80">تومان / دلار</span>
              </div>
              <div className="mt-1 text-xs opacity-80">
                حاشیه: {toFa(rates[0].marginPercent)}٪ — {rates[0].source === "TELEGRAM" ? "تلگرام" : "دستی"}
              </div>
              {rates[0].note && <div className="mt-1 text-xs opacity-80">{rates[0].note}</div>}
            </div>
          )}

          {showRateForm && (
            <div className="mt-4 space-y-2 rounded-xl border border-zinc-200 p-3">
              <div>
                <label className={LABEL_CLS}>تاریخ *</label>
                <input type="date" value={rateForm.date} onChange={(e) => setRateForm({ ...rateForm, date: e.target.value })} className={INPUT_CLS} dir="ltr" />
              </div>
              <div>
                <label className={LABEL_CLS}>نرخ (تومان) *</label>
                <input value={rateForm.rate} onChange={(e) => setRateForm({ ...rateForm, rate: onlyDigits(e.target.value) })} className={INPUT_CLS} dir="ltr" />
              </div>
              <div>
                <label className={LABEL_CLS}>حاشیه (٪)</label>
                <input value={rateForm.marginPercent} onChange={(e) => setRateForm({ ...rateForm, marginPercent: onlyDigits(e.target.value) })} className={INPUT_CLS} dir="ltr" />
              </div>
              <div>
                <label className={LABEL_CLS}>منبع</label>
                <select value={rateForm.source} onChange={(e) => setRateForm({ ...rateForm, source: e.target.value })} className={INPUT_CLS}>
                  <option value="MANUAL">دستی</option>
                  <option value="TELEGRAM">تلگرام</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>یادداشت</label>
                <input value={rateForm.note} onChange={(e) => setRateForm({ ...rateForm, note: e.target.value })} className={INPUT_CLS} />
              </div>
              <button onClick={saveRate} disabled={savingRate} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                {savingRate ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                ثبت نرخ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rate history */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-zinc-700">
          <Calendar size={18} className="text-zinc-500" />
          <h3 className="font-bold">تاریخچه نرخ‌ها</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-right text-sm">
            <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-bold">تاریخ</th>
                <th className="px-3 py-2 font-bold">نرخ</th>
                <th className="px-3 py-2 font-bold">حاشیه</th>
                <th className="px-3 py-2 font-bold">منبع</th>
                <th className="px-3 py-2 font-bold">یادداشت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-400"><Loader2 className="mx-auto animate-spin" /></td></tr>
              ) : rates.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-400">نرخی ثبت نشده است</td></tr>
              ) : (
                rates.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 font-mono text-xs" dir="ltr">{r.date}</td>
                    <td className="px-3 py-2 font-bold text-zinc-900">{toFa(Number(r.rate).toLocaleString("en-US"))}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{toFa(r.marginPercent)}٪</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${r.source === "TELEGRAM" ? "bg-sky-100 text-sky-700" : "bg-zinc-100 text-zinc-500"}`}>
                        {r.source === "TELEGRAM" ? "تلگرام" : "دستی"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{r.note ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
