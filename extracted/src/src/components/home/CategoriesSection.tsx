import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   CategoriesSection v2 — professional bento grid.
   Original exclusive design. First featured category spans 2 cols.
   Each card: machine-type emoji icon + name + listing count +
   top subcategories as chips + hover lift + orange accent bar.
   ============================================================ */

export type CategoryWithCount = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  featured: boolean;
  parentId: string | null;
  listingCount: number;
};

export default function CategoriesSection({
  categories,
  subCategories,
}: {
  categories: CategoryWithCount[];
  subCategories: { id: string; name: string; slug: string; parentId: string | null }[];
}) {
  const roots = categories
    .filter((c) => !c.parentId)
    .sort((a, b) => {
      if (!!b.featured !== !!a.featured) return b.featured ? -1 : 1;
      return (a.nameEn ?? a.name).localeCompare(b.nameEn ?? b.name, "fa");
    })
    .slice(0, 12);

  if (roots.length === 0) return null;

  return (
    <section id="categories" className="relative overflow-hidden bg-[#0a0a0a] py-24">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative mx-auto max-w-[1440px] px-6 lg:px-10">
        {/* Header */}
        <div className="mb-12 flex flex-col items-center text-center">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#F58220]">
            Categories
          </span>
          <h2 className="mt-3 text-3xl font-black text-white lg:text-5xl">
            دسته‌بندی ماشین‌آلات
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/45">
            ماشین‌آلات موردنظر خود را در {toFa(roots.length)} گروه تخصصی پیدا کنید — از بیل
            مکانیکی تا تجهیزات معدنی.
          </p>
        </div>

        {/* Bento grid — featured items span 2 cols */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {roots.map((cat, idx) => {
            const isFeatured = cat.featured && idx < 3;
            const subs = subCategories
              .filter((s) => s.parentId === cat.id)
              .slice(0, 3);
            return (
              <Link
                key={cat.id}
                href={`/listings?category=${cat.slug}`}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#141414] to-[#0c0c0c] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#F58220]/40 hover:shadow-[0_20px_50px_-15px_rgba(245,130,32,0.3)] ${
                  isFeatured ? "lg:col-span-2 lg:row-span-1" : ""
                }`}
              >
                {/* Top accent bar (animated on hover) */}
                <span className="absolute inset-x-0 top-0 h-0.5 origin-right scale-x-0 bg-[#F58220] transition-transform duration-300 group-hover:scale-x-100" />

                {/* Featured star badge */}
                {cat.featured && (
                  <span className="absolute left-3 top-3 rounded-full bg-[#F58220]/15 px-2 py-0.5 text-[9px] font-black text-[#F58220]">
                    ویژه
                  </span>
                )}

                {/* Icon + name + count */}
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-2xl transition-transform duration-300 group-hover:scale-110">
                    {cat.icon ?? "🚜"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-black text-white transition-colors group-hover:text-[#F58220]">
                      {cat.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] font-bold text-[#F58220]">
                      {cat.listingCount > 0
                        ? `${toFa(cat.listingCount)} آگهی`
                        : "بدون آگهی"}
                    </p>
                  </div>
                </div>

                {/* Subcategory chips */}
                {subs.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {subs.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/45"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* "مشاهده" arrow (appears on hover) */}
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#F58220] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  مشاهده ماشین‌آلات
                  <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer link */}
        <div className="mt-10 text-center">
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white/80 transition hover:border-[#F58220] hover:text-[#F58220]"
          >
            مشاهدهٔ همهٔ دسته‌بندی‌ها
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
