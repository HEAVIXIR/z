"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Save,
  FileText,
  Phone,
  Mail,
  MapPin,
  Clock,
  Copyright,
  Newspaper,
  AlertCircle,
} from "lucide-react";

type SiteSettings = {
  about: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  workingHours: string | null;
  copyright: string | null;
  newsletterEnabled: boolean;
};

const DEFAULTS: SiteSettings = {
  about: null,
  phone: null,
  email: null,
  address: null,
  workingHours: null,
  copyright: null,
  newsletterEnabled: true,
};

export default function SiteSettingsForm() {
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
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#F58220]" />
      </div>
    );
  }

  const inputCls =
    "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-zinc-900">
            تنظیمات محتوای سایت
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            محتوای فوتر، درباره‌ما، تماس و خبرنامه — در همهٔ صفحات سایت نمایش
            داده می‌شود.
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

      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">
          {msg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Section icon={FileText} title="درباره ما و کپی‌رایت">
          <div>
            <label className={labelCls}>متن درباره‌ما</label>
            <textarea
              value={settings.about || ""}
              onChange={(e) => set("about", e.target.value)}
              placeholder="معرفی کوتاه پلتفرم..."
              className={`${inputCls} h-28 resize-none py-2`}
            />
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
      <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-700">
        <Icon className="h-4 w-4 text-[#F58220]" />
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
