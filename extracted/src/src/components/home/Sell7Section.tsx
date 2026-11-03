import Link from "next/link";
import {
  ArrowLeft,
  Crown,
  ClipboardList,
  ShieldCheck,
  BadgeDollarSign,
  FileSignature,
  CheckCircle2,
} from "lucide-react";

/* ============================================================
   Sell7Section — "Sell your device in 7 days" with Aria's
   4-step process: Register & Reserve → Inspection → Valuation →
   Contract & Settlement.

   FIX-ADMIN-EDITABILITY — the section header (eyebrow / title /
   description) is now driven by `cmsConfig` (managed from
   /admin/homepage-layout). The 4 step texts and trust chips
   remain hardcoded (they're structural content).
   ============================================================ */

type CmsConfig = {
  title?: string;
  subtitle?: string;
  description?: string;
};

const STEPS = [
  {
    num: "۰۱",
    fa: "ثبت دستگاه و تأیید رزرو",
    en: "Register & Reserve",
    desc: "اطلاعات دستگاه ثبت شده و فرآیند فروش ویژه آغاز می‌شود.",
    icon: ClipboardList,
  },
  {
    num: "۰۲",
    fa: "کارشناسی فنی، حقوقی و بدنه",
    en: "Inspection",
    desc: "بررسی کامل وضعیت فنی، اسناد و سلامت دستگاه توسط کارشناسان هویکس.",
    icon: ShieldCheck,
  },
  {
    num: "۰۳",
    fa: "ارزش‌گذاری و اعلام قیمت",
    en: "Valuation",
    desc: "تعیین قیمت واقعی و منصفانه بر اساس شرایط بازار و وضعیت دستگاه.",
    icon: BadgeDollarSign,
  },
  {
    num: "۰۴",
    fa: "عقد قرارداد و تسویه",
    en: "Contract & Settlement",
    desc: "انجام قرارداد رسمی، انتقال دستگاه و تسویه نهایی مالی.",
    icon: FileSignature,
  },
];

const TRUST_CHIPS = ["کارشناسی فنی", "کارشناسی حقوقی", "ارزش‌گذاری رسمی", "مالک تأییدشده", "آماده انتقال"];

const BULLETS = [
  "تطبیق هوشمند با خریداران واقعی",
  "دسترسی اولویت‌دار دیلرهای تأیید‌شده",
  "گارانتی فروش یا بازگشت هزینه آگهی",
  "پشتیبانی اختصاصی تا زمان فروش",
];

// FIX-ADMIN-EDITABILITY — fallback header text used when the admin
// hasn't customized the row yet.
const DEFAULT_EYEBROW = "HEAVIX GUARANTEE";
const DEFAULT_TITLE = "فروش دستگاه شما در ۷ روز";
const DEFAULT_DESC =
  "دستگاهت را ثبت کن. ما با شبکه دیلرها و خریداران فعال سراسر ایران تطبیق می‌دهیم. اگر تا ۷ روز فروخته نشد، هزینه آگهی کاملاً رایگان می‌شود.";

export default function Sell7Section({ cmsConfig }: { cmsConfig?: CmsConfig } = {}) {
  const title = cmsConfig?.title || DEFAULT_TITLE;
  const description = cmsConfig?.description || DEFAULT_DESC;
  // FIX-ADMIN-EDITABILITY — `subtitle` doubles as the small uppercase eyebrow
  // (KEEPS the "HEAVIX GUARANTEE" tag visible when admin overrides the title).
  const eyebrow = cmsConfig?.subtitle || DEFAULT_EYEBROW;

  return (
    <section id="sell7" className="relative overflow-hidden py-24">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(245,130,32,0.08),transparent_70%)]" />

      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        {/* Header — admin-editable via cmsConfig */}
        <div className="mx-auto mb-16 flex max-w-3xl flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#F58220]">
            <Crown className="h-4 w-4" />
            {eyebrow}
          </span>
          <h2 className="mt-3 text-3xl font-black text-white lg:text-5xl">
            {title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/55 lg:text-base">
            {description}
          </p>
        </div>

        {/* 4-step process */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#F58220]/50 hover:bg-white/[0.05]"
              >
                {/* Step number watermark */}
                <span className="absolute left-5 top-5 text-3xl font-black text-white/10 transition group-hover:text-[#F58220]/30">
                  {step.num}
                </span>

                {/* Connector arrow (between cards) */}
                {idx < STEPS.length - 1 && (
                  <div className="absolute -left-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0b0b0b] lg:flex">
                    <ArrowLeft className="h-3 w-3 text-[#F58220]" />
                  </div>
                )}

                {/* Icon */}
                <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F58220]/15 text-[#F58220] transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-7 w-7" />
                </div>

                {/* Content */}
                <div className="relative">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#F58220]">
                    {step.en}
                  </div>
                  <h3 className="mt-1 text-lg font-black leading-tight text-white">{step.fa}</h3>
                  <p className="mt-3 text-[13px] leading-6 text-white/55">{step.desc}</p>
                </div>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[#F58220] to-transparent transition-all duration-500 group-hover:w-full" />
              </div>
            );
          })}
        </div>

        {/* Trust chips */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
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

        {/* CTA + bullets */}
        <div className="mt-12 grid gap-8 rounded-3xl border border-amber-500/20 bg-gradient-to-l from-amber-950/30 via-[#141414] to-[#141414] p-8 lg:grid-cols-2 lg:p-12">
          <div>
            <h3 className="text-2xl font-black text-white">
              آمادهٔ ورود به کمپین هستید؟
            </h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-white/55">
              همین حالا آگهی دستگاه خود را ثبت کنید. کارشناسان ما در کمتر از ۲۴ ساعت با شما
              تماس می‌گیرند و فرآیند فروش ویژه آغاز می‌شود.
            </p>
            <Link
              href="/sell-in-7-days"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-amber-500 to-[#F58220] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-950/30 transition-all hover:brightness-110"
            >
              مشاهدهٔ فرآیند و ثبت دستگاه
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex flex-col justify-center gap-3">
            {BULLETS.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-400" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
