import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ListingCard from "@/components/listings/ListingCard";
import { ArrowLeft, Cog, Calendar, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ModelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const [model, headerCats] = await Promise.all([
    db.productModel.findFirst({
      where: { slug },
      include: {
        brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
        category: { select: { id: true, name: true, slug: true, icon: true } },
        generations: {
          where: { status: "ACTIVE" },
          orderBy: { yearFrom: "asc" },
        },
        _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
      },
    }),
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
  ]);

  if (!model) notFound();

  const listings = await db.listing.findMany({
    where: { modelId: model.id, status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    take: 24,
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true, icon: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
    },
  });

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={headerCats} />

      <main className="flex-1 pt-32">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
          {/* Breadcrumb */}
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-white/40">
            <Link href="/" className="hover:text-[#F58220]">خانه</Link>
            <ArrowLeft className="h-3 w-3" />
            {model.brand && (
              <>
                <Link
                  href={`/brands/${model.brand.slug}`}
                  className="hover:text-[#F58220]"
                >
                  {model.brand.name}
                </Link>
                <ArrowLeft className="h-3 w-3" />
              </>
            )}
            <span className="text-white/70">{model.name}</span>
          </nav>

          {/* Header */}
          <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-l from-[#F58220]/10 via-[#141414] to-[#141414] p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F58220]/15">
                <Cog className="h-8 w-8 text-[#F58220]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {model.brand && (
                    <Link
                      href={`/brands/${model.brand.slug}`}
                      className="rounded-full bg-[#F58220]/15 px-3 py-1 text-xs font-bold text-[#F58220] transition hover:bg-[#F58220]/25"
                    >
                      {model.brand.name}
                    </Link>
                  )}
                  {model.category && (
                    <Link
                      href={`/categories/${model.category.slug}`}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition hover:border-[#F58220]/40 hover:text-[#F58220]"
                    >
                      {model.category.icon} {model.category.name}
                    </Link>
                  )}
                </div>
                <h1 className="mt-2 text-3xl font-black text-white lg:text-4xl">
                  {model.name}
                </h1>
                {model.nameEn && (
                  <p className="mt-1 text-sm text-white/45" dir="ltr">
                    {model.nameEn}
                  </p>
                )}
                <p className="mt-2 text-xs text-white/55">
                  {toFa(model._count.listings)} آگهی فعال
                </p>
              </div>
            </div>

            {model.description && (
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">
                {model.description}
              </p>
            )}
          </div>

          {/* Generations */}
          {model.generations.length > 0 && (
            <div className="mb-10">
              <h2 className="mb-4 text-lg font-black text-white">نسل‌ها</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {model.generations.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-2xl border border-white/10 bg-[#111] p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#F58220]" />
                      <p className="text-sm font-bold text-white">{g.name}</p>
                    </div>
                    {(g.yearFrom || g.yearTo) && (
                      <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-white/45">
                        <Calendar className="h-3 w-3" />
                        {g.yearFrom ? toFa(g.yearFrom) : "—"}
                        {g.yearTo ? ` - ${toFa(g.yearTo)}` : " - اکنون"}
                      </p>
                    )}
                    {g.description && (
                      <p className="mt-2 line-clamp-2 text-[11px] text-white/45">
                        {g.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listings */}
          <h2 className="mb-4 text-lg font-black text-white">
            آگهی‌های این مدل
          </h2>
          {listings.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#111] p-16 text-center">
              <p className="text-sm text-white/50">
                آگهی فعالی برای این مدل وجود ندارد.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((l) => (
                <ListingCard
                  key={l.id}
                  l={{
                    id: l.id,
                    slug: l.slug,
                    title: l.title,
                    shortDesc: l.shortDesc,
                    description: l.description,
                    brandName: l.brand?.name ?? model.brand?.name ?? null,
                    price: l.price ? (l.price as any) : null,
                    priceType: l.priceType,
                    image: l.images[0]?.url ?? null,
                    icon: l.category?.icon ?? null,
                    year: l.year,
                    city: l.city,
                    province: l.province,
                    workingHours: l.workingHours,
                    condition: l.condition,
                    featured: l.featured,
                    viewCount: l.viewCount,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
