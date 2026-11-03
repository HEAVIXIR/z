"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Crown,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toFa, toEnDigits, formatFullPrice } from "@/lib/format";

/* ============================================================
   SellIn7RegisterForm — client component for registering a
   device in the "Sell in 7 Days" campaign.

   Fields:
     deviceName, category, brand, model, year, workingHours,
     condition, location (province/city), sellerName, mobile,
     email, expectedPrice, description.

   Prepayment section explains the configured amount and a
   "پرداخت پیش‌پرداخت" button (dev: simulated → marks as paid).
   On submit: POST /api/sell-in-7-days → success message with
   tracking code.
   ============================================================ */

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  icon: string | null;
};
type Brand = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  country: string | null;
  logoUrl: string | null;
};

const IRAN_PROVINCES = [
  "آذربایجان شرقی",
  "آذربایجان غربی",
  "اردبیل",
  "اصفهان",
  "البرز",
  "ایلام",
  "بوشهر",
  "تهران",
  "چهارمحال و بختیاری",
  "خراسان جنوبی",
  "خراسان رضوی",
  "خراسان شمالی",
  "خوزستان",
  "زنجان",
  "سمنان",
  "سیستان و بلوچستان",
  "فارس",
  "قزوین",
  "قم",
  "کردستان",
  "کرمان",
  "کرمانشاه",
  "کهگیلویه و بویراحمد",
  "گلستان",
  "گیلان",
  "لرستان",
  "مازندران",
  "مرکزی",
  "هرمزگان",
  "همدان",
  "یزد",
];

const CONDITIONS = [
  { v: "NEW", l: "نو" },
  { v: "USED", l: "کارکرده" },
  { v: "REFURBISHED", l: "بازسازی‌شده" },
  { v: "FOR_PARTS", l: "قطعات" },
];

const EMPTY_FORM = {
  deviceName: "",
  categoryId: "",
  brandId: "",
  brandQuery: "",
  modelName: "",
  year: "",
  workingHours: "",
  condition: "USED",
  province: "",
  city: "",
  sellerName: "",
  sellerMobile: "",
  sellerEmail: "",
  expectedPrice: "",
  description: "",
};

export default function SellIn7RegisterForm({
  categories,
  brands,
  prepaymentAmount,
}: {
  categories: Category[];
  brands: Brand[];
  prepaymentAmount: string;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [brandBoxOpen, setBrandBoxOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    trackingCode: string;
    prepaymentPaid: boolean;
  } | null>(null);

  // Root categories for the select (only CATALOG roots as per spec).
  const rootCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories],
  );

  // Brand typeahead.
  const filteredBrands = useMemo(() => {
    const q = form.brandQuery.trim().toLowerCase();
    if (!q) return brands.slice(0, 30);
    return brands
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.nameEn ?? "").toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [brands, form.brandQuery]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const fmt = (n: string) => {
    const digits = toEnDigits(n).replace(/[^\d]/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("en-US");
  };

  const prepay = async () => {
    setPaying(true);
    setError(null);
    // Simulated payment — in production this would redirect to a
    // payment gateway and return here with a transaction ID.
    await new Promise((r) => setTimeout(r, 1200));
    setPaid(true);
    setPaying(false);
  };

  const submit = async () => {
    setError(null);
    if (!form.deviceName || form.deviceName.trim().length < 3) {
      setError("نام دستگاه الزامی است.");
      return;
    }
    if (!form.sellerName || form.sellerName.trim().length < 3) {
      setError("نام فروشنده الزامی است.");
      return;
    }
    const mobile = toEnDigits(form.sellerMobile).replace(/[^\d+]/g, "");
    if (!/^09\d{9}$/.test(mobile)) {
      setError("شماره موبایل معتبر نیست. (مثال: 09121234567)");
      return;
    }
    if (!paid) {
      setError("برای ثبت نهایی، ابتدا پیش‌پرداخت را پرداخت کنید.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        deviceName: form.deviceName.trim(),
        categoryId: form.categoryId || null,
        brandId: form.brandId || null,
        modelName: form.modelName.trim() || null,
        year: form.year ? Number(toEnDigits(form.year)) : null,
        workingHours: form.workingHours
          ? Number(toEnDigits(form.workingHours))
          : null,
        condition: form.condition || null,
        province: form.province || null,
        city: form.city.trim() || null,
        sellerName: form.sellerName.trim(),
        sellerMobile: mobile,
        sellerEmail: form.sellerEmail.trim() || null,
        expectedPrice: toEnDigits(form.expectedPrice).replace(/[^\d]/g, "") || null,
        description: form.description.trim() || null,
        prepayNow: paid,
      };
      const res = await fetch("/api/sell-in-7-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "خطا در ثبت درخواست. دوباره تلاش کنید.");
        setSubmitting(false);
        return;
      }
      setSuccess({
        trackingCode: json.trackingCode,
        prepaymentPaid: !!json.prepaymentPaid,
      });
      setSubmitting(false);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setError(e?.message || "خطای شبکه.");
      setSubmitting(false);
    }
  };

  /* ----------------------- Success state ----------------------- */
  if (success) {
    return (
      <section className="relative overflow-hidden py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_30%,rgba(245,130,32,0.15),transparent_70%)]" />
        <div className="mx-auto max-w-2xl px-6">
          <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-[#141414] to-[#141414] p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-6 text-3xl font-black text-white">
              درخواست شما ثبت شد!
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/60">
              دستگاه شما با موفقیت در کمپین «فروش در ۷ روز» ثبت شد. کارشناسان
              ما در کمتر از ۲۴ ساعت با شما تماس می‌گیرند.
            </p>

            <div className="mt-8 rounded-2xl border border-[#F58220]/30 bg-[#F58220]/5 p-6">
              <div className="text-xs uppercase tracking-wider text-[#F58220]">
                کد رهگیری
              </div>
              <div
                dir="ltr"
                className="mt-2 font-mono text-3xl font-black tracking-[0.3em] text-white"
              >
                {success.trackingCode}
              </div>
              <p className="mt-3 text-[11px] text-white/45">
                این کد را برای پیگیری وضعیت دستگاه خود نگه دارید.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/sell-in-7-days/track?code=${success.trackingCode}`}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-l from-amber-500 to-[#F58220] px-6 text-sm font-bold text-white transition hover:brightness-110"
              >
                <Search className="h-4 w-4" />
                پیگیری درخواست
              </Link>
              <Link
                href="/sell-in-7-days"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-bold text-white transition hover:border-[#F58220]/40 hover:bg-[#F58220]/10"
              >
                <ArrowRight className="h-4 w-4" />
                بازگشت به صفحهٔ کمپین
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ------------------------- Form --------------------------- */
  const inputCls =
    "h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#F58220]/60 focus:bg-white/[0.05]";
  const labelCls =
    "mb-1.5 block text-xs font-bold text-white/60";

  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_10%,rgba(245,130,32,0.1),transparent_70%)]" />
      <div className="mx-auto max-w-4xl px-6 lg:px-10">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-white/40">
          <Link href="/sell-in-7-days" className="hover:text-[#F58220]">
            فروش در ۷ روز
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span className="text-white/70">ثبت دستگاه</span>
        </div>

        {/* Header */}
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#F58220]/30 bg-[#F58220]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-[#F58220]">
            <Crown className="h-4 w-4" />
            HEAVIX GUARANTEE
          </span>
          <h1 className="mt-4 text-3xl font-black text-white lg:text-4xl">
            ثبت دستگاه در کمپین فروش ویژه
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/55">
            فرم زیر را با دقت پر کنید. کارشناسان ما پس از ثبت، با شما تماس
            می‌گیرند.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* MAIN FORM */}
          <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.02] p-6 lg:p-8">
            {/* Device info */}
            <fieldset className="space-y-4">
              <legend className="flex items-center gap-2 text-sm font-black text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F58220]/15 text-xs text-[#F58220]">
                  ۱
                </span>
                اطلاعات دستگاه
              </legend>
              <div>
                <label className={labelCls}>نام دستگاه *</label>
                <input
                  className={inputCls}
                  value={form.deviceName}
                  onChange={(e) => set("deviceName", e.target.value)}
                  placeholder="مثال: بیل مکانیکی کاترپیلار 320"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>دسته‌بندی</label>
                  <select
                    className={inputCls}
                    value={form.categoryId}
                    onChange={(e) => set("categoryId", e.target.value)}
                  >
                    <option value="">انتخاب دسته…</option>
                    {rootCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>برند</label>
                  <div className="relative">
                    <input
                      className={inputCls}
                      value={form.brandQuery}
                      onChange={(e) => {
                        set("brandQuery", e.target.value);
                        setBrandBoxOpen(true);
                      }}
                      onFocus={() => setBrandBoxOpen(true)}
                      onBlur={() => setTimeout(() => setBrandBoxOpen(false), 200)}
                      placeholder={
                        form.brandId
                          ? brands.find((b) => b.id === form.brandId)?.name ??
                            "انتخاب برند…"
                          : "جستجوی برند…"
                      }
                    />
                    {form.brandId && (
                      <button
                        type="button"
                        onClick={() => {
                          set("brandId", "");
                          set("brandQuery", "");
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] text-white/40 hover:text-white"
                      >
                        پاک کردن
                      </button>
                    )}
                    {brandBoxOpen && (
                      <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#141414] p-1 shadow-2xl">
                        {filteredBrands.length === 0 && (
                          <div className="p-3 text-center text-xs text-white/40">
                            برندی یافت نشد.
                          </div>
                        )}
                        {filteredBrands.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              set("brandId", b.id);
                              set("brandQuery", b.name);
                              setBrandBoxOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-sm text-white/80 transition hover:bg-white/5"
                          >
                            {b.logoUrl ? (
                              <img
                                src={b.logoUrl}
                                alt={b.name}
                                className="h-5 w-5 rounded object-contain"
                              />
                            ) : (
                              <span className="flex h-5 w-5 items-center justify-center rounded bg-white/5 text-[10px] text-white/40">
                                {b.name.charAt(0)}
                              </span>
                            )}
                            <span className="flex-1">{b.name}</span>
                            {b.country && (
                              <span className="text-[10px] text-white/30">
                                {b.country}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className={labelCls}>مدل</label>
                  <input
                    className={inputCls}
                    value={form.modelName}
                    onChange={(e) => set("modelName", e.target.value)}
                    placeholder="مثال: 320D"
                  />
                </div>
                <div>
                  <label className={labelCls}>سال ساخت</label>
                  <input
                    className={inputCls}
                    dir="ltr"
                    inputMode="numeric"
                    value={form.year ? toFa(form.year) : ""}
                    onChange={(e) => set("year", toEnDigits(e.target.value))}
                    placeholder="۱۴۰۲"
                  />
                </div>
                <div>
                  <label className={labelCls}>ساعت کار</label>
                  <input
                    className={inputCls}
                    dir="ltr"
                    inputMode="numeric"
                    value={form.workingHours ? toFa(form.workingHours) : ""}
                    onChange={(e) =>
                      set("workingHours", toEnDigits(e.target.value))
                    }
                    placeholder="۳۵۰۰"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>وضعیت</label>
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c.v}
                      type="button"
                      onClick={() => set("condition", c.v)}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                        form.condition === c.v
                          ? "bg-[#F58220] text-white"
                          : "border border-white/10 bg-white/[0.03] text-white/60 hover:border-[#F58220]/40"
                      }`}
                    >
                      {c.l}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>

            {/* Location */}
            <fieldset className="space-y-4 border-t border-white/5 pt-6">
              <legend className="flex items-center gap-2 text-sm font-black text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F58220]/15 text-xs text-[#F58220]">
                  ۲
                </span>
                موقعیت دستگاه
              </legend>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>استان</label>
                  <select
                    className={inputCls}
                    value={form.province}
                    onChange={(e) => set("province", e.target.value)}
                  >
                    <option value="">انتخاب استان…</option>
                    {IRAN_PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>شهر</label>
                  <input
                    className={inputCls}
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="مثال: تهران"
                  />
                </div>
              </div>
            </fieldset>

            {/* Seller info */}
            <fieldset className="space-y-4 border-t border-white/5 pt-6">
              <legend className="flex items-center gap-2 text-sm font-black text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F58220]/15 text-xs text-[#F58220]">
                  ۳
                </span>
                اطلاعات فروشنده
              </legend>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>نام و نام خانوادگی *</label>
                  <input
                    className={inputCls}
                    value={form.sellerName}
                    onChange={(e) => set("sellerName", e.target.value)}
                    placeholder="نام کامل"
                  />
                </div>
                <div>
                  <label className={labelCls}>شماره موبایل *</label>
                  <input
                    className={inputCls}
                    dir="ltr"
                    inputMode="tel"
                    value={form.sellerMobile}
                    onChange={(e) => set("sellerMobile", e.target.value)}
                    placeholder="09121234567"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>ایمیل (اختیاری)</label>
                <input
                  className={inputCls}
                  dir="ltr"
                  type="email"
                  value={form.sellerEmail}
                  onChange={(e) => set("sellerEmail", e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </fieldset>

            {/* Price + description */}
            <fieldset className="space-y-4 border-t border-white/5 pt-6">
              <legend className="flex items-center gap-2 text-sm font-black text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F58220]/15 text-xs text-[#F58220]">
                  ۴
                </span>
                قیمت و توضیحات
              </legend>
              <div>
                <label className={labelCls}>قیمت پیشنهادی (تومان)</label>
                <input
                  className={inputCls}
                  dir="ltr"
                  inputMode="numeric"
                  value={form.expectedPrice ? toFa(fmt(form.expectedPrice)) : ""}
                  onChange={(e) =>
                    set("expectedPrice", toEnDigits(e.target.value))
                  }
                  placeholder="مثال: ۸٬۵۰۰٬۰۰۰٬۰۰۰"
                />
                {form.expectedPrice && (
                  <p className="mt-1 text-[11px] text-white/40">
                    {formatFullPrice(BigInt(toEnDigits(form.expectedPrice).replace(/[^\d]/g, "") || "0"))}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>توضیحات</label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#F58220]/60 focus:bg-white/[0.05]"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="شرح کامل دستگاه، تاریخچهٔ تعمیرات، تجهیزات جانبی، وضعیت فنی و…"
                />
              </div>
            </fieldset>
          </div>

          {/* SIDEBAR — prepayment + submit */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-[#F58220]/20 bg-gradient-to-br from-amber-950/30 via-[#141414] to-[#141414] p-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F58220]">
                <Lock className="h-4 w-4" />
                پیش‌پرداخت رزرو
              </div>
              <div className="mt-3 text-3xl font-black text-white">
                {formatFullPrice(BigInt(prepaymentAmount))}
              </div>
              <p className="mt-2 text-xs leading-6 text-white/55">
                هزینهٔ کارشناسی فنی، حقوقی و ارزش‌گذاری توسط تیم HEAVIX. در صورت
                عدم فروش در ۷ روز، کامل بازگردانده می‌شود.
              </p>

              {paid ? (
                <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  پیش‌پرداخت پرداخت شد
                </div>
              ) : (
                <button
                  type="button"
                  disabled={paying}
                  onClick={prepay}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-amber-500 to-[#F58220] text-sm font-bold text-white shadow-lg shadow-orange-950/40 transition hover:brightness-110 disabled:opacity-60"
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      در حال پرداخت…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      پرداخت پیش‌پرداخت
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                تضمین هویکس
              </div>
              <ul className="mt-3 space-y-2 text-[11px] leading-6 text-white/55">
                <li className="flex gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#F58220]" />
                  کارشناسی فنی و حقوقی توسط تیم HEAVIX
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#F58220]" />
                  ارزش‌گذاری شفاف بر اساس داده بازار
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#F58220]" />
                  کارمزد فقط ۱٪ در صورت فروش
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#F58220]" />
                  بازگشت کامل پیش‌پرداخت در صورت عدم فروش
                </li>
              </ul>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={submitting || !paid}
              onClick={submit}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-amber-500 to-[#F58220] text-sm font-black text-white shadow-lg shadow-orange-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  در حال ثبت…
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  ثبت نهایی درخواست
                  <ArrowLeft className="h-4 w-4" />
                </>
              )}
            </button>
            {!paid && (
              <p className="text-center text-[10px] text-white/40">
                برای ثبت نهایی، ابتدا پیش‌پرداخت را پرداخت کنید.
              </p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
