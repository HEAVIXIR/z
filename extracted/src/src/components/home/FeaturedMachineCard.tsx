import Link from "next/link";
import GlassPanel from "@/components/ui/GlassPanel";
import TrustBadge from "@/components/listings/TrustBadge";
import { formatCompactPrice, PRICE_TYPE_LABELS, toFa } from "@/lib/format";
import { MapPin, Calendar, Gauge, Tag, Star, Eye } from "lucide-react";

export type FeaturedListing = {
  id: string;
  slug: string;
  title: string;
  shortDesc?: string | null;
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
  viewCount?: number;
  description?: string | null;
};

export default function FeaturedMachineCard({ l }: { l: FeaturedListing }) {
  const priceLabel =
    l.price != null
      ? formatCompactPrice(l.price)
      : PRICE_TYPE_LABELS[l.priceType] ?? "تماس بگیرید";

  return (
    <GlassPanel className="group h-full overflow-hidden rounded-3xl border border-white/10 transition-all duration-500 hover:-translate-y-2 hover:border-[#F58220]/40 hover:shadow-[0_20px_60px_rgba(0,0,0,.35)]">
      {/* Image */}
      <Link href={`/listings/${l.slug}`}>
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
          {l.image ? (
             
            <img
              src={l.image}
              alt={l.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-7xl opacity-80 transition-transform duration-700 group-hover:scale-110">
                {l.icon ?? "🚜"}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top row: featured star + trust badge */}
          <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#F58220] px-3 py-1 text-xs font-bold text-white">
            <Star className="h-3 w-3 fill-current" />
            ویژه
          </div>
          <div className="absolute left-4 top-4">
            <TrustBadge listing={l} />
          </div>

          {/* Bottom: brand + views */}
          <div className="absolute inset-x-4 bottom-3 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wide text-[#F58220]">
              {l.brandName ?? "بدون برند"}
            </span>
            {l.viewCount != null && (
              <span className="pulse-glow inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur">
                <Eye className="h-3 w-3 text-[#F58220]" />
                {toFa(l.viewCount)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-6">
        <Link href={`/listings/${l.slug}`}>
          <h3 className="line-clamp-2 text-xl font-bold leading-8 text-white transition-colors group-hover:text-[#F58220]">
            {l.title}
          </h3>
        </Link>

        {l.shortDesc && (
          <p className="mt-2 line-clamp-2 text-xs leading-6 text-white/45">
            {l.shortDesc}
          </p>
        )}

        {/* Meta grid */}
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-white/55">
          <span className="inline-flex items-center gap-1.5 justify-start">
            <MapPin className="h-3.5 w-3.5 text-[#F58220]" />
            {l.city ?? "-"}
          </span>
          <span className="inline-flex items-center gap-1.5 justify-end">
            {l.year ? toFa(l.year) : "-"}
            <Calendar className="h-3.5 w-3.5 text-[#F58220]" />
          </span>
          <span className="inline-flex items-center gap-1.5 justify-start">
            <Gauge className="h-3.5 w-3.5 text-[#F58220]" />
            {l.workingHours ? toFa(l.workingHours) : "-"}
          </span>
          <span className="inline-flex items-center gap-1.5 justify-end">
            {l.brandName ?? "-"}
            <Tag className="h-3.5 w-3.5 text-[#F58220]" />
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <div className="text-xs text-white/50">قیمت</div>
            <div className="mt-1 text-2xl font-black text-[#F58220]">{priceLabel}</div>
          </div>
          <Link
            href={`/listings/${l.slug}`}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
          >
            مشاهده جزئیات
          </Link>
        </div>
      </div>
    </GlassPanel>
  );
}
