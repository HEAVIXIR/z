"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Save, ChevronLeft, PanelTop, Type, Smartphone } from "lucide-react";
import MediaUploader from "@/components/admin/MediaUploader";

/* ============================================================
   /admin/home/header — header brand-asset manager (v2).
   CHAT-2026-09-21: full editing — logo image, logo height,
   Persian name toggle, logo position (right/center/left).
   Persists via PUT /api/admin/site-settings.
============================================================ */

type HeaderSettings = {
  logoUrl: string | null;
  logoText: string | null;
  logoHeight: number;
  showPersianName: boolean;
  logoPosition: string;
};

const DEFAULTS: HeaderSettings = {
  logoUrl: null,
  logoText: "HEAVIX",
  logoHeight: 80,
  showPersianName: true,
  logoPosition: "right",
};

export default function HeaderEditorPage() {
  const [settings, setSettings] = useState<HeaderSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setSettings({
            logoUrl: d.settings.logoUrl ?? null,
            logoText: d.settings.logoText ?? DEFAULTS.logoText,
            logoHeight: d.settings.logoHeight ?? DEFAULTS.logoHeight,
            showPersianName: d.settings.showPersianName ?? DEFAULTS.showPersianName,
            logoPosition: d.settings.logoPosition ?? DEFAULTS.logoPosition,
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
        body: JSON.stringify(settings),
      });
      const d = await res.json();
      if (d.ok) {
        setMsg("✓ ذخیره شد");
        if (d.settings) {
          setSettings({
            logoUrl: d.settings.logoUrl ?? null,
            logoText: d.settings.logoText ?? DEFAULTS.logoText,
            logoHeight: d.settings.logoHeight ?? DEFAULTS.logoHeight,
            showPersianName: d.settings.showPersianName ?? DEFAULTS.showPersianName,
            logoPosition: d.settings.logoPosition ?? DEFAULTS.logoPosition,
          });
        }
      } else {
        setError("خطا: " + (d.error || "نامشخص"));
      }
    } catch {
      setError("خطای شبکه");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
      </div>
    );
  }

  const inputCls =
    "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/admin/home" className="hover:text-[#F58220]">
            صفحه اصلی
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span>هدر</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
              <PanelTop className="h-6 w-6 text-[#F58220]" />
              ویرایشگر هدر
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              مدیریت کامل لوگوی هدر: تصویر، اندازه، موقعیت و متن فارسی.
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            ذخیره
          </button>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">
          {msg}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Logo uploader + size */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-700">
            <PanelTop className="h-4 w-4 text-[#F58220]" />
            لوگوی هدر
          </h2>
          <div className="space-y-4">
            <MediaUploader
              value={settings.logoUrl}
              onChange={(v) => setSettings((s) => ({ ...s, logoUrl: v }))}
              label="تصویر لوگو (اختیاری — خالی = لوگوی پیش‌فرض SVG با 'IX' نارنجی)"
              endpoint="/api/admin/upload"
              hint="پیشنهاد: فایل شفاف PNG یا SVG."
            />

            {/* Logo height slider */}
            <div className="rounded-xl bg-zinc-50 p-4">
              <div className="flex items-center justify-between">
                <label className={labelCls}>ارتفاع لوگو (پیکسل)</label>
                <span className="text-sm font-black text-[#F58220]">
                  {settings.logoHeight}px
                </span>
              </div>
              <input
                type="range"
                min={40}
                max={160}
                step={4}
                value={settings.logoHeight}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, logoHeight: Number(e.target.value) }))
                }
                className="mt-2 w-full accent-[#F58220]"
              />
              <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
                <span>کوچک (۴۰)</span>
                <span>پیش‌فرض (۸۰)</span>
                <span>بزرگ (۱۶۰)</span>
              </div>
            </div>

            {/* Logo position selector */}
            <div className="rounded-xl bg-zinc-50 p-4">
              <label className={labelCls}>موقعیت لوگو در هدر</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { value: "right", label: "راست" },
                  { value: "center", label: "وسط" },
                  { value: "left", label: "چپ" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, logoPosition: opt.value }))}
                    className={`rounded-lg border p-2 text-xs font-bold transition ${
                      settings.logoPosition === opt.value
                        ? "border-[#F58220] bg-[#F58220]/10 text-[#F58220]"
                        : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Persian name toggle */}
            <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-4">
              <div>
                <label className={labelCls}>نمایش نام فارسی «هویکس» کنار لوگو</label>
                <p className="text-[11px] text-zinc-400">
                  «هوی» سفید + «کس» نارنجی کنار لوگو
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, showPersianName: !s.showPersianName }))}
                className={`relative h-7 w-12 rounded-full transition ${
                  settings.showPersianName ? "bg-[#F58220]" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                    settings.showPersianName ? "left-1" : "left-6"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className={labelCls}>متن لوگو (در صورت نبود تصویر)</label>
              <input
                value={settings.logoText ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, logoText: e.target.value || null }))}
                placeholder="HEAVIX"
                dir="ltr"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-700">
            <Type className="h-4 w-4 text-[#F58220]" />
            پیش‌نمایش زنده هدر
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <div
              className={`flex items-center gap-3 bg-zinc-900 px-5 py-4 ${
                settings.logoPosition === "center" ? "justify-center" : settings.logoPosition === "left" ? "justify-start" : "justify-between"
              }`}
            >
              <img
                src={settings.logoUrl || "/logos/heavix-logo.svg"}
                alt="logo"
                style={{ height: `${settings.logoHeight}px` }}
                className="w-auto max-w-[240px] object-contain"
              />
              {settings.showPersianName && (
                <span className="text-xl font-black">
                  <span className="text-white">هوی</span>
                  <span className="text-[#F58220]">کس</span>
                </span>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="mb-2 flex items-center gap-1 text-xs font-bold text-zinc-500">
              <Smartphone className="h-3 w-3" />
              پیش‌نمایش موبایل
            </h3>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-900 px-3 py-2">
              <img
                src={settings.logoUrl || "/logos/heavix-logo.svg"}
                alt="logo"
                style={{ height: `${Math.min(settings.logoHeight, 48)}px` }}
                className="w-auto"
              />
              {settings.showPersianName && (
                <span className="text-base font-black">
                  <span className="text-white">هوی</span>
                  <span className="text-[#F58220]">کس</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
