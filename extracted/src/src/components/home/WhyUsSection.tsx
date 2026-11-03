import WhyUsClient from "./WhyUsClient";

/* ============================================================
   WhyUsSection — bento grid with scroll reveal + mouse spotlight.
   Static defaults (no DB dependency) — 6 cards.

   FIX-ADMIN-EDITABILITY — section header (eyebrow / title /
   description) is now driven by `cmsConfig` (managed from
   /admin/homepage-layout). The 6 cards remain hardcoded.
   ============================================================ */

export type WhyItem = {
  id: string;
  subtitle: string;
  title: string;
  description: string;
  stat?: string;
  statLabel?: string;
  icon: string; // emoji
};

type CmsConfig = {
  title?: string;
  subtitle?: string;
  description?: string;
};

const DEFAULT_ITEMS: WhyItem[] = [
  {
    id: "1",
    subtitle: "VERIFY",
    title: "دیلرهای تأیید‌شده",
    description:
      "تمام دیلرها قبل از عضویت احراز هویت می‌شوند. سیستم امتیازدهی واقعی و تاریخچه معاملات شفاف برای هر فروشنده.",
    stat: "۱۰۰٪",
    statLabel: "احراز هویت شده",
    icon: "✅",
  },
  {
    id: "2",
    subtitle: "TRUST",
    title: "معامله امن",
    description: "گارانتی خدمات و پشتیبانی اختصاصی برای معاملات. از اولین تماس تا تحویل دستگاه.",
    icon: "🛡️",
  },
  {
    id: "3",
    subtitle: "SMART",
    title: "تطبیق هوشمند",
    description: "الگوریتم تطبیق خریدار و فروشنده برای فروش دستگاه در ۷ روز.",
    icon: "🤖",
  },
  {
    id: "4",
    subtitle: "NETWORK",
    title: "شبکه سراسری",
    description: "دسترسی به دیلرها، تکنسین‌ها و تأمین‌کنندگان قطعات در همهٔ استان‌های کشور.",
    icon: "🌐",
  },
  {
    id: "5",
    subtitle: "SERVICE",
    title: "MEKANIX",
    description:
      "شبکه خدمات سیار تکنسین‌های متخصص از طریق برند خواهری MEKANIX، با گارانتی کار و امتیازدهی واقعی.",
    stat: "۲۴/۷",
    statLabel: "پشتیبانی",
    icon: "🔧",
  },
  {
    id: "6",
    subtitle: "SPEED",
    title: "فروش در ۷ روز",
    description: "فرایند مستقل فروش تضمینی — اگر تا ۷ روز فروخته نشد، هزینه آگهی رایگان می‌شود.",
    icon: "⚡",
  },
];

const DEFAULT_EYEBROW = "WHY HEAVIX";
const DEFAULT_TITLE = "چرا هویکس؟";
const DEFAULT_DESC = "مزیت‌هایی که ما را متمایز می‌کند";

export default function WhyUsSection({ cmsConfig }: { cmsConfig?: CmsConfig } = {}) {
  const eyebrow = cmsConfig?.subtitle || DEFAULT_EYEBROW;
  const title = cmsConfig?.title || DEFAULT_TITLE;
  const description = cmsConfig?.description || DEFAULT_DESC;

  return (
    <section className="relative py-24" aria-label="چرا هویکس">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="text-xs font-black tracking-[0.3em] text-[#F58220]">{eyebrow}</div>
          <h2 className="mt-3 text-3xl font-black text-white lg:text-5xl">{title}</h2>
          <p className="mt-4 text-sm leading-7 text-white/55 lg:text-base">
            {description}
          </p>
        </div>

        <div className="mt-16">
          <WhyUsClient items={DEFAULT_ITEMS} />
        </div>
      </div>
    </section>
  );
}
