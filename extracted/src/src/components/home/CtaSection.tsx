import Link from "next/link";

/* ============================================================
   CtaSection — final call-to-action.

   FIX-ADMIN-EDITABILITY — header text now driven by `cmsConfig`
   (managed from /admin/homepage-layout). Buttons stay hardcoded
   (they map to fixed routes).
   ============================================================ */

type CmsConfig = {
  title?: string;
  subtitle?: string;
  description?: string;
};

const DEFAULT_TITLE = "آماده شروع هستید؟";
const DEFAULT_DESC =
  "همین حالا آگهی خود را رایگان ثبت کنید یا دستگاه مورد نظرتان را در بزرگ‌ترین بازار ماشین‌آلات سنگین ایران پیدا کنید.";

export default function CtaSection({ cmsConfig }: { cmsConfig?: CmsConfig } = {}) {
  const title = cmsConfig?.title || DEFAULT_TITLE;
  const description = cmsConfig?.description || DEFAULT_DESC;

  return (
    <section className="relative overflow-hidden border-t border-white/5 py-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(245,130,32,0.10),transparent_70%)]" />
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="mb-4 text-3xl font-black text-white sm:text-4xl">{title}</h2>
        <p className="mb-9 text-sm leading-7 text-white/55 sm:text-base">
          {description}
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/listings/new"
            className="w-full rounded-full bg-[#F58220] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition-all hover:bg-[#ff8c38] sm:w-auto"
          >
            ثبت آگهی رایگان
          </Link>
          <Link
            href="/listings"
            className="w-full rounded-full border border-white/15 bg-white/[0.04] px-8 py-3.5 text-sm font-bold text-white transition-all hover:border-[#F58220]/40 hover:text-[#F58220] sm:w-auto"
          >
            مشاهده آگهی‌ها
          </Link>
        </div>
      </div>
    </section>
  );
}
