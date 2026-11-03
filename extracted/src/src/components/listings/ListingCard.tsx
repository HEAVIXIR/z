import Link from "next/link";
import { MapPin, Calendar, Gauge, Star, Eye } from "lucide-react";
import { formatCompactPrice, PRICE_TYPE_LABELS, toFa } from "@/lib/format";
import TrustBadge from "./TrustBadge";
import FavoriteButton from "./FavoriteButton";

/* ============================================================
   ListingCard — grid card for /listings explorer.
   Glass aesthetic + HEAVIX Verified trust badge.
   ============================================================ */

export type ListingCardData = {
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
  favoriteCount?: number;
};

export default function ListingCard({ l }: { l: ListingCardData }) {
  const priceLabel =
    l.price != null ? formatCompactPrice(l.price) : PRICE_TYPE_LABELS[l.priceType] ?? "تماس بگیرید";

  return (
    <Link
      href={`/listings/${l.slug}`}
      className="group block h-full overflow-hidden rounded-3xl border border-white/10 bg-[#111] transition-all duration-500 hover:-translate-y-2 hover:border-[#F58220]/40 hover:shadow-[0_25px_60px_rgba(0,0,0,.45)]"
    >
      {/* Image */}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        {/* Top-right cluster: favorite heart + featured badge (stacked) */}
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
          <FavoriteButton
            listingId={l.id}
            size="sm"
            variant="overlay"
            count={l.favoriteCount ?? 0}
          />
          {l.featured && (
            <div className="inline-flex items-center gap-1 rounded-full bg-[#F58220] px-3 py-1 text-xs font-bold text-white">
              <Star className="h-3 w-3 fill-current" />
              ویژه
            </div>
          )}
        </div>
        <div className="absolute left-4 top-4">
          <TrustBadge listing={l} />
        </div>
        {l.viewCount != null && (
          <div className="absolute left-4 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/60 backdrop-blur">
            <Eye className="h-3 w-3" />
            {toFa(l.viewCount)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="text-xs uppercase tracking-[3px] text-[#F58220]">
          {l.brandName ?? "بدون برند"}
        </div>
        <h3 className="mt-2 line-clamp-2 min-h-[56px] text-lg font-bold leading-7 text-white transition-colors group-hover:text-[#F58220]">
          {l.title}
        </h3>

        {l.shortDesc && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/40">
            {l.shortDesc}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/55">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-[#F58220]" />
            {l.city ?? "-"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-[#F58220]" />
            {l.year ? toFa(l.year) : "-"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5 text-[#F58220]" />
            {l.workingHours ? toFa(l.workingHours) : "-"}
          </span>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="text-xs text-white/50">قیمت</div>
          <div className="mt-1 text-xl font-black text-[#F58220]">{priceLabel}</div>
        </div>
      </div>
    </Link>
  );
}
