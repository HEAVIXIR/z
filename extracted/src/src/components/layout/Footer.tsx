"use client";

import Link from "next/link";
import {
  Phone,
  Smartphone,
  Mail,
  MapPin,
  Clock,
  ArrowUp,
} from "lucide-react";

/* ============================================================
   Footer — 12-col layout with brand column, link columns,
   contact column + newsletter, tri-brand cards (ARIA / HEAVIX /
   MEKANIX), and a bottom bar.
   ============================================================ */

const LINK_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "ماشین‌آلات",
    links: [
      { label: "بیل مکانیکی", href: "/listings?category=excavator" },
      { label: "لودر", href: "/listings?category=loader" },
      { label: "بلدوزر", href: "/listings?category=bulldozer" },
      { label: "گریدر", href: "/listings?category=grader" },
      { label: "دامپ‌تراک", href: "/listings?category=dump-truck" },
      { label: "جرثقیل", href: "/listings?category=crane" },
    ],
  },
  {
    title: "خدمات",
    links: [
      { label: "خرید و فروش", href: "/listings" },
      { label: "اجاره دستگاه", href: "/listings?type=RENT" },
      { label: "فروش در ۷ روز", href: "/#sell7" },
      { label: "قطعات یدکی", href: "/listings?category=spare-parts" },
      { label: "MEKANIX", href: "https://mekanix.ir" },
    ],
  },
  {
    title: "هویکس",
    links: [
      { label: "درباره ما", href: "/#about" },
      { label: "تماس با ما", href: "/#contact" },
      { label: "برندها", href: "/brands" },
      { label: "دسته‌بندی‌ها", href: "/listings" },
      { label: "ثبت آگهی", href: "/listings/new" },
    ],
  },
];

const PHONES = ["021-91008000"];
const MOBILES = ["0912-100-2000"];
const EMAILS = ["info@heavix.ir", "support@heavix.ir"];
const ADDRESS = "تهران، خیابان ولیعصر، برج آریا، طبقه ۱۲";
const WORKING_HOURS = "شنبه تا پنجشنبه، ۸:۰۰ تا ۱۸:۰۰";

type FooterSettings = {
  about?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  workingHours?: string | null;
  copyright?: string | null;
  newsletterEnabled?: boolean;
  footerLogoUrl?: string | null;
  footerLogoHeight?: number;
  footerLogoPosition?: string | null;
  footerHeavixLogoUrl?: string | null;
  footerMekanixLogoUrl?: string | null;
  footerAriaLogoUrl?: string | null;
};

export default function Footer({ settings }: { settings?: FooterSettings | null }) {
  const logoH = settings?.footerLogoHeight ?? 48;
  const logoPos = settings?.footerLogoPosition ?? "center";
  const logoAlignClass = logoPos === "right" ? "justify-end" : logoPos === "left" ? "justify-start" : "justify-center";
  const heavixLogoSrc = settings?.footerHeavixLogoUrl || settings?.footerLogoUrl || "/logos/heavix-logo.png";
  const mekanixLogoSrc = settings?.footerMekanixLogoUrl || "/logos/mekanix-logo.png";
  const ariaLogoSrc = settings?.footerAriaLogoUrl || "/logos/aria-logo.svg";
  return (
    <footer
      className="relative mt-auto border-t border-white/[0.06] bg-[#080808]"
      dir="rtl"
    >
      {/* Main body */}
      <div className="mx-auto max-w-[1440px] px-6 pb-14 pt-16 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <div className={`flex items-center ${logoAlignClass}`}>
              <img
                src={heavixLogoSrc}
                alt="HEAVIX — Buy / Sell / List"
                className="w-auto float-soft"
                style={{ height: `${logoH}px` }}
              />
            </div>

            <p className="mt-5 max-w-sm text-[13px] leading-6 text-white/45">
              بزرگ‌ترین مارکت‌پلیس ماشین‌آلات سنگین ایران — خرید، فروش و اجاره دستگاه‌های صنعتی
              با شبکه سراسری دیلرها و متخصصین. متعلق به گروه صنعتی آریا ماشین جم.
            </p>

            {/* Trust badges */}
            <div className="mt-7 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[8px] font-bold text-white/35">
                اینماد
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[8px] font-bold text-white/35">
                ساماندهی
              </div>
            </div>
          </div>

          {/* Link columns */}
          {LINK_COLUMNS.map((col, idx) => (
            <div key={idx} className="lg:col-span-2">
              <h3 className="mb-5 text-[13px] font-black text-white">{col.title}</h3>
              <ul className="space-y-3">
                {col.links.map((link, i) => (
                  <li key={i}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-white/45 transition-colors hover:text-[#F58220]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact + newsletter */}
          <div className="lg:col-span-2" id="contact">
            <h3 className="mb-5 text-[13px] font-black text-white">تماس با ما</h3>
            <ul className="space-y-3.5">
              {PHONES.map((phone, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#F58220]" />
                  <a
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    dir="ltr"
                    className="text-[13px] text-white/55 transition-colors hover:text-[#F58220]"
                  >
                    {phone}
                  </a>
                </li>
              ))}
              {MOBILES.map((mobile, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Smartphone className="h-3.5 w-3.5 shrink-0 text-[#F58220]" />
                  <a
                    href={`tel:${mobile.replace(/\s/g, "")}`}
                    dir="ltr"
                    className="text-[13px] text-white/55 transition-colors hover:text-[#F58220]"
                  >
                    {mobile}
                  </a>
                </li>
              ))}
              {EMAILS.map((email, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#F58220]" />
                  <a
                    href={`mailto:${email}`}
                    dir="ltr"
                    className="text-[13px] text-white/55 transition-colors hover:text-[#F58220]"
                  >
                    {email}
                  </a>
                </li>
              ))}
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F58220]" />
                <span className="text-[13px] leading-6 text-white/55">{ADDRESS}</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F58220]" />
                <span className="text-[13px] leading-6 text-white/55">{WORKING_HOURS}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Tri-brand cards */}
        <div className="mt-12 grid gap-4 border-t border-white/5 pt-8 sm:grid-cols-3">
          <a
            href="https://ariamj.ir"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#F58220]/30 hover:bg-[#F58220]/[0.04]"
          >
            <img
              src={ariaLogoSrc}
              alt="ARIA MACHINE JAM"
              className="w-auto float-soft"
              style={{ height: `${logoH}px` }}
            />
            <p className="text-xs leading-5 text-white/45">آریا ماشین جم — برند مادر</p>
          </a>
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#F58220]/20 bg-[#F58220]/[0.06] p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-[#F58220]/[0.1]">
            <img
              src={heavixLogoSrc}
              alt="HEAVIX"
              className="w-auto float-soft"
              style={{ height: `${logoH}px` }}
            />
            <p className="text-xs leading-5 text-white/55">هویکس — مارکت‌پلیس صنعتی</p>
          </div>
          <a
            href="https://mekanix.ir"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]"
          >
            <img
              src={mekanixLogoSrc}
              alt="MEKANIX"
              className="w-auto float-soft"
              style={{ height: `${logoH}px` }}
            />
            <p className="text-xs leading-5 text-white/45">مکانیکس — خدمات سیار تکنسین‌ها</p>
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-6 py-5 md:flex-row lg:px-10">
          <div className="text-[11px] text-white/35">
            © ۱۴۰۴ HEAVIX — متعلق به آریا ماشین جم. تمام حقوق محفوظ است.
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/#about" className="text-[11px] text-white/40 transition-colors hover:text-[#F58220]">
              درباره ما
            </Link>
            <Link href="/#contact" className="text-[11px] text-white/40 transition-colors hover:text-[#F58220]">
              تماس
            </Link>
            <a
              href="https://mekanix.ir"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-white/40 transition-colors hover:text-[#F58220]"
            >
              MEKANIX
            </a>
            <a
              href="https://ariamj.ir"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-white/40 transition-colors hover:text-[#F58220]"
            >
              آریا ماشین جم
            </a>
          </nav>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/40 transition hover:border-[#F58220] hover:text-[#F58220]"
            aria-label="بازگشت به بالا"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
