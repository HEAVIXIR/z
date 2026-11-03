import Link from "next/link";
import SectionTitle from "@/components/ui/SectionTitle";
import FeaturedMachineCard, { type FeaturedListing } from "./FeaturedMachineCard";
import FadeSlideUp from "@/components/FadeSlideUp";

/* ============================================================
   FeaturedMachinesSection — "آگهی‌های ویژه"
   Grid layout with fade-slide-up animation on scroll.
   Accepts cmsConfig for admin-editable title/subtitle/description.
   ============================================================ */

type CmsConfig = { title?: string; subtitle?: string; description?: string };

export default function FeaturedMachinesSection({
  listings,
  cmsConfig,
}: {
  listings: FeaturedListing[];
  cmsConfig?: CmsConfig;
}) {
  if (listings.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-24">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionTitle
          align="center"
          subtitle={cmsConfig?.subtitle || "HEAVIX FEATURED"}
          title={cmsConfig?.title || "آگهی‌های ویژه"}
          description={cmsConfig?.description || "منتخب‌ترین آگهی‌های ماشین‌آلات سنگین — بهترین قیمت‌ها و شرایط ویژه."}
        />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {listings.map((l, i) => (
            <FadeSlideUp key={l.id} delay={i * 90}>
              <FeaturedMachineCard l={l} />
            </FadeSlideUp>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/listings?featured=true"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 text-white transition-all duration-300 hover:border-[#F58220]/30 hover:bg-white/10"
          >
            مشاهده همه
          </Link>
        </div>
      </div>
    </section>
  );
}
