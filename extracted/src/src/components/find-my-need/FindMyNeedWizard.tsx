"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  Search,
  Loader2,
  MapPin,
  Wallet,
  Tag,
  ArrowLeft,
} from "lucide-react";
import { toFa, formatCompactPrice, PRICE_TYPE_LABELS } from "@/lib/format";

type Category = { id: string; name: string; slug: string; icon?: string | null };
type Brand = { id: string; name: string; slug: string; logoUrl?: string | null };

type Step = 0 | 1 | 2 | 3 | 4;

type SearchResult = {
  id: string;
  slug: string;
  title: string;
  price: string | null;
  priceType: string;
  city?: string | null;
  province?: string | null;
  brandName?: string | null;
  image: string | null;
  icon?: string | null;
  year?: number | null;
};

export default function FindMyNeedWizard({
  categories,
  brands,
}: {
  categories: Category[];
  brands: Brand[];
}) {
  const [step, setStep] = useState<Step>(0);
  const [useCase, setUseCase] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [transaction, setTransaction] = useState<string>("SALE");
  const [city, setCity] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const TRANSACTION_OPTIONS = [
    { v: "SALE", l: "خرید", icon: "💰" },
    { v: "RENT", l: "اجاره", icon: "🚛" },
    { v: "SALE_AND_RENT", l: "خرید/اجاره", icon: "🔁" },
  ];

  const CITIES = [
    "تهران",
    "اصفهان",
    "شیراز",
    "مشهد",
    "اهواز",
    "کرج",
    "تبریز",
    "کرمانشاه",
    "رشت",
    "قم",
  ];

  const BUDGETS = [
    { v: "0-5000000000", l: "زیر ۵ میلیارد" },
    { v: "5000000000-15000000000", l: "۵ تا ۱۵ میلیارد" },
    { v: "15000000000-50000000000", l: "۱۵ تا ۵۰ میلیارد" },
    { v: "50000000000-100000000000", l: "۵۰ تا ۱۰۰ میلیارد" },
    { v: "100000000000-", l: "بیش از ۱۰۰ میلیارد" },
  ];

  const handleSearch = async () => {
    setLoading(true);
    setResults([]);
    try {
      const params = new URLSearchParams();
      if (useCase) params.set("category", useCase);
      if (transaction) params.set("type", transaction);
      if (budget) {
        const [min, max] = budget.split("-");
        if (min && min !== "0") params.set("minPrice", min);
        if (max) params.set("maxPrice", max);
      }
      if (city) params.set("city", city);
      params.set("limit", "12");

      const res = await fetch(`/api/admin/listings?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (Array.isArray(data.listings)) setResults(data.listings);
      else if (Array.isArray(data)) setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setStep(4);
    }
  };

  const next = () => setStep((s) => Math.min(4, (s + 1) as Step) as Step);
  const prev = () => setStep((s) => Math.max(0, (s - 1) as Step) as Step);

  const stepLabels = ["کاربرد", "بودجه", "نوع معامله", "شهر", "نتایج"];

  return (
    <div>
      {/* Stepper */}
      <div className="mb-8 flex items-center justify-between">
        {stepLabels.map((label, idx) => (
          <div key={label} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => idx < step && setStep(idx as Step)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                idx < step
                  ? "bg-emerald-500 text-white"
                  : idx === step
                    ? "bg-[#F58220] text-white"
                    : "border border-white/10 bg-white/[0.04] text-white/40"
              }`}
              disabled={idx > step}
            >
              {idx < step ? <CheckCircle2 className="h-4 w-4" /> : toFa(idx + 1)}
            </button>
            <span
              className={`mr-2 text-xs font-bold ${
                idx === step ? "text-white" : "text-white/40"
              }`}
            >
              {label}
            </span>
            {idx < stepLabels.length - 1 && (
              <div className="mx-3 h-0.5 flex-1 bg-white/10" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-3xl border border-white/10 bg-[#111] p-6 lg:p-8">
        {/* Step 0 — use case */}
        {step === 0 && (
          <div>
            <h2 className="mb-1 text-xl font-black text-white">
              ماشین را برای چه کاربردی می‌خواهید؟
            </h2>
            <p className="mb-6 text-xs text-white/50">
              دسته‌بندی اصلی دستگاه را انتخاب کنید
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setUseCase(c.slug)}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-right transition ${
                    useCase === c.slug
                      ? "border-[#F58220] bg-[#F58220]/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/30"
                  }`}
                >
                  <span className="text-2xl">{c.icon ?? "🚜"}</span>
                  <span className="text-sm font-bold text-white">{c.name}</span>
                  {useCase === c.slug && (
                    <CheckCircle2 className="mr-auto h-4 w-4 text-[#F58220]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1 — budget */}
        {step === 1 && (
          <div>
            <h2 className="mb-1 text-xl font-black text-white">
              بودجه شما چقدر است؟
            </h2>
            <p className="mb-6 text-xs text-white/50">
              محدوده بودجه‌ای که در نظر دارید را انتخاب کنید
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {BUDGETS.map((b) => (
                <button
                  key={b.v}
                  type="button"
                  onClick={() => setBudget(b.v)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-right transition ${
                    budget === b.v
                      ? "border-[#F58220] bg-[#F58220]/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/30"
                  }`}
                >
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                    <Wallet className="h-4 w-4 text-[#F58220]" />
                    {b.l}
                  </span>
                  {budget === b.v && (
                    <CheckCircle2 className="h-4 w-4 text-[#F58220]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — transaction */}
        {step === 2 && (
          <div>
            <h2 className="mb-1 text-xl font-black text-white">
              نوع معامله چیست؟
            </h2>
            <p className="mb-6 text-xs text-white/50">
              می‌خواهید دستگاه را بخرید، اجاره کنید یا هر دو؟
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {TRANSACTION_OPTIONS.map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setTransaction(t.v)}
                  className={`flex flex-col items-center gap-3 rounded-2xl border p-6 transition ${
                    transaction === t.v
                      ? "border-[#F58220] bg-[#F58220]/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/30"
                  }`}
                >
                  <span className="text-4xl">{t.icon}</span>
                  <span className="text-sm font-bold text-white">{t.l}</span>
                  {transaction === t.v && (
                    <CheckCircle2 className="h-4 w-4 text-[#F58220]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — city */}
        {step === 3 && (
          <div>
            <h2 className="mb-1 text-xl font-black text-white">
              در کدام شهر هستید؟
            </h2>
            <p className="mb-6 text-xs text-white/50">
              شهر یا استان خود را انتخاب کنید (اختیاری)
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => setCity("")}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-right transition ${
                  city === ""
                    ? "border-[#F58220] bg-[#F58220]/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/30"
                }`}
              >
                <MapPin className="h-4 w-4 text-[#F58220]" />
                <span className="text-sm font-bold text-white">همه شهرها</span>
                {city === "" && (
                  <CheckCircle2 className="mr-auto h-4 w-4 text-[#F58220]" />
                )}
              </button>
              {CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-right transition ${
                    city === c
                      ? "border-[#F58220] bg-[#F58220]/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/30"
                  }`}
                >
                  <MapPin className="h-4 w-4 text-[#F58220]" />
                  <span className="text-sm font-bold text-white">{c}</span>
                  {city === c && (
                    <CheckCircle2 className="mr-auto h-4 w-4 text-[#F58220]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 — results */}
        {step === 4 && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">
                دستگاه‌های پیشنهادی برای شما
              </h2>
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-bold text-white transition hover:border-[#F58220]/40 hover:text-[#F58220]"
              >
                <Search className="h-3.5 w-3.5" />
                جستجوی مجدد
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#F58220]" />
                <p className="mt-4 text-sm text-white/55">
                  در حال جستجوی بهترین دستگاه‌ها...
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-white/50">
                  دستگاهی مطابق معیارهای شما یافت نشد.
                </p>
                <p className="mt-1 text-xs text-white/35">
                  معیارها را تغییر دهید و دوباره امتحان کنید.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((r) => (
                  <Link
                    key={r.id}
                    href={`/listings/${r.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] transition hover:-translate-y-1 hover:border-[#F58220]/40"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
                      {r.image ? (
                         
                        <img
                          src={r.image}
                          alt={r.title}
                          className="h-full w-full object-cover transition group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-5xl">
                          {r.icon ?? "🚜"}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#F58220]">
                        {r.brandName ?? "بدون برند"}
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-white transition group-hover:text-[#F58220]">
                        {r.title}
                      </h3>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-black text-[#F58220]">
                          {r.price ? formatCompactPrice(Number(r.price)) : PRICE_TYPE_LABELS[r.priceType] ?? "تماس"}
                        </span>
                        {r.city && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-white/45">
                            <MapPin className="h-3 w-3" />
                            {r.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 4 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-bold text-white/70 transition hover:border-white/30 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
            مرحله قبل
          </button>

          {step === 3 ? (
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
            >
              <Search className="h-4 w-4" />
              مشاهده نتایج
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={
                (step === 0 && !useCase) ||
                (step === 1 && !budget)
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-30"
            >
              مرحله بعد
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setStep(0)}
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#F58220]"
          >
            <Tag className="h-4 w-4" />
            شروع دوبارهٔ جستجو
          </button>
        </div>
      )}
    </div>
  );
}
