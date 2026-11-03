"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Loader2,
  RefreshCw,
  Trash2,
  MapPin,
  Calendar,
  Gauge,
  Eye,
} from "lucide-react";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { useToast } from "@/hooks/use-toast";
import { toFa, formatCompactPrice, PRICE_TYPE_LABELS } from "@/lib/format";

/* ============================================================
   /dashboard/favorites — grid of the user's favorited listings.
   Each card carries an inline "remove" button (DELETE favorite).
   Empty state when the user has no favorites yet.
   ============================================================ */

type FavoriteListing = {
  id: string;
  favoriteId: string;
  createdAt: string;
  listing: {
    id: string;
    slug: string;
    title: string;
    shortDesc: string | null;
    description: string | null;
    price: string | null;
    priceType: string;
    year: number | null;
    city: string | null;
    province: string | null;
    workingHours: number | null;
    viewCount: number;
    brand: { id: string; name: string; nameEn: string | null } | null;
    image: string | null;
  };
};

export default function FavoritesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<FavoriteListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/favorites", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const favs = Array.isArray(data.favorites) ? data.favorites : [];
      setItems(
        favs.map((f: any) => ({
          id: f.id,
          favoriteId: f.id,
          createdAt: f.createdAt,
          listing: {
            id: f.listing?.id ?? "",
            slug: f.listing?.slug ?? "",
            title: f.listing?.title ?? "—",
            shortDesc: f.listing?.shortDesc ?? null,
            description: f.listing?.description ?? null,
            price: f.listing?.price ?? null,
            priceType: f.listing?.priceType ?? "NEGOTIABLE",
            year: f.listing?.year ?? null,
            city: f.listing?.city ?? null,
            province: f.listing?.province ?? null,
            workingHours: f.listing?.workingHours ?? null,
            viewCount: f.listing?.viewCount ?? 0,
            brand: f.listing?.brand ?? null,
            image: f.listing?.images?.[0]?.url ?? null,
          },
        })),
      );
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  async function remove(fav: FavoriteListing) {
    if (removingId) return;
    setRemovingId(fav.id);
    try {
      const res = await fetch(
        `/api/favorites?listingId=${encodeURIComponent(fav.listing.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "حذف ناموفق بود");
      }
      setItems((prev) => prev.filter((x) => x.id !== fav.id));
      toast({ title: "از علاقه‌مندی‌ها حذف شد" });
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message ?? "حذف ناموفق بود",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col bg-[#0b0b0b] text-white"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,130,32,0.08), transparent 70%)",
      }}
    >
      <DashboardNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-6 lg:py-12">
        {/* Heading */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white lg:text-3xl">
              علاقه‌مندی‌ها
            </h1>
            <p className="mt-1 text-xs text-white/55">
              آگهی‌هایی که ذخیره کرده‌اید
              {!loading && (
                <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-[#F58220]/15 px-2 py-0.5 text-[11px] font-bold text-[#F58220]">
                  {toFa(items.length)} مورد
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchList}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs font-bold text-white/65 transition hover:border-[#F58220]/40 hover:text-[#F58220] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            به‌روزرسانی
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/40">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((fav) => {
              const l = fav.listing;
              const priceLabel =
                l.price != null
                  ? formatCompactPrice(l.price)
                  : PRICE_TYPE_LABELS[l.priceType] ?? "تماس بگیرید";
              return (
                <div
                  key={fav.id}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111] transition hover:border-[#F58220]/40"
                >
                  <Link href={`/listings/${l.slug}`} className="block">
                    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
                      {l.image ? (
                        <img
                          src={l.image}
                          alt={l.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-7xl opacity-70">
                          🚜
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                      <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-[#F58220] backdrop-blur">
                        <Heart className="h-3 w-3 fill-[#F58220] text-[#F58220]" />
                        ذخیره شده
                      </div>
                      {l.viewCount > 0 && (
                        <div className="absolute left-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/60 backdrop-blur">
                          <Eye className="h-3 w-3" />
                          {toFa(l.viewCount)}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col p-5">
                    <Link href={`/listings/${l.slug}`}>
                      <div className="text-xs uppercase tracking-[3px] text-[#F58220]">
                        {l.brand?.name ?? "بدون برند"}
                      </div>
                      <h3 className="mt-2 line-clamp-2 min-h-[40px] text-base font-bold leading-6 text-white transition group-hover:text-[#F58220]">
                        {l.title}
                      </h3>
                    </Link>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/55">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-[#F58220]" />
                        {l.city ?? "-"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-[#F58220]" />
                        {l.year ? toFa(l.year) : "-"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Gauge className="h-3 w-3 text-[#F58220]" />
                        {l.workingHours ? toFa(l.workingHours) : "-"}
                      </span>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                      <div>
                        <div className="text-[10px] text-white/50">قیمت</div>
                        <div className="mt-0.5 text-base font-black text-[#F58220]">
                          {priceLabel}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(fav)}
                        disabled={removingId === fav.id}
                        aria-label="حذف از علاقه‌مندی‌ها"
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 text-xs font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
                      >
                        {removingId === fav.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-white/10 py-6 text-center text-[11px] text-white/35">
        HEAVIX © {toFa(new Date().getFullYear())} — بازار ماشین‌آلات صنعتی
      </footer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F58220]/10 text-[#F58220]">
        <Heart className="h-8 w-8" />
      </div>
      <p className="mt-4 text-base font-bold text-white">
        هنوز آگهی را به علاقه‌مندی‌ها اضافه نکرده‌اید
      </p>
      <p className="mt-1 max-w-sm text-xs text-white/45">
        روی آیکن قلب کنار هر آگهی بزنید تا اینجا ذخیره شود و بعداً سریع به آن
        دسترسی داشته باشید.
      </p>
      <Link
        href="/listings"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#F58220] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#ff8c38]"
      >
        مرور آگهی‌ها
      </Link>
    </div>
  );
}
