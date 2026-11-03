import SectionTitle from "@/components/ui/SectionTitle";
import FadeSlideUp from "@/components/FadeSlideUp";
import { Zap, Crown, ArrowLeft } from "lucide-react";
import Link from "next/link";

/* ============================================================
   ExclusiveSaleSection — "فروش ویژه" call-to-action panel.
   FIX-SALE-ANIM: content fades-in + slides-up on scroll via
   the FadeSlideUp wrapper.
   ============================================================ */

export default function ExclusiveSaleSection({
  cmsConfig,
}: {
  cmsConfig?: { title?: string; subtitle?: string; description?: string };
}) {
  return (
    <section className="relative overflow-hidden py-12">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <FadeSlideUp>
          <div className="relative overflow-hidden rounded-3xl border border-[#F58220]/20 bg-gradient-to-br from-[#F58220]/10 to-transparent p-8 lg:p-12">
            {/* glow accent */}
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#F58220]/10 blur-3xl" />
            <div className="relative z-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F58220]/15 text-[#F58220]">
                <Zap className="h-7 w-7" />
              </div>
              <SectionTitle
                align="center"
                subtitle={cmsConfig?.subtitle || "EXCLUSIVE"}
                title={cmsConfig?.title || "فروش ویژهٔ دستگاه شما"}
                description={
                  cmsConfig?.description ||
                  "کمپین فروش تضمینی هویکس — دستگاه خود را در ۷ روز بفروشید"
                }
              />
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#F58220]/30 bg-[#F58220]/10 px-4 py-1.5 text-xs font-bold text-[#F58220]">
                <Crown className="h-4 w-4" />
                HEAVIX 7-DAY GUARANTEE
              </div>
              <div className="mt-6">
                <Link
                  href="/sell-in-7-days"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-l from-amber-500 to-[#F58220] px-7 text-sm font-bold text-white shadow-lg shadow-orange-950/30 transition hover:brightness-110"
                >
                  مشاهدهٔ فرآیند و ثبت دستگاه
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </FadeSlideUp>
      </div>
    </section>
  );
}
