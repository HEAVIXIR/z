"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Loader2,
  Save,
  PanelBottom,
  ChevronLeft,
  Mail,
  Phone,
  Clock,
  MapPin,
  FileText,
  Copyright,
  Newspaper,
  Image as ImageIcon,
} from "lucide-react";
import MediaUploader from "@/components/admin/MediaUploader";

type SiteSettings = {
  about: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  workingHours: string | null;
  copyright: string | null;
  newsletterEnabled: boolean;
  footerLogoUrl: string | null;
  footerLogoHeight: number;
  footerLogoPosition: string;
  footerHeavixLogoUrl: string | null;
  footerMekanixLogoUrl: string | null;
  footerAriaLogoUrl: string | null;
};

const DEFAULTS: SiteSettings = {
  about: null,
  phone: null,
  email: null,
  address: null,
  workingHours: null,
  copyright: null,
  newsletterEnabled: true,
  footerLogoUrl: null,
  footerLogoHeight: 48,
  footerLogoPosition: "center",
  footerHeavixLogoUrl: null,
  footerMekanixLogoUrl: null,
  footerAriaLogoUrl: null,
};

export default function FooterEditorPage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings({ ...DEFAULTS, ...d.settings });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof SiteSettings, v: string | boolean) =>
    setSettings((s) => ({ ...s, [k]: v }));

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
        if (d.settings) setSettings({ ...DEFAULTS, ...d.settings });
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
          <span>فوتر</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
              <PanelBottom className="h-6 w-6 text-[#F58220]" />
              ویرایشگر فوتر
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              مدیریت محتوای فوتر سایت — درباره‌ما، تماس، ساعات کاری و
              کپی‌رایت.
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
        <Section icon={ImageIcon} title="لوگوی ستون برند فوتر">
          <MediaUploader
            value={settings.footerLogoUrl}
            onChange={(v) => setSettings((s) => ({ ...s, footerLogoUrl: v }))}
            label="لوگوی اصلی فوتر (ستون برند)"
            endpoint="/api/admin/upload"
            hint="در صورت خالی بودن، لوگوی پیش‌فرض SVG استفاده می‌شود."
          />
          {/* Footer logo height slider */}
          <div className="mt-4 rounded-xl bg-zinc-50 p-4">
            <div className="flex items-center justify-between">
              <label className={labelCls}>ارتفاع همه لوگوهای فوتر (پیکسل)</label>
              <span className="text-sm font-black text-[#F58220]">
                {settings.footerLogoHeight}px
              </span>
            </div>
            <input
              type="range"
              min={32}
              max={96}
              step={4}
              value={settings.footerLogoHeight}
              onChange={(e) => setSettings((s) => ({ ...s, footerLogoHeight: Number(e.target.value) }))}
              className="mt-2 w-full accent-[#F58220]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
              <span>کوچک (۳۲)</span>
              <span>پیش‌فرض (۴۸)</span>
              <span>بزرگ (۹۶)</span>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              همه لوگوهای فوتر (ستون برند + ۳ کارت) هم‌اندازه می‌شوند.
            </p>
          </div>
          {/* Footer logo position selector */}
          <div className="mt-4 rounded-xl bg-zinc-50 p-4">
            <label className={labelCls}>موقعیت لوگو در ستون برند</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { value: "right", label: "راست" },
                { value: "center", label: "وسط" },
                { value: "left", label: "چپ" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, footerLogoPosition: opt.value }))}
                  className={`rounded-lg border p-2 text-xs font-bold transition ${
                    settings.footerLogoPosition === opt.value
                      ? "border-[#F58220] bg-[#F58220]/10 text-[#F58220]"
                      : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section icon={ImageIcon} title="لوگوهای ۳ کارت برند">
          <p className="mb-3 text-[11px] text-zinc-500">
            ۳ لوگوی کارت‌های پایین فوتر — هر کدام قابل آپلود جداگانه. در صورت خالی بودن، لوگوی پیش‌فرض SVG استفاده می‌شود.
          </p>
          <div className="space-y-4">
            <MediaUploader
              value={settings.footerHeavixLogoUrl}
              onChange={(v) => setSettings((s) => ({ ...s, footerHeavixLogoUrl: v }))}
              label="لوگوی کارت HEAVIX"
              endpoint="/api/admin/upload"
              compact
            />
            <MediaUploader
              value={settings.footerMekanixLogoUrl}
              onChange={(v) => setSettings((s) => ({ ...s, footerMekanixLogoUrl: v }))}
              label="لوگوی کارت MEKANIX"
              endpoint="/api/admin/upload"
              compact
            />
            <MediaUploader
              value={settings.footerAriaLogoUrl}
              onChange={(v) => setSettings((s) => ({ ...s, footerAriaLogoUrl: v }))}
              label="لوگوی کارت ARIA MACHINE JAM"
              endpoint="/api/admin/upload"
              compact
            />
          </div>
        </Section>

        <Section icon={FileText} title="درباره ما">
          <div>
            <label className={labelCls}>متن درباره‌ما</label>
            <textarea
              value={settings.about || ""}
              onChange={(e) => set("about", e.target.value)}
              placeholder="معرفی کوتاه پلتفرم برای نمایش در فوتر..."
              className={`${inputCls} h-32 resize-none py-2`}
            />
            <p className="mt-1 text-[10px] text-zinc-400">
              این متن در بخش درباره‌ما فوتر سایت نمایش داده می‌شود.
            </p>
          </div>
          <div>
            <label className={labelCls}>کپی‌رایت</label>
            <input
              value={settings.copyright || ""}
              onChange={(e) => set("copyright", e.target.value)}
              placeholder="© ۱۴۰۳ هویکس — تمامی حقوق محفوظ است."
              className={inputCls}
            />
          </div>
        </Section>

        <Section icon={Phone} title="اطلاعات تماس">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>تلفن</label>
              <input
                value={settings.phone || ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="۰۲۱-۱۲۳۴۵۶۷۸"
                className={inputCls}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>ایمیل</label>
              <input
                value={settings.email || ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="info@example.com"
                className={inputCls}
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>نشانی</label>
            <input
              value={settings.address || ""}
              onChange={(e) => set("address", e.target.value)}
              placeholder="تهران، خیابان..."
              className={inputCls}
            />
          </div>
        </Section>

        <Section icon={Clock} title="ساعات کاری">
          <div>
            <label className={labelCls}>ساعات کاری</label>
            <input
              value={settings.workingHours || ""}
              onChange={(e) => set("workingHours", e.target.value)}
              placeholder="شنبه تا چهارشنبه ۹ تا ۱۸"
              className={inputCls}
            />
          </div>
        </Section>

        <Section icon={Newspaper} title="خبرنامه">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
            <input
              type="checkbox"
              checked={settings.newsletterEnabled}
              onChange={(e) => set("newsletterEnabled", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#F58220]"
            />
            <div>
              <div className="text-sm font-bold text-zinc-800">
                نمایش فرم خبرنامه در فوتر
              </div>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                اگر فعال باشد، فرم عضویت در خبرنامه در فوتر سایت نمایش داده
                می‌شود.
              </p>
            </div>
          </label>
        </Section>
      </div>

      {/* Preview summary */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-700">
          <PanelBottom className="h-4 w-4 text-[#F58220]" />
          پیش‌نمایش فوتر
        </h2>
        <div className="rounded-xl bg-zinc-900 p-6 text-zinc-300">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <h4 className="mb-2 text-xs font-black text-white">درباره ما</h4>
              <p className="text-xs leading-5 text-zinc-400">
                {settings.about || "—"}
              </p>
            </div>
            <div className="space-y-1.5">
              <h4 className="mb-2 text-xs font-black text-white">تماس</h4>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Phone className="h-3 w-3 text-[#F58220]" />
                <span dir="ltr">{settings.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Mail className="h-3 w-3 text-[#F58220]" />
                <span dir="ltr">{settings.email || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock className="h-3 w-3 text-[#F58220]" />
                <span>{settings.workingHours || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <MapPin className="h-3 w-3 text-[#F58220]" />
                <span>{settings.address || "—"}</span>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-black text-white">خبرنامه</h4>
              {settings.newsletterEnabled ? (
                <p className="text-xs text-emerald-400">فعال ✓</p>
              ) : (
                <p className="text-xs text-zinc-500">غیرفعال</p>
              )}
            </div>
          </div>
          <div className="mt-6 flex items-center gap-1.5 border-t border-white/10 pt-4 text-[11px] text-zinc-500">
            <Copyright className="h-3 w-3" />
            {settings.copyright || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-700">
        <Icon className="h-4 w-4 text-[#F58220]" />
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
