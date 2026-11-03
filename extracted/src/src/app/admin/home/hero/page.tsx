"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Save, Image as ImageIcon, AlignRight, AlignCenter, AlignLeft,
  RotateCcw, X, Plus, Minus, Eye, Type, Square, Layout, Sliders, Sparkles,
  Search, Link2,
} from "lucide-react";
import MediaUploader from "@/components/admin/MediaUploader";

type HeroConfig = {
  badge: string | null; title1: string | null; highlight: string | null; subtitle: string | null;
  buttonText: string | null; buttonLink: string | null; secondBtnText: string | null; secondBtnLink: string | null;
  slide1: string | null; slide2: string | null; slide3: string | null;
  cardServicesImg: string | null; cardFeaturedImg: string | null; cardExclusiveImg: string | null;
  // FIX-LISTINGS-HERO — optional Listing IDs for the 3 tilted cards.
  // When set, the homepage hero shows that listing (image + title + price)
  // instead of the static card*Img asset. Falls back to the image URL when
  // the listing is deleted or no longer PUBLISHED.
  cardServicesListingId: string | null;
  cardFeaturedListingId: string | null;
  cardExclusiveListingId: string | null;
  animationType: string | null;
  statsWidth: string | null; cardHeight: string | null; cardWidth: string | null; titleFontSize: string | null;
  badgeAlign: string | null; titleAlign: string | null; highlightAlign: string | null; subtitleAlign: string | null; buttonAlign: string | null;
  statsWidthCustom: string | null; statsPaddingCustom: string | null; statsGapCustom: string | null;
  cardWidthCustom: string | null; cardHeightCustom: string | null; cardGapCustom: string | null; cardRadiusCustom: string | null;
  titleFontSizeCustom: string | null; subtitleFontSizeCustom: string | null; badgeFontSizeCustom: string | null;
  buttonPaddingYCustom: string | null; buttonPaddingXCustom: string | null;
  heroMinHeightCustom: string | null; contentMaxWidthCustom: string | null; contentGapCustom: string | null;
  slideOpacityCustom: string | null; slideIntervalCustom: string | null; overlayColorCustom: string | null;
};

const DEFAULTS: HeroConfig = {
  badge: "شبکه تکنسین‌ها", title1: "خرید، فروش و اجاره ماشین‌آلات سنگین",
  highlight: "هویکس", subtitle: "بزرگ‌ترین مارکت‌پلیس صنعتی و معدنی ایران",
  buttonText: "ثبت آگهی رایگان", buttonLink: "/listings/new",
  secondBtnText: "مشاهده آگهی‌ها", secondBtnLink: "/listings",
  slide1: "/images/hero/hero-construction.png", slide2: "/images/hero/hero-mining.png", slide3: "/images/hero/hero-road.png",
  cardServicesImg: "/images/hero/card-services.png", cardFeaturedImg: "/images/hero/card-featured.png", cardExclusiveImg: "/images/hero/card-exclusive.png",
  cardServicesListingId: null,
  cardFeaturedListingId: null,
  cardExclusiveListingId: null,
  animationType: "fade",
  statsWidth: "normal", cardHeight: "normal", cardWidth: "normal", titleFontSize: "normal",
  badgeAlign: "center", titleAlign: "center", highlightAlign: "center", subtitleAlign: "center", buttonAlign: "center",
  statsWidthCustom: null, statsPaddingCustom: null, statsGapCustom: null,
  cardWidthCustom: null, cardHeightCustom: null, cardGapCustom: null, cardRadiusCustom: null,
  titleFontSizeCustom: null, subtitleFontSizeCustom: null, badgeFontSizeCustom: null,
  buttonPaddingYCustom: null, buttonPaddingXCustom: null,
  heroMinHeightCustom: null, contentMaxWidthCustom: null, contentGapCustom: null,
  slideOpacityCustom: null, slideIntervalCustom: null, overlayColorCustom: null,
};

const ALIGN_OPTS = [
  { value: "right", icon: AlignRight, label: "راست" },
  { value: "center", icon: AlignCenter, label: "وسط" },
  { value: "left", icon: AlignLeft, label: "چپ" },
];

const UNITS = ["px", "%", "rem", "vw"] as const;
type Unit = typeof UNITS[number];

function parseDim(v: string | null | undefined): { num: number; unit: Unit } | null {
  if (!v || typeof v !== "string") return null;
  const m = v.trim().match(/^(-?[\d.]+)\s*(px|%|rem|vw)$/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (Number.isNaN(num)) return null;
  return { num, unit: m[2] as Unit };
}
function fmtDim(num: number, unit: Unit): string { return `${num}${unit}`; }

export default function HeroEditorPage() {
  const [config, setConfig] = useState<HeroConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "stats" | "cards" | "typo" | "layout" | "slider">("stats");

  useEffect(() => {
    fetch("/api/admin/hero").then(r => r.json()).then(d => {
      const hero = d.data || d.hero || d;
      if (hero && (hero.badge !== undefined || hero.title1 !== undefined)) setConfig({ ...DEFAULTS, ...hero });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k: keyof HeroConfig, v: string | null) => setConfig(c => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/hero", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
      const d = await res.json();
      setMsg(d.success || d.ok ? "✓ ذخیره شد" : "خطا: " + (d.error || ""));
    } catch { setMsg("خطای شبکه"); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#F58220]" /></div>;

  const inputCls = "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  const AlignPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
      {ALIGN_OPTS.map(o => {
        const Icon = o.icon;
        return <button key={o.value} onClick={() => onChange(o.value)} className={`flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-xs font-bold transition ${value === o.value ? "bg-white text-[#F58220] shadow-sm" : "text-zinc-400"}`}><Icon className="h-3.5 w-3.5" />{o.label}</button>;
      })}
    </div>
  );

  const tabs = [
    { id: "content" as const, label: "محتوا و دکمه‌ها", icon: Type },
    { id: "stats" as const, label: "پنل آمار", icon: Sparkles },
    { id: "cards" as const, label: "کارت‌ها", icon: Square },
    { id: "typo" as const, label: "تایپوگرافی", icon: Type },
    { id: "layout" as const, label: "چیدمان", icon: Layout },
    { id: "slider" as const, label: "اسلایدر", icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-zinc-900">ویرایشگر هیرو</h1><p className="mt-1 text-sm text-zinc-500">کنترل دقیق ابعاد، فاصله‌ها، رنگ‌ها و تایپوگرافی با پیش‌نمایش زنده</p></div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}ذخیره</button>
      </div>
      {msg && <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-bold text-zinc-700">{msg}</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(380px,520px)]">
        <div className="space-y-4">
          <div className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-sm">
            {tabs.map(t => { const Icon = t.icon; return (<button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${activeTab === t.id ? "bg-[#F58220] text-white" : "text-zinc-500 hover:bg-zinc-100"}`}><Icon className="h-3.5 w-3.5" />{t.label}</button>); })}
          </div>

          <Section icon={ImageIcon} title="تصاویر اسلایدر و کارت‌ها">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className={labelCls}>اسلاید ۱</label>
                  <MediaUploader
                    value={config.slide1}
                    onChange={(v) => set("slide1", v)}
                    endpoint="/api/admin/upload"
                    compact
                  />
                  {config.slide1 && <img src={config.slide1} alt="" className="mt-2 h-16 w-full rounded-lg border border-zinc-200 object-cover" />}
                </div>
                <div>
                  <label className={labelCls}>اسلاید ۲</label>
                  <MediaUploader
                    value={config.slide2}
                    onChange={(v) => set("slide2", v)}
                    endpoint="/api/admin/upload"
                    compact
                  />
                  {config.slide2 && <img src={config.slide2} alt="" className="mt-2 h-16 w-full rounded-lg border border-zinc-200 object-cover" />}
                </div>
                <div>
                  <label className={labelCls}>اسلاید ۳</label>
                  <MediaUploader
                    value={config.slide3}
                    onChange={(v) => set("slide3", v)}
                    endpoint="/api/admin/upload"
                    compact
                  />
                  {config.slide3 && <img src={config.slide3} alt="" className="mt-2 h-16 w-full rounded-lg border border-zinc-200 object-cover" />}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <ListingCardEditor
                  label="کارت خدمات"
                  imageField="cardServicesImg"
                  listingIdField="cardServicesListingId"
                  config={config}
                  set={set}
                />
                <ListingCardEditor
                  label="کارت ویژه"
                  imageField="cardFeaturedImg"
                  listingIdField="cardFeaturedListingId"
                  config={config}
                  set={set}
                />
                <ListingCardEditor
                  label="کارت فروش ویژه"
                  imageField="cardExclusiveImg"
                  listingIdField="cardExclusiveListingId"
                  config={config}
                  set={set}
                />
              </div>
            </div>
          </Section>

          {activeTab === "content" && (<>
            <Section icon={Type} title="متن‌ها و تراز">
              <div className="space-y-4">
                <div><label className={labelCls}>بَج (Badge)</label><input value={config.badge || ""} onChange={e => set("badge", e.target.value)} className={inputCls} /><div className="mt-1.5"><span className="text-[10px] text-zinc-400">تراز بَج</span><AlignPicker value={config.badgeAlign || "center"} onChange={v => set("badgeAlign", v)} /></div></div>
                <div><label className={labelCls}>عنوان اصلی (خط اول)</label><input value={config.title1 || ""} onChange={e => set("title1", e.target.value)} className={inputCls} /><div className="mt-1.5"><span className="text-[10px] text-zinc-400">تراز عنوان</span><AlignPicker value={config.titleAlign || "center"} onChange={v => set("titleAlign", v)} /></div></div>
                <div><label className={labelCls}>کلمه هایلایت (نارنجی)</label><input value={config.highlight || ""} onChange={e => set("highlight", e.target.value)} className={inputCls} /><div className="mt-1.5"><span className="text-[10px] text-zinc-400">تراز هایلایت</span><AlignPicker value={config.highlightAlign || "center"} onChange={v => set("highlightAlign", v)} /></div></div>
                <div><label className={labelCls}>زیرعنوان</label><textarea value={config.subtitle || ""} onChange={e => set("subtitle", e.target.value)} className={`${inputCls} h-20 resize-none py-2`} /><div className="mt-1.5"><span className="text-[10px] text-zinc-400">تراز زیرعنوان</span><AlignPicker value={config.subtitleAlign || "center"} onChange={v => set("subtitleAlign", v)} /></div></div>
              </div>
            </Section>
            <Section icon={Type} title="دکمه‌ها">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>متن دکمه ۱</label><input value={config.buttonText || ""} onChange={e => set("buttonText", e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>لینک دکمه ۱</label><input value={config.buttonLink || ""} onChange={e => set("buttonLink", e.target.value)} className={inputCls} dir="ltr" /></div>
                <div><label className={labelCls}>متن دکمه ۲</label><input value={config.secondBtnText || ""} onChange={e => set("secondBtnText", e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>لینک دکمه ۲</label><input value={config.secondBtnLink || ""} onChange={e => set("secondBtnLink", e.target.value)} className={inputCls} dir="ltr" /></div>
              </div>
              <div className="mt-3"><span className="text-[10px] text-zinc-400">تراز دکمه‌ها</span><AlignPicker value={config.buttonAlign || "center"} onChange={v => set("buttonAlign", v)} /></div>
            </Section>
          </>)}

          {activeTab === "stats" && (<Section icon={Sparkles} title="پنل آمار — ابعاد دقیق">
            <PresetRow label="عرض (پیش‌تنظیم سریع)" value={config.statsWidth || "normal"} onChange={v => set("statsWidth", v)} options={[["narrow","باریک (۱۸۰px)"],["normal","عادی (۲۴۰px)"],["wide","پهن (۳۰۰px)"]]} />
            <DimensionControl label="عرض سفارشی پنل آمار" value={config.statsWidthCustom} onChange={v => set("statsWidthCustom", v)} defaultUnit="px" min={120} max={500} step={5} hint="بر مثال ۲۲۰px یا ۷۰٪. خالی = استفاده از پیش‌تنظیم." />
            <DimensionControl label="فاصله داخلی (padding)" value={config.statsPaddingCustom} onChange={v => set("statsPaddingCustom", v)} defaultUnit="px" min={0} max={40} step={1} />
            <DimensionControl label="فاصله بین ردیف‌های آمار (gap)" value={config.statsGapCustom} onChange={v => set("statsGapCustom", v)} defaultUnit="px" min={0} max={24} step={1} />
          </Section>)}

          {activeTab === "cards" && (<Section icon={Square} title="کارت‌های تصویری — ابعاد دقیق">
            <PresetRow label="عرض کارت (پیش‌تنظیم)" value={config.cardWidth || "normal"} onChange={v => set("cardWidth", v)} options={[["narrow","باریک"],["normal","عادی"],["wide","پهن"]]} />
            <PresetRow label="ارتفاع کارت (پیش‌تنظیم)" value={config.cardHeight || "normal"} onChange={v => set("cardHeight", v)} options={[["small","کوتاه"],["normal","عادی"],["large","بلند"]]} />
            <DimensionControl label="عرض سفارشی هر کارت" value={config.cardWidthCustom} onChange={v => set("cardWidthCustom", v)} defaultUnit="px" min={80} max={280} step={4} hint="عرض مستقیم کارت تصویری (مثلاً ۱۴۰px). خالی = پیش‌فرض." />
            <DimensionControl label="ارتفاع سفارشی هر کارت" value={config.cardHeightCustom} onChange={v => set("cardHeightCustom", v)} defaultUnit="px" min={120} max={400} step={4} />
            <DimensionControl label="فاصله بین کارت‌ها (gap)" value={config.cardGapCustom} onChange={v => set("cardGapCustom", v)} defaultUnit="px" min={0} max={40} step={1} />
            <DimensionControl label="گردی گوشه‌ها (radius)" value={config.cardRadiusCustom} onChange={v => set("cardRadiusCustom", v)} defaultUnit="px" min={0} max={32} step={1} />
          </Section>)}

          {activeTab === "typo" && (<Section icon={Type} title="تایپوگرافی — اندازه دقیق فونت">
            <PresetRow label="اندازه عنوان (پیش‌تنظیم)" value={config.titleFontSize || "normal"} onChange={v => set("titleFontSize", v)} options={[["small","کوچک"],["normal","عادی"],["large","بزرگ"]]} />
            <DimensionControl label="اندازه سفارشی عنوان اصلی" value={config.titleFontSizeCustom} onChange={v => set("titleFontSizeCustom", v)} defaultUnit="px" min={20} max={96} step={1} hint="مثلاً ۵۶px یا ۳.۵rem. خالی = پیش‌تنظیم." />
            <DimensionControl label="اندازه زیرعنوان" value={config.subtitleFontSizeCustom} onChange={v => set("subtitleFontSizeCustom", v)} defaultUnit="px" min={12} max={28} step={1} />
            <DimensionControl label="اندازه فونت بَج" value={config.badgeFontSizeCustom} onChange={v => set("badgeFontSizeCustom", v)} defaultUnit="px" min={8} max={20} step={1} />
          </Section>)}

          {activeTab === "layout" && (<Section icon={Layout} title="چیدمان کلی هیرو">
            <DimensionControl label="حداقل ارتفاع هیرو" value={config.heroMinHeightCustom} onChange={v => set("heroMinHeightCustom", v)} defaultUnit="px" min={400} max={1000} step={10} hint="ارتفاع کل سکشن هیرو. مثلاً ۶۴۰px یا ۸۰vh." allowVw={false} />
            <DimensionControl label="حداکثر عرض ستون محتوا" value={config.contentMaxWidthCustom} onChange={v => set("contentMaxWidthCustom", v)} defaultUnit="px" min={320} max={900} step={10} />
            <DimensionControl label="فاصله بین ستون‌ها (gap)" value={config.contentGapCustom} onChange={v => set("contentGapCustom", v)} defaultUnit="px" min={8} max={64} step={2} />
            <DimensionControl label="فاصله داخلی عمودی دکمه‌ها (padding Y)" value={config.buttonPaddingYCustom} onChange={v => set("buttonPaddingYCustom", v)} defaultUnit="px" min={4} max={24} step={1} />
            <DimensionControl label="فاصله داخلی افقی دکمه‌ها (padding X)" value={config.buttonPaddingXCustom} onChange={v => set("buttonPaddingXCustom", v)} defaultUnit="px" min={8} max={48} step={1} />
          </Section>)}

          {activeTab === "slider" && (<Section icon={Sliders} title="اسلایدر پس‌زمینه">
            <DimensionControl label="شفافیت تصویر اسلاید (۰ تا ۱)" value={config.slideOpacityCustom} onChange={v => set("slideOpacityCustom", v)} defaultUnit="px" min={0} max={1} step={0.05} hint="عدد بین ۰ (نامرئی) و ۱ (کاملاً مشخص). پیش‌فرض ۰.۵۵." rawNumberMode />
            <DimensionControl label="فاصله زمانی تعویض اسلاید (میلی‌ثانیه)" value={config.slideIntervalCustom} onChange={v => set("slideIntervalCustom", v)} defaultUnit="px" min={2000} max={15000} step={500} hint="مثلاً ۵۰۰۰ = ۵ ثانیه." rawNumberMode />
            <div className="space-y-2"><label className={labelCls}>رنگ روکش تیره (overlay)</label><div className="flex gap-2"><input type="color" value={config.overlayColorCustom || "#0b0b0b"} onChange={e => set("overlayColorCustom", e.target.value)} className="h-10 w-16 cursor-pointer rounded-lg border border-zinc-200 bg-white p-1" /><input value={config.overlayColorCustom || ""} onChange={e => set("overlayColorCustom", e.target.value)} className={inputCls} dir="ltr" placeholder="#0b0b0b" />{config.overlayColorCustom && <button onClick={() => set("overlayColorCustom", null)} className="rounded-lg border border-zinc-200 px-2 text-xs text-zinc-500 hover:bg-zinc-50">پیش‌فرض</button>}</div></div>
            <div className="space-y-2"><label className={labelCls}>نوع انیمیشن</label><select value={config.animationType || "fade"} onChange={e => set("animationType", e.target.value)} className={inputCls}><option value="fade">Fade (محو)</option><option value="slide">Slide (لغزش)</option><option value="zoom">Zoom (بزرگ‌نمایی)</option></select></div>
          </Section>)}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-2.5"><Eye className="h-4 w-4 text-[#F58220]" /><span className="text-xs font-black text-zinc-700">پیش‌نمایش زنده</span><span className="mr-auto text-[10px] text-zinc-400">تغییرات ذخیره نمی‌شوند تا زمانی که «ذخیره» را بزنید</span></div>
            <div className="p-3"><LivePreview config={config} /></div>
          </div>
          <button onClick={() => { const r: Partial<HeroConfig> = {}; (Object.keys(DEFAULTS) as (keyof HeroConfig)[]).forEach(k => { if (k.endsWith("Custom")) (r as any)[k] = null; }); setConfig(c => ({ ...c, ...r })); setMsg("مقادیر سفارشی پاک شدند"); }} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50"><RotateCcw className="h-3.5 w-3.5" />پاک کردن همه مقادیر سفارشی</button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (<div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-700"><Icon className="h-4 w-4 text-[#F58220]" />{title}</h2><div className="space-y-4">{children}</div></div>);
}

function PresetRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  const inputCls = "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  return (<div><label className="mb-1.5 block text-xs font-bold text-zinc-500">{label}</label><select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>);
}

function DimensionControl({ label, value, onChange, defaultUnit = "px", min, max, step, hint, allowVw = true, rawNumberMode = false }: { label: string; value: string | null; onChange: (v: string | null) => void; defaultUnit?: Unit; min: number; max: number; step: number; hint?: string; allowVw?: boolean; rawNumberMode?: boolean; }) {
  const parsed = useMemo(() => (rawNumberMode ? null : parseDim(value)), [value, rawNumberMode]);
  const num = rawNumberMode ? (value ? parseFloat(value) : NaN) : parsed?.num;
  const unit: Unit = parsed?.unit || defaultUnit;
  const isSet = rawNumberMode ? (value != null && value !== "") : (parsed != null);
  const apply = (newNum: number, newUnit: Unit = unit) => { if (rawNumberMode) { onChange(String(newNum)); return; } onChange(fmtDim(newNum, newUnit)); };
  const clampNum = (n: number) => Math.max(min, Math.min(max, n));
  const adjust = (delta: number) => { const base = (Number.isNaN(num) ? (min + max) / 2 : num); apply(clampNum(base + delta)); };
  const adjustPct = (pct: number) => { const base = (Number.isNaN(num) ? (min + max) / 2 : num); apply(clampNum(Math.round(base * (1 + pct / 100)))); };
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
      <div className="mb-1.5 flex items-center justify-between"><label className="text-xs font-bold text-zinc-600">{label}</label>{isSet && (<button onClick={() => onChange(null)} title="پاک کردن" className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-red-500"><X className="h-3 w-3" />پیش‌فرض</button>)}</div>
      <input type="range" min={min} max={max} step={step} value={Number.isNaN(num) ? (min + max) / 2 : num} onChange={e => apply(parseFloat(e.target.value))} className="w-full accent-[#F58220]" />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <input type="number" min={min} max={max} step={step} value={Number.isNaN(num) ? "" : num} placeholder="—" onChange={e => { const v = e.target.value; if (v === "") { onChange(null); return; } const n = parseFloat(v); if (!Number.isNaN(n)) apply(n); }} className="h-9 w-20 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-800 outline-none focus:border-[#F58220]" />
        {!rawNumberMode && (<select value={unit} onChange={e => { const newUnit = e.target.value as Unit; const n = Number.isNaN(num) ? (min + max) / 2 : num; apply(n, newUnit); }} className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-700 outline-none focus:border-[#F58220]">{UNITS.filter(u => allowVw || u !== "vw").map(u => <option key={u} value={u}>{u}</option>)}</select>)}
        <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5">
          <QuickBtn onClick={() => adjustPct(-10)} title="کاهش ۱۰٪"><Minus className="h-3 w-3" />۱۰٪</QuickBtn>
          <QuickBtn onClick={() => adjust(-1)} title="کاهش ۱">−۱</QuickBtn>
          <QuickBtn onClick={() => adjust(1)} title="افزایش ۱">+۱</QuickBtn>
          <QuickBtn onClick={() => adjustPct(10)} title="افزایش ۱۰٪"><Plus className="h-3 w-3" />۱۰٪</QuickBtn>
        </div>
      </div>
      {hint && <p className="mt-1.5 text-[10px] leading-4 text-zinc-400">{hint}</p>}
      {isSet && !rawNumberMode && (<p className="mt-1 text-[10px] font-bold text-[#F58220]">فعلی: {value}</p>)}
    </div>
  );
}

function QuickBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (<button onClick={onClick} title={title} className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-bold text-zinc-500 transition hover:bg-[#F58220]/10 hover:text-[#F58220]">{children}</button>);
}

/* ============================================================
   ListingCardEditor — for each of the 3 tilted hero cards.
   Combines:
   1. A listing picker (typeahead against /api/listings?q=...) — when a
      listing is selected, its ID is stored and the card shows that
      listing's image + title + price on the homepage (with a link to
      /listings/[slug]).
   2. The existing manual image URL fallback (used when no listing is
      selected OR the selected listing is deleted).
   ============================================================ */
function ListingCardEditor({
  label,
  imageField,
  listingIdField,
  config,
  set,
}: {
  label: string;
  imageField: keyof HeroConfig;
  listingIdField: keyof HeroConfig;
  config: HeroConfig;
  set: (k: keyof HeroConfig, v: string | null) => void;
}) {
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";
  const listingId = (config[listingIdField] as string | null) ?? null;

  // Selected listing preview (fetched once when listingId changes).
  const [preview, setPreview] = useState<{
    id: string;
    slug: string;
    title: string;
    price: string | null;
    priceType: string;
    image: string | null;
    brandName?: string | null;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!listingId) { setPreview(null); return; }
    setPreviewLoading(true);
    // Admin is authed → use the admin detail endpoint so we get full image list +
    // brand name even for listings that wouldn't appear in the first page of
    // the public search. The endpoint returns { listing: {...} }.
    fetch(`/api/admin/listings/${encodeURIComponent(listingId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const l = d.listing ?? d.data;
        if (l) {
          setPreview({
            id: l.id,
            slug: l.slug,
            title: l.title,
            price: l.price != null ? String(l.price) : null,
            priceType: l.priceType,
            image: Array.isArray(l.images) && l.images[0]?.url ? l.images[0].url : null,
            brandName: l.brand?.name ?? null,
          });
        } else {
          setPreview(null);
        }
      })
      .catch(() => { if (!cancelled) setPreview(null); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [listingId]);

  // Typeahead search state.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; slug: string; title: string; price: string | null; priceType: string; image: string | null; brandName?: string | null }>>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/listings?q=${encodeURIComponent(query.trim())}&limit=10`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          const rows = Array.isArray(d.data) ? d.data : [];
          setResults(rows.map((x: any) => ({
            id: x.id,
            slug: x.slug,
            title: x.title,
            price: x.price ?? null,
            priceType: x.priceType,
            image: x.images?.[0]?.url ?? null,
            brandName: x.brand?.name ?? null,
          })));
          setShowResults(true);
        })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const pickListing = (l: typeof results[number]) => {
    set(listingIdField, l.id);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const clearListing = () => {
    set(listingIdField, null);
    setPreview(null);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
      <label className={labelCls}>{label}</label>

      {/* Selected listing preview / picker */}
      {listingId ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-lg border border-[#F58220]/30 bg-[#F58220]/5 p-2">
            {previewLoading ? (
              <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-[#F58220]" />
            ) : (
              <span className="relative mt-0.5 flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-white">
                {preview?.image ? (
                  <img src={preview.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-zinc-300" />
                )}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-zinc-800" title={preview?.title ?? "آگهی انتخاب‌شده"}>
                {preview?.title ?? "آگهی انتخاب‌شده"}
              </p>
              <p className="truncate text-[10px] text-zinc-500" dir="ltr">
                {preview?.brandName ? `${preview.brandName} · ` : ""}id: {listingId}
              </p>
              {preview?.price && (
                <p className="text-[10px] font-bold text-emerald-600">
                  {Number(preview.price).toLocaleString("fa-IR")} ت
                </p>
              )}
            </div>
            <button
              onClick={clearListing}
              title="حذف انتخاب آگهی"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 transition hover:border-red-200 hover:text-red-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] leading-4 text-zinc-400">
            ✅ این کارت در صفحه اصلی، آگهی انتخاب‌شده را نشان می‌دهد (تصویر + عنوان + قیمت + لینک). اگر آگهی حذف شود، تصویر ایستا نمایش داده می‌شود.
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 150)}
              placeholder="انتخاب آگهی برای این کارت…"
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white pr-8 pl-3 text-xs text-zinc-800 outline-none focus:border-[#F58220]"
            />
            {searching && <Loader2 className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-zinc-400" />}
          </div>
          {showResults && results.length > 0 && (
            <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
              {results.map((r) => (
                <button
                  key={r.id}
                  onMouseDown={(e) => { e.preventDefault(); pickListing(r); }}
                  className="flex w-full items-center gap-2 border-b border-zinc-100 px-2 py-2 text-right transition last:border-b-0 hover:bg-[#F58220]/5"
                >
                  <span className="relative flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-100">
                    {r.image ? (
                      <img src={r.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-zinc-300" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="truncate text-xs font-bold text-zinc-800">{r.title}</p>
                    <p className="truncate text-[10px] text-zinc-500">
                      {r.brandName ? `${r.brandName} · ` : ""}
                      {r.price ? `${Number(r.price).toLocaleString("fa-IR")} ت` : "—"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {showResults && query.trim().length >= 2 && !searching && results.length === 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-zinc-200 bg-white p-2 text-center text-[11px] text-zinc-400 shadow-lg">
              آگهی‌ای یافت نشد.
            </div>
          )}
        </div>
      )}

      {/* Manual image URL fallback (used when no listing is selected OR listing is deleted) */}
      <div className="mt-2">
        <p className="mb-1 flex items-center gap-1 text-[10px] text-zinc-400">
          <Link2 className="h-3 w-3" />
          تصویر ایستا (پشتیبان) — وقتی آگهی انتخاب نشده باشد
        </p>
        <MediaUploader
          value={config[imageField] as string | null}
          onChange={(v) => set(imageField, v)}
          endpoint="/api/admin/upload"
          compact
        />
      </div>
    </div>
  );
}

function LivePreview({ config }: { config: HeroConfig }) {
  const alignMap: Record<string, string> = { right: "flex-end", center: "center", left: "flex-start" };
  const titleSize = config.titleFontSizeCustom || (config.titleFontSize === "small" ? "28px" : config.titleFontSize === "large" ? "52px" : "40px");
  const subSize = config.subtitleFontSizeCustom || "16px";
  const badgeSize = config.badgeFontSizeCustom || "12px";
  const slideOpacity = (() => { const n = parseFloat(config.slideOpacityCustom || ""); return Number.isNaN(n) ? 0.55 : Math.max(0, Math.min(1, n)); })();
  const overlay = config.overlayColorCustom || "#0b0b0b";
  const heroMinH = config.heroMinHeightCustom || "420px";
  const contentMaxW = config.contentMaxWidthCustom || "640px";
  const contentGap = config.contentGapCustom || "32px";
  const cardW = config.cardWidthCustom || "150px";
  const cardH = config.cardHeightCustom || "200px";
  const cardGap = config.cardGapCustom || "12px";
  const cardR = config.cardRadiusCustom || "16px";
  const statsW = config.statsWidthCustom || (config.statsWidth === "narrow" ? "180px" : config.statsWidth === "wide" ? "300px" : "240px");
  const statsP = config.statsPaddingCustom || "16px";
  const statsG = config.statsGapCustom || "10px";
  const btnPY = config.buttonPaddingYCustom || "12px";
  const btnPX = config.buttonPaddingXCustom || "24px";
  const align = (k: string | null) => alignMap[k || "center"] || "center";
  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ minHeight: heroMinH, backgroundColor: overlay, display: "flex", flexDirection: "row-reverse", alignItems: "center", gap: contentGap, padding: "16px" }}>
      <div className="absolute inset-0 -z-10"><div className="absolute inset-0" style={{ backgroundImage: `url(${config.slide1 || "/images/hero/hero-construction.png"})`, backgroundSize: "cover", backgroundPosition: "center", opacity: slideOpacity }} /><div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${overlay}b3, ${overlay}80, ${overlay})` }} /><div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(245,130,32,0.15),transparent_70%)]" /></div>
      <div style={{ width: statsW, flexShrink: 0, alignSelf: "stretch", display: "flex", alignItems: "center" }}><div className="w-full rounded-2xl border border-white/10 bg-black/70 p-3 backdrop-blur" style={{ padding: statsP }}><div className="mb-2 flex items-center gap-1.5 border-b border-white/10 pb-2"><span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#F58220] text-[8px] text-[#F58220]">●</span><div className="text-[9px] font-black text-white">آمار لحظه‌ای</div></div><div style={{ display: "flex", flexDirection: "column", gap: statsG }}>{[{v:"۱٬۲۴۸",l:"آگهی فعال"},{v:"۹۵",l:"برند"},{v:"۳۱",l:"استان"}].map(s => (<div key={s.l} className="rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5"><div className="text-xs font-black text-white">{s.v}</div><div className="text-[8px] text-white/40">{s.l}</div></div>))}</div></div></div>
      <div style={{ flex: 1, maxWidth: contentMaxW, display: "flex", flexDirection: "column", gap: "10px", alignItems: align(config.badgeAlign) }}>
        {config.badge && (<span className="inline-flex w-fit items-center gap-1 rounded-full border border-[#F58220]/40 bg-[#F58220]/10 px-2.5 py-1 font-bold text-[#F58220]" style={{ fontSize: badgeSize }}>✓ {config.badge}</span>)}
        <h1 className="font-black leading-tight text-white" style={{ fontSize: titleSize, textAlign: (config.titleAlign || "center") as any }}>{config.title1 || "خرید، فروش و اجاره"}<br /><span className="bg-gradient-to-l from-[#F58220] via-[#ff9a3c] to-[#F47C20] bg-clip-text text-transparent">{config.highlight || "ماشین‌آلات سنگین"}</span></h1>
        {config.subtitle && (<p className="text-white/65" style={{ fontSize: subSize, textAlign: (config.subtitleAlign || "center") as any, maxWidth: "100%" }}>{config.subtitle}</p>)}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: align(config.buttonAlign) }}>
          <span className="rounded-xl bg-[#F58220] font-bold text-white" style={{ padding: `${btnPY} ${btnPX}`, fontSize: "13px" }}>{config.buttonText || "ثبت آگهی رایگان"}</span>
          <span className="rounded-xl border border-white/20 bg-white/5 font-bold text-white backdrop-blur" style={{ padding: `${btnPY} ${btnPX}`, fontSize: "13px" }}>{config.secondBtnText || "مشاهده آگهی‌ها"}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: cardGap, flexShrink: 0 }}>
        {[{src:config.cardServicesImg,t:"خدمات",tag:"SERVICES",tilt:"rotate(-3deg) translateY(8px)",featured:false},{src:config.cardFeaturedImg,t:"ویژه",tag:"FEATURED",tilt:"rotate(2deg) translateY(8px)",featured:true},{src:config.cardExclusiveImg,t:"فروش ۷ روز",tag:"EXCLUSIVE",tilt:"rotate(3deg) translateY(-4px)",featured:false}].map((c,i) => (
          <div key={i} className="relative overflow-hidden border border-white/10 bg-[#111]" style={{ width: cardW, height: cardH, borderRadius: cardR, transform: c.tilt }}>
            {c.featured && <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-[#F58220] px-1.5 py-0.5 text-[8px] font-black text-white">ویژه</span>}
            <img src={c.src || "/images/hero/card-services.png"} alt={c.t} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[7px] font-bold text-[#F58220]">{c.tag}</span>
            <div className="absolute bottom-0 left-0 right-0 p-1.5"><h3 className="text-[11px] font-black text-white">{c.t}</h3></div>
          </div>
        ))}
      </div>
    </div>
  );
}
