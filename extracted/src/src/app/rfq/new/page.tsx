"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  PackageSearch,
  Send,
  User,
  Phone,
  Mail,
  MapPin,
  CalendarClock,
  Tag,
  Users,
  Wallet,
  FileText,
  Type,
  Building2,
} from "lucide-react";

/* ============================================================
   /rfq/new — public form to submit a new RFQ
   ============================================================ */

type FormState = {
  title: string;
  description: string;
  machineType: string;
  brandPref: string;
  quantity: string;
  budgetMin: string;
  budgetMax: string;
  location: string;
  deadline: string;
  terms: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
};

const INITIAL: FormState = {
  title: "",
  description: "",
  machineType: "",
  brandPref: "",
  quantity: "1",
  budgetMin: "",
  budgetMax: "",
  location: "",
  deadline: "",
  terms: "",
  buyerName: "",
  buyerPhone: "",
  buyerEmail: "",
};

const MACHINE_TYPES = [
  "بیل مکانیکی",
  "لودر",
  "بلدوزر",
  "گریدر",
  "دامپ‌تراک",
  "جرثقیل",
  "غلتک راه‌سازی",
  "فورک‌لیفت",
  "کمپرسور",
  "ژنراتور",
  "سایر",
];

const INPUT_CLS =
  "h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#F58220] focus:bg-white/10";
const TEXTAREA_CLS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#F58220] focus:bg-white/10";

export default function NewRFQPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onlyDigits = (v: string) => v.replace(/[^\d]/g, "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("عنوان درخواست را وارد کنید");
      return;
    }
    if (!form.buyerPhone.trim()) {
      setError("شماره تماس الزامی است");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity) || 1,
          budgetMin: form.budgetMin ? onlyDigits(form.budgetMin) : undefined,
          budgetMax: form.budgetMax ? onlyDigits(form.budgetMax) : undefined,
          deadline: form.deadline || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "ثبت درخواست ناموفق بود");
      }
      setSuccess(true);
      setTimeout(() => router.push("/rfq"), 1800);
    } catch (err: any) {
      setError(err?.message ?? "خطای سرور");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        <div className="mx-auto max-w-3xl px-6 py-10 lg:px-10">
          {/* Breadcrumb */}
          <Link
            href="/rfq"
            className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-white/40 transition hover:text-[#F58220]"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            بازگشت به فهرست درخواست‌ها
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F58220]/15">
              <PackageSearch className="h-7 w-7 text-[#F58220]" />
            </div>
            <h1 className="text-3xl font-black text-white">ثبت درخواست خرید (RFQ)</h1>
            <p className="mt-2 text-sm text-white/50">
              نیاز خود را شرح دهید تا فروشندگان سراسر کشور به شما پیشنهاد قیمت
              ارسال کنند.
            </p>
          </div>

          {success ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.07] p-10 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-400" />
              <h2 className="text-xl font-black text-white">درخواست شما ثبت شد!</h2>
              <p className="mt-2 text-sm text-white/60">
                فروشندگان به‌زودی پیشنهادهای خود را ارسال خواهند کرد. در حال انتقال
                به فهرست درخواست‌ها...
              </p>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="space-y-6 rounded-3xl border border-white/10 bg-[#111] p-6 lg:p-8"
            >
              {/* Title */}
              <Field
                label="عنوان درخواست"
                icon={Type}
                required
                hint="مثال: خرید بیل مکانیکی کوماتسو PC200"
              >
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="عنوان کوتاه و واضح"
                  className={INPUT_CLS}
                  required
                />
              </Field>

              {/* Machine type + brand */}
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="نوع ماشین‌آلات" icon={Tag}>
                  <select
                    value={form.machineType}
                    onChange={(e) => update("machineType", e.target.value)}
                    className={INPUT_CLS}
                  >
                    <option value="">انتخاب کنید</option>
                    {MACHINE_TYPES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="برند ترجیحی" icon={Building2}>
                  <input
                    type="text"
                    value={form.brandPref}
                    onChange={(e) => update("brandPref", e.target.value)}
                    placeholder="کوماتسو، کاترپیلار، ولوو..."
                    className={INPUT_CLS}
                  />
                </Field>
              </div>

              {/* Quantity + Location */}
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="تعداد دستگاه" icon={Users}>
                  <input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => update("quantity", onlyDigits(e.target.value))}
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="استان / شهر" icon={MapPin}>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    placeholder="تهران، اصفهان..."
                    className={INPUT_CLS}
                  />
                </Field>
              </div>

              {/* Budget */}
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="حداقل بودجه (تومان)" icon={Wallet}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.budgetMin}
                    onChange={(e) => update("budgetMin", e.target.value)}
                    placeholder="5000000000"
                    className={INPUT_CLS}
                    dir="ltr"
                  />
                </Field>
                <Field label="حداکثر بودجه (تومان)" icon={Wallet}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.budgetMax}
                    onChange={(e) => update("budgetMax", e.target.value)}
                    placeholder="8000000000"
                    className={INPUT_CLS}
                    dir="ltr"
                  />
                </Field>
              </div>

              {/* Deadline */}
              <Field label="مهلت پاسخ‌گویی" icon={CalendarClock}>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => update("deadline", e.target.value)}
                  className={INPUT_CLS}
                  dir="ltr"
                />
              </Field>

              {/* Description */}
              <Field
                label="توضیحات و مشخصات"
                icon={FileText}
                hint="سال ساخت، وضعیت، گیربکس، ساعت کار و هر جزئیات مهم دیگر"
              >
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={5}
                  placeholder="نیاز خود را به‌طور کامل شرح دهید..."
                  className={TEXTAREA_CLS + " resize-none"}
                />
              </Field>

              {/* Terms */}
              <Field
                label="شرایط پرداخت و تحویل"
                icon={FileText}
                hint="نحوه پرداخت، مدت تحویل، گارانتی و..."
              >
                <textarea
                  value={form.terms}
                  onChange={(e) => update("terms", e.target.value)}
                  rows={3}
                  placeholder="نقدی، قسطی، گارانتی ۶ ماهه..."
                  className={TEXTAREA_CLS + " resize-none"}
                />
              </Field>

              {/* Buyer contact */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <h3 className="mb-4 text-sm font-black text-[#F58220]">
                  اطلاعات تماس
                </h3>
                <div className="grid gap-5 md:grid-cols-3">
                  <Field label="نام و نام خانوادگی" icon={User}>
                    <input
                      type="text"
                      value={form.buyerName}
                      onChange={(e) => update("buyerName", e.target.value)}
                      placeholder="نام خریدار"
                      className={INPUT_CLS}
                    />
                  </Field>
                  <Field label="شماره تماس" icon={Phone} required>
                    <input
                      type="tel"
                      value={form.buyerPhone}
                      onChange={(e) => update("buyerPhone", onlyDigits(e.target.value))}
                      placeholder="0912XXXXXXX"
                      className={INPUT_CLS}
                      dir="ltr"
                      required
                    />
                  </Field>
                  <Field label="ایمیل" icon={Mail}>
                    <input
                      type="email"
                      value={form.buyerEmail}
                      onChange={(e) => update("buyerEmail", e.target.value)}
                      placeholder="name@example.com"
                      className={INPUT_CLS}
                      dir="ltr"
                    />
                  </Field>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3 text-sm font-bold text-red-400">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] py-3.5 text-sm font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#ff8c38] disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                ثبت درخواست خرید
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  required,
  hint,
  children,
}: {
  label: string;
  icon?: any;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-xs font-bold text-white/70">
        {Icon && <Icon className="h-3.5 w-3.5 text-[#F58220]" />}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-white/35">{hint}</p>}
    </div>
  );
}
