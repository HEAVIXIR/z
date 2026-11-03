"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Loader2, Save, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ============================================================
   /admin/home/verified-machines — admin config for the
   "ماشین‌آلات تأییدشدهٔ هویکس" section.
   FIX-ANIMATIONS-BRANDS — FIX 1.
   ============================================================ */

type Animation = "marquee" | "grid" | "fade";

type Config = {
  title: string;
  subtitle: string;
  limit: number;
  animation: Animation;
  verifiedOnly: boolean;
};

const DEFAULTS: Config = {
  title: "ماشین‌آلات تأییدشدهٔ هویکس",
  subtitle: "HEAVIX VERIFIED",
  limit: 8,
  animation: "marquee",
  verifiedOnly: true,
};

export default function AdminVerifiedMachinesPage() {
  const [cfg, setCfg] = useState<Config>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/home/verified-machines", {
        cache: "no-store",
      });
      const json = await res.json();
      const c = json?.config;
      if (c) {
        setCfg({
          title: c.title ?? DEFAULTS.title,
          subtitle: c.subtitle ?? DEFAULTS.subtitle,
          limit: Number.isFinite(c.limit) ? Number(c.limit) : DEFAULTS.limit,
          animation: (["marquee", "grid", "fade"].includes(c.animation)
            ? c.animation
            : "marquee") as Animation,
          verifiedOnly: c.verifiedOnly ?? true,
        });
      }
    } catch {
      /* ignore — keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/home/verified-machines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "ذخیره ناموفق بود.");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast({ title: "تنظیمات ذخیره شد" });
    } catch (e: any) {
      toast({
        title: "خطا",
        description: e?.message ?? "ذخیره ناموفق بود.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#F58220]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <ShieldCheck className="h-6 w-6 text-[#F58220]" />
          ماشین‌آلات تأییدشده
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          تنظیمات بخش «ماشین‌آلات تأییدشدهٔ هویکس» در صفحه اصلی — عنوان، تعداد،
          نوع انیمیشن و فیلتر نمایش.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-zinc-900">پیکربندی</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">
              عنوان بخش
            </label>
            <input
              type="text"
              value={cfg.title}
              onChange={(e) => setCfg({ ...cfg, title: e.target.value })}
              placeholder="ماشین‌آلات تأییدشدهٔ هویکس"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">
              زیرعنوان (بَج بالای عنوان)
            </label>
            <input
              type="text"
              value={cfg.subtitle}
              onChange={(e) => setCfg({ ...cfg, subtitle: e.target.value })}
              placeholder="HEAVIX VERIFIED"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-500">
                تعداد آگهی نمایش داده‌شده
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={cfg.limit}
                onChange={(e) =>
                  setCfg({ ...cfg, limit: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
              />
              <p className="mt-1 text-[10px] text-zinc-400">بین ۱ تا ۳۰</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-500">
                نوع انیمیشن
              </label>
              <div className="flex gap-2">
                {(
                  [
                    { v: "marquee", l: "نوار چرخشی (Marquee)" },
                    { v: "grid", l: "شبکه‌ای (Grid)" },
                    { v: "fade", l: "ظهور محو (Fade)" },
                  ] as { v: Animation; l: string }[]
                ).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setCfg({ ...cfg, animation: opt.v })}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                      cfg.animation === opt.v
                        ? "border-[#F58220] bg-[#F58220]/5 text-[#F58220]"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-zinc-800">
                فقط آگهی‌های تأییدشده
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                وقتی روشن است، صرفاً آگهی‌هایی که فیلد verified=true دارند نمایش
                داده می‌شوند. وقتی خاموش است، آخرین آگهی‌های منتشرشده نمایش
                داده می‌شوند.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCfg({ ...cfg, verifiedOnly: !cfg.verifiedOnly })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                cfg.verifiedOnly ? "bg-[#F58220]" : "bg-zinc-300"
              }`}
              aria-label="فقط تأییدشده‌ها"
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                  cfg.verifiedOnly ? "left-1" : "left-6"
                }`}
              />
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "در حال ذخیره..." : saved ? "ذخیره شد!" : "ذخیره"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-800">
        ℹ در حالت «نوار چرخشی» کارت‌ها با کمی چرخش سه‌بعدی از راست وارد می‌شوند
        و با قرار گرفتن نشانگر ماوس روی آن‌ها متوقف می‌شوند. این انیمیشن از
        بخش «آخرین آگهی‌ها» متمایز است.
      </div>
    </div>
  );
}
