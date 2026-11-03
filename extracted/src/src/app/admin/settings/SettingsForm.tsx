"use client";

import { useState } from "react";
import { Save, Loader2, CheckCircle2 } from "lucide-react";

/* ============================================================
   SettingsForm — client component to edit SiteSettings.
   ============================================================ */

type Settings = {
  brandName: string;
  tagline: string;
  about: string;
  phone: string;
  email: string;
  address: string;
  workingHours: string;
  copyright: string;
  newsletterEnabled: boolean;
};

export default function SettingsForm({ initial }: { initial: Settings }) {
  const [data, setData] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Settings, v: string | boolean) => {
    setData((d) => ({ ...d, [k]: v }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(json.error ?? "خطا در ذخیره");
      }
    } catch {
      setError("خطای شبکه");
    }
    setSaving(false);
  };

  const inputCls =
    "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";

  return (
    <div className="space-y-6">
      {/* Brand section */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-zinc-900">برند</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">نام برند</label>
            <input value={data.brandName} onChange={(e) => set("brandName", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">شعار</label>
            <input value={data.tagline} onChange={(e) => set("tagline", e.target.value)} className={inputCls} dir="ltr" />
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-bold text-zinc-500">درباره ما</label>
          <textarea
            value={data.about}
            onChange={(e) => set("about", e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]"
          />
        </div>
      </div>

      {/* Contact section */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-zinc-900">تماس</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">تلفن</label>
            <input value={data.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} dir="ltr" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">ایمیل</label>
            <input value={data.email} onChange={(e) => set("email", e.target.value)} className={inputCls} dir="ltr" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">آدرس</label>
            <input value={data.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">ساعات کاری</label>
            <input value={data.workingHours} onChange={(e) => set("workingHours", e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Footer section */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-zinc-900">فوتر</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">متن کپی‌رایت</label>
            <input value={data.copyright} onChange={(e) => set("copyright", e.target.value)} className={inputCls} />
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
            <input
              type="checkbox"
              checked={data.newsletterEnabled}
              onChange={(e) => set("newsletterEnabled", e.target.checked)}
              className="h-4 w-4 accent-[#F58220]"
            />
            <span className="text-sm font-bold text-zinc-700">فعال‌سازی خبرنامه در فوتر</span>
          </label>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "در حال ذخیره..." : saved ? "ذخیره شد!" : "ذخیره تنظیمات"}
        </button>
      </div>
    </div>
  );
}
