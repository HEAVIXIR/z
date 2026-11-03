"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

const TRANSACTIONS = [
  { v: "SALE", l: "خرید" },
  { v: "RENT", l: "اجاره" },
  { v: "SALE_AND_RENT", l: "خرید/اجاره" },
];

const PROVINCES = [
  "تهران", "اصفهان", "فارس", "خراسان رضوی", "خوزستان", "البرز",
  "آذربایجان شرقی", "آذربایجان غربی", "گیلان", "کرمانشاه", "قم", "کرمان",
];

export default function BuyRequestForm({
  categories,
}: {
  categories: { id: string; name: string; slug: string; icon?: string | null }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    brandPref: "",
    transaction: "SALE",
    budgetMin: "",
    budgetMax: "",
    city: "",
    province: "",
    deadline: "",
    requesterName: "",
    requesterPhone: "",
  });

  const setField = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("عنوان درخواست را وارد کنید.");
      return;
    }
    if (!form.requesterPhone || form.requesterPhone.length < 10) {
      setError("شماره تماس معتبر وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
          budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "ثبت درخواست ناموفق بود.");
      }
      setSuccess(true);
      setTimeout(() => router.push("/"), 2500);
    } catch (err: any) {
      setError(err?.message ?? "خطا در ثبت درخواست.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.06] p-10 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
        <h2 className="mt-4 text-2xl font-black text-white">درخواست شما ثبت شد</h2>
        <p className="mt-2 text-sm text-white/55">
          کارشناسان هویکس درخواست شما را بررسی می‌کنند و در صورت تأیید، آن را برای
          فروشندگان قابل‌مشاهده می‌کنند.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white"
        >
          بازگشت به خانه
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="rounded-3xl border border-white/10 bg-[#111] p-6">
        <label className="mb-1 block text-xs font-bold text-white/70">
          عنوان درخواست <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
          placeholder="مثلاً بیل مکانیکی کاترپیلار ۳۲۰ مدل ۲۰۲۰ به بالا"
          required
        />

        <label className="mb-1 mt-4 block text-xs font-bold text-white/70">
          توضیحات
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#F58220]"
          placeholder="مشخصات دقیق دستگاه مورد نیاز، شرایط کارکرد، وضعیت فنی و سایر جزئیات..."
        />
      </div>

      {/* Category + Brand */}
      <div className="rounded-3xl border border-white/10 bg-[#111] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-white/70">
              دسته‌بندی
            </label>
            <select
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
            >
              <option value="">انتخاب کنید...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-white/70">
              برند پیشنهادی
            </label>
            <input
              type="text"
              value={form.brandPref}
              onChange={(e) => setField("brandPref", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
              placeholder="مثلاً کاترپیلار، کوماتسو، هیوندای"
            />
          </div>
        </div>
      </div>

      {/* Transaction + Budget */}
      <div className="rounded-3xl border border-white/10 bg-[#111] p-6">
        <label className="mb-2 block text-xs font-bold text-white/70">
          نوع معامله
        </label>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {TRANSACTIONS.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setField("transaction", t.v)}
              className={`h-11 rounded-xl text-sm font-bold transition ${
                form.transaction === t.v
                  ? "bg-[#F58220] text-white"
                  : "border border-white/10 bg-white/[0.04] text-white/70 hover:border-white/30"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-white/70">
              حداقل بودجه (تومان)
            </label>
            <input
              type="number"
              value={form.budgetMin}
              onChange={(e) => setField("budgetMin", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
              placeholder="مثلاً ۵۰۰۰۰۰۰۰۰۰"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-white/70">
              حداکثر بودجه (تومان)
            </label>
            <input
              type="number"
              value={form.budgetMax}
              onChange={(e) => setField("budgetMax", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
              placeholder="مثلاً ۱۵۰۰۰۰۰۰۰۰۰"
            />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="rounded-3xl border border-white/10 bg-[#111] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-white/70">
              استان
            </label>
            <select
              value={form.province}
              onChange={(e) => setField("province", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
            >
              <option value="">انتخاب کنید...</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-white/70">
              شهر
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
              placeholder="مثلاً تهران"
            />
          </div>
        </div>

        <label className="mb-1 mt-4 block text-xs font-bold text-white/70">
          مهلت تحویل (اختیاری)
        </label>
        <input
          type="text"
          value={form.deadline}
          onChange={(e) => setField("deadline", e.target.value)}
          className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
          placeholder="مثلاً ۳ ماه، فوری، بدون مهلت"
        />
      </div>

      {/* Contact */}
      <div className="rounded-3xl border border-white/10 bg-[#111] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-white/70">
              نام و نام خانوادگی
            </label>
            <input
              type="text"
              value={form.requesterName}
              onChange={(e) => setField("requesterName", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
              placeholder="نام شما"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-white/70">
              شماره تماس <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              value={form.requesterPhone}
              onChange={(e) => setField("requesterPhone", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#F58220]"
              placeholder="09xxxxxxxxx"
              required
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#F58220]"
        >
          <ArrowLeft className="h-4 w-4 rotate-180" />
          بازگشت
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#F58220] px-8 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          ثبت درخواست خرید
        </button>
      </div>
    </form>
  );
}
