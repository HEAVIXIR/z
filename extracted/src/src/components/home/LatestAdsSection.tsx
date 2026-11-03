import Link from "next/link";
import { formatCompactPrice, PRICE_TYPE_LABELS, toFa } from "@/lib/format";
import TrustBadge from "@/components/listings/TrustBadge";
import { Eye } from "lucide-react";

/* ============================================================
   LatestAdsSection — marquee of latest published listings.
   Pure CSS marquee (LTR direction, RTL cards inside).
   Now with HEAVIX Verified trust badge + view count.

   FIX-ADMIN-EDITABILITY — accepts an optional `cmsConfig`
   (title/subtitle/description) used for the section header.
   Managed from /admin/homepage-layout.
   ============================================================ */

export type LatestAd = {
  id: string;
  slug: string;
  title: string;
  shortDesc?: string | null;
  description?: string | null;
  brandName: string | null;
  price: bigint | number | null;
  priceType: string;
  image: string | null;
  icon?: string | null;
  year: number | null;
  city: string | null;
  province?: string | null;
  workingHours: number | null;
  condition?: string | null;
  featured: boolean;
  viewCount?: number;
  publishedAt: string | null;
};

type CmsConfig = {
  title?: string;
  subtitle?: string;
  description?: string;
};

const DEFAULT_EYEBROW = "FRESH LISTINGS";
const DEFAULT_TITLE = "آخرین آگهی‌های ماشین‌آلات";
const DEFAULT_DESC = "تازه‌ترین دستگاه‌های افزوده‌شده به بازار هویکس";

export default function LatestAdsSection({
  ads,
  cmsConfig,
}: {
  ads: LatestAd[];
  cmsConfig?: CmsConfig;
}) {
  if (ads.length === 0) return null;

  const eyebrow = cmsConfig?.subtitle || DEFAULT_EYEBROW;
  const title = cmsConfig?.title || DEFAULT_TITLE;
  const description = cmsConfig?.description || DEFAULT_DESC;

  const repeat = Math.max(2, Math.ceil(12 / Math.max(1, ads.length)));
  const seq = Array.from({ length: repeat }).flatMap(() => ads);
  const track = [...seq, ...seq];

  return (
    <section className="relative overflow-hidden py-24">
      <div className="mx-auto max-w-[1600px] px-8">
        <div className="mb-12 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#F58220]">
            {eyebrow}
          </span>
          <h2 className="mt-3 text-3xl font-black text-white">{title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/45">
            {description}
          </p>
        </div>
      </div>

      <div dir="ltr" className="overflow-hidden">
        <div className="flex w-max animate-[marquee-ltr_70s_linear_infinite] hover:[animation-play-state:paused]">
          {track.map((ad, i) => (
            <div key={`${ad.id}-${i}`} dir="rtl" className="mx-4 w-[320px] shrink-0">
              <LatestAdCard ad={ad} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 flex justify-center">
        <Link
          href="/listings"
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 text-sm font-bold text-white transition-all duration-300 hover:border-[#F58220]/40 hover:bg-[#F58220]/10 hover:text-[#F58220]"
        >
          مشاهده همهٔ آگهی‌ها
        </Link>
      </div>
    </section>
  );
}

function LatestAdCard({ ad }: { ad: LatestAd }) {
  const priceLabel =
    ad.price != null ? formatCompactPrice(ad.price) : PRICE_TYPE_LABELS[ad.priceType] ?? "تماس بگیرید";

  return (
    <Link href={`/listings/${ad.slug}`} className="group block h-full">
      <article className="h-full overflow-hidden rounded-3xl border border-white/10 bg-[#111] transition-all duration-500 hover:-translate-y-2 hover:border-[#F58220]/40 hover:shadow-[0_25px_60px_rgba(0,0,0,.45)]">
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
          {ad.image ? (
             
            <img
              src={ad.image}
              alt={ad.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-7xl opacity-80 transition-transform duration-700 group-hover:scale-110">
                {ad.icon ?? "🚜"}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {ad.featured && (
            <div className="absolute right-4 top-4 rounded-full bg-[#F58220] px-4 py-1 text-xs font-bold text-white">
              ویژه
            </div>
          )}
          <div className="absolute left-4 top-4">
            <TrustBadge listing={ad} />
          </div>
          {ad.viewCount != null && (
            <div className="pulse-glow absolute left-4 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur">
              <Eye className="h-3 w-3 text-[#F58220]" />
              {toFa(ad.viewCount)}
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="text-xs uppercase tracking-[3px] text-[#F58220]">
            {ad.brandName ?? "بدون برند"}
          </div>

          <h3 className="mt-3 line-clamp-2 min-h-[56px] text-xl font-bold leading-8 text-white transition-colors group-hover:text-[#F58220]">
            {ad.title}
          </h3>

          {ad.shortDesc && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/40">
              {ad.shortDesc}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-y-3 text-sm text-white/60">
            <div>📍 {ad.city ?? "-"}</div>
            <div>📅 {ad.year ? toFa(ad.year) : "-"}</div>
            <div>⏱ {ad.workingHours ? toFa(ad.workingHours) : "-"}</div>
            <div>🏷 {ad.brandName ?? "-"}</div>
          </div>

          <div className="my-6 border-t border-white/10" />

          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-white/50">قیمت</div>
              <div className="mt-1 text-2xl font-black text-[#F58220]">{priceLabel}</div>
            </div>
            <div className="flex h-10 items-center justify-center rounded-xl bg-[#F58220] px-4 text-xs font-bold text-white transition group-hover:bg-[#ff9736]">
              مشاهده آگهی
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
