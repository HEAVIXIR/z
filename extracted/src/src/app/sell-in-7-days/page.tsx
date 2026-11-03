import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  ShieldCheck,
  BadgeDollarSign,
  FileSignature,
  Crown,
  CheckCircle2,
  Search,
  Clock,
  TrendingUp,
  PhoneCall,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { db } from "@/lib/db";
import { toFa, formatFullPrice } from "@/lib/format";
import { getActiveStats } from "@/lib/site-stats";

export const dynamic = "force-dynamic";

/* ============================================================
   /sell-in-7-days — landing page for the "Sell in 7 Days"
   campaign. Explains the 4-step process, shows the 4
   AI-generated step images, links to the registration form
   and the tracking page.
   ============================================================ */

const STEPS = [
  {
    num: "۰۱",
    fa: "ثبت دستگاه و تأیید رزرو",
    en: "Register & Reserve",
    desc:
      "اطلاعات دستگاه را ثبت می‌کنید و با پرداخت پیش‌پرداخت، رزرو ورود به کمپین فروش ویژه تأیید می‌شود. کارشناس ما در کمتر از ۲۴ ساعت با شما تماس می‌گیرد.",
    icon: ClipboardList,
    image: "/images/sell-in-7-days/step-1.jpg",
    points: ["ثبت آنلاین دستگاه", "تأیید فوری رزرو", "تماس کارشناس در ۲۴ ساعت"],
  },
  {
    num: "۰۲",
    fa: "کارشناسی فنی، حقوقی و بدنه",
    en: "Inspection",
    desc:
      "کارشناسان هویکس دستگاه را از نظر فنی، حقوقی و سلامت بدنه به‌طور کامل بررسی می‌کنند و گواهی کارشناسی HEAVIX Verified صادر می‌شود.",
    icon: ShieldCheck,
    image: "/images/sell-in-7-days/step-2.jpg",
    points: ["کارشناسی فنی موتور و گیربکس", "بررسی اسناد حقوقی", "گواهی HEAVIX Verified"],
  },
  {
    num: "۰۳",
    fa: "ارزش‌گذاری و اعلام قیمت",
    en: "Valuation",
    desc:
      "بر اساس گزارش کارشناسی، شرایط بازار و قیمت مشابه‌ها، قیمت واقعی و منصفانه دستگاه تعیین و به شما اعلام می‌شود.",
    icon: BadgeDollarSign,
    image: "/images/sell-in-7-days/step-3.jpg",
    points: ["قیمت واقعی و شفاف", "مبتنی بر داده بازار", "قابل قبول یا رد"],
  },
  {
    num: "۰۴",
    fa: "عقد قرارداد و تسویه",
    en: "Contract & Settlement",
    desc:
      "پس از پذیرش قیمت، قرارداد رسمی منعقد و دستگاه به خریدار تحویل می‌شود. تسویه نهایی انجام می‌گیرد و کارمزد ۱٪ فروش محاسبه می‌شود.",
    icon: FileSignature,
    image: "/images/sell-in-7-days/step-4.jpg",
    points: ["قرارداد رسمی", "تسویه نهایی فوری", "کارمزد فقط ۱٪ فروش"],
  },
];

const FAQS = [
  {
    q: "اگر دستگاه تا ۷ روز فروخته نشود چه می‌شود؟",
    a: "هزینه آگهی کاملاً رایگان می‌شود و پیش‌پرداخت شما به‌طور کامل بازگردانده می‌شود. دستگاه همچنان در بازار هویکس فعال می‌ماند.",
  },
  {
    q: "پیش‌پرداخت شامل چه هزینه‌هایی است؟",
    a: "پیش‌پرداخت هزینه کارشناسی فنی، حقوقی و ارزش‌گذاری است که توسط تیم HEAVIX انجام می‌شود. مبلغ از پیش اعلام می‌شود و قابل بازگشت است.",
  },
  {
    q: "کارمزد فروش چگونه محاسبه می‌شود؟",
    a: "فقط ۱٪ از مبلغ نهایی فروش به‌عنوان کارمزد هویکس کسر می‌شود. هیچ هزینه پنهان دیگری وجود ندارد.",
  },
  {
    q: "آیا لازم است دستگاه را به محل دیگری منتقل کنم؟",
    a: "خیر. کارشناسی در محل دستگاه انجام می‌شود. پس از فروش، انتقال توسط خریدار هماهنگ می‌گردد.",
  },
];

const TRUST_CHIPS = [
  "کارشناسی فنی",
  "کارشناسی حقوقی",
  "ارزش‌گذاری رسمی",
  "مالک تأیید‌شده",
  "آماده انتقال",
];

async function getPrepaymentAmount(): Promise<bigint> {
  try {
    const s = await db.siteSettings.findUnique({ where: { id: "main" } });
    if (s?.sellIn7DaysPrepaymentAmount) return s.sellIn7DaysPrepaymentAmount;
  } catch {
    /* ignore */
  }
  return 500_000n;
}

export default async function SellIn7DaysLandingPage() {
  const [categories, settings, activeStats] = await Promise.all([
    db.category.findMany({
      where: { active: true, layer: "CATALOG", parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, icon: true },
    }),
    db.siteSettings.findUnique({ where: { id: "main" } }),
    getActiveStats(),
  ]);

  const prepaymentAmount = await getPrepaymentAmount();

  const heroStats = activeStats.length > 0
    ? activeStats.slice(0, 4)
    : [
        { value: "۷", labelFa: "روز تضمین فروش" },
        { value: "۱٪", labelFa: "کارمزد فروش" },
        { value: toFa(31), labelFa: "استان تحت پوشش" },
        { value: toFa(24), labelFa: "ساعت تماس کارشناس" },
      ];

  const heroStatsNormalized = heroStats.map((s: any) => ({
    value: s.value,
    label: s.labelFa,
  }));

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          parentId: null,
        }))}
      />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden pb-20 pt-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_20%,rgba(245,130,32,0.15),transparent_70%)]" />
          <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#F58220]/30 bg-[#F58220]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-[#F58220]">
                <Crown className="h-4 w-4" />
                HEAVIX GUARANTEE
              </span>
              <h1 className="mt-6 text-4xl font-black leading-tight text-white lg:text-6xl">
                فروش دستگاه شما{" "}
                <span className="bg-gradient-to-l from-amber-400 to-[#F58220] bg-clip-text text-transparent">
                  در ۷ روز
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-white/60 lg:text-base">
                دستگاهت را ثبت کن. ما با شبکهٔ دیلرها و خریداران فعال سراسر ایران
                تطبیق می‌دهیم. اگر تا ۷ روز فروخته نشد، هزینهٔ آگهی کاملاً رایگان
                می‌شود.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/sell-in-7-days/register"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-l from-amber-500 to-[#F58220] px-8 text-sm font-bold text-white shadow-lg shadow-orange-950/40 transition hover:brightness-110"
                >
                  ثبت دستگاه
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  href="/sell-in-7-days/track"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 text-sm font-bold text-white transition hover:border-[#F58220]/40 hover:bg-[#F58220]/10"
                >
                  <Search className="h-4 w-4" />
                  پیگیری درخواست
                </Link>
              </div>
              {/* Hero stats */}
              <div className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
                {heroStatsNormalized.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                  >
                    <div className="text-2xl font-black text-[#F58220]">{s.value}</div>
                    <div className="mt-1 text-[11px] text-white/55">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4-STEP PROCESS WITH AI IMAGES */}
        <section className="relative overflow-hidden py-20">
          <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
            <div className="mx-auto mb-16 flex max-w-3xl flex-col items-center text-center">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#F58220]">
                HOW IT WORKS
              </span>
              <h2 className="mt-3 text-3xl font-black text-white lg:text-5xl">
                فرآیند فروش در ۴ گام
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/55">
                از ثبت تا تسویه — همراه با کارشناسان هویکس در تمام مراحل.
              </p>
            </div>

            <div className="space-y-8">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const reverse = idx % 2 === 1;
                return (
                  <div
                    key={step.num}
                    className={`grid items-stretch gap-6 lg:grid-cols-2 lg:gap-12 ${
                      reverse ? "lg:[direction:ltr]" : ""
                    }`}
                  >
                    {/* Image */}
                    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111]">
                      <div className="aspect-[16/10] w-full">
                        <img
                          src={step.image}
                          alt={step.fa}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-transparent to-transparent" />
                      <div className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F58220] text-sm font-black text-white shadow-lg">
                        {step.num}
                      </div>
                    </div>

                    {/* Text */}
                    <div
                      className={`flex flex-col justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-8 lg:p-10 ${
                        reverse ? "lg:[direction:rtl]" : ""
                      }`}
                    >
                      <div className="inline-flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F58220]/15 text-[#F58220]">
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#F58220]">
                          {step.en}
                        </span>
                      </div>
                      <h3 className="mt-5 text-2xl font-black leading-tight text-white">
                        {step.fa}
                      </h3>
                      <p className="mt-4 text-sm leading-7 text-white/55">
                        {step.desc}
                      </p>
                      <div className="mt-6 space-y-2">
                        {step.points.map((p) => (
                          <div
                            key={p}
                            className="flex items-center gap-2 text-sm text-white/75"
                          >
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#F58220]" />
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PREPAYMENT + COMMISSION CALLOUT */}
        <section className="py-12">
          <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 to-transparent p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F58220]/15 text-[#F58220]">
                  <BadgeDollarSign className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-black text-white">پیش‌پرداخت</h3>
                <p className="mt-1 text-3xl font-black text-[#F58220]">
                  {formatFullPrice(prepaymentAmount)}
                </p>
                <p className="mt-3 text-xs leading-6 text-white/55">
                  هزینهٔ کارشناسی فنی، حقوقی و ارزش‌گذاری. در صورت عدم فروش در ۷
                  روز، کامل بازگردانده می‌شود.
                </p>
              </div>
              <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-transparent p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-black text-white">کارمزد فروش</h3>
                <p className="mt-1 text-3xl font-black text-emerald-400">۱٪</p>
                <p className="mt-3 text-xs leading-6 text-white/55">
                  فقط در صورت فروش موفق — ۱٪ از مبلغ نهایی فروش. هیچ هزینهٔ پنهان
                  دیگری وجود ندارد.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-black text-white">تضمین ۷ روزه</h3>
                <p className="mt-1 text-3xl font-black text-white">{toFa(7)} روز</p>
                <p className="mt-3 text-xs leading-6 text-white/55">
                  اگر در ۷ روز فروخته نشد، هزینهٔ آگهی رایگان و پیش‌پرداخت
                  بازگردانده می‌شود.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST CHIPS */}
        <section className="py-8">
          <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {TRUST_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-white/60"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#F58220]" />
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-12 text-center">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#F58220]">
                FAQ
              </span>
              <h2 className="mt-3 text-3xl font-black text-white">سوالات متداول</h2>
            </div>
            <div className="space-y-3">
              {FAQS.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#F58220]/30"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-white">
                    <span>{f.q}</span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-[#F58220] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-xs leading-7 text-white/55">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12">
          <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
            <div className="relative overflow-hidden rounded-3xl border border-[#F58220]/20 bg-gradient-to-l from-amber-950/40 via-[#141414] to-[#141414] p-8 lg:p-12">
              <div className="relative z-10 flex flex-col items-center text-center">
                <PhoneCall className="h-10 w-10 text-[#F58220]" />
                <h2 className="mt-4 text-2xl font-black text-white lg:text-3xl">
                  آمادهٔ ورود به کمپین هستید؟
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-white/60">
                  همین حالا دستگاه خود را ثبت کنید. کارشناسان ما در کمتر از ۲۴
                  ساعت با شما تماس می‌گیرند و فرآیند فروش ویژه آغاز می‌شود.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/sell-in-7-days/register"
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-l from-amber-500 to-[#F58220] px-8 text-sm font-bold text-white shadow-lg shadow-orange-950/40 transition hover:brightness-110"
                  >
                    ثبت دستگاه
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/sell-in-7-days/track"
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 text-sm font-bold text-white transition hover:border-[#F58220]/40 hover:bg-[#F58220]/10"
                  >
                    <Search className="h-4 w-4" />
                    پیگیری درخواست
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer
        settings={
          settings
            ? {
                about: settings.about,
                phone: settings.phone,
                email: settings.email,
                address: settings.address,
                workingHours: settings.workingHours,
                copyright: settings.copyright,
                newsletterEnabled: settings.newsletterEnabled,
              }
            : null
        }
      />
    </div>
  );
}
