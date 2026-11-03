import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ListingCard from "@/components/listings/ListingCard";
import { ArrowLeft, FolderTree } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const [category, headerCats] = await Promise.all([
    db.category.findFirst({
      where: { slug },
      include: {
        children: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          include: { _count: { select: { listings: { where: { status: "PUBLISHED" } } } } },
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

  if (!category) notFound();

  const childIds = category.children.map((c) => c.id);
  const listingWhere = {
    status: "PUBLISHED" as const,
    OR: [{ categoryId: category.id }, { categoryId: { in: childIds } }],
  };

  const listings = await db.listing.findMany({
    where: listingWhere,
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    take: 24,
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true, icon: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
    },
  });

  const breadcrumbs: { name: string; href: string }[] = [
    { name: "خانه", href: "/" },
    { name: "دسته‌بندی‌ها", href: "/#categories" },
  ];
  if (category.parentId) {
    const parent = headerCats.find((c) => c.id === category.parentId);
    if (parent) breadcrumbs.push({ name: parent.name, href: `/categories/${parent.slug}` });
  }
  breadcrumbs.push({ name: category.name, href: `/categories/${category.slug}` });

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={headerCats} />

      <main className="flex-1 pt-32">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
          {/* Breadcrumb */}
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-white/40">
            {breadcrumbs.map((b, i) => (
              <span key={b.href} className="inline-flex items-center gap-2">
                {i > 0 && <ArrowLeft className="h-3 w-3" />}
                <Link
                  href={b.href}
                  className={i === breadcrumbs.length - 1 ? "text-white/70" : "hover:text-[#F58220]"}
                >
                  {b.name}
                </Link>
              </span>
            ))}
          </nav>

          {/* Header */}
          <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-l from-[#F58220]/10 via-[#141414] to-[#141414] p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F58220]/15 text-4xl">
                {category.icon ?? <FolderTree className="h-7 w-7 text-[#F58220]" />}
              </div>
              <div>
                <h1 className="text-3xl font-black text-white lg:text-4xl">
                  {category.name}
                </h1>
                {category.description && (
                  <p className="mt-1 max-w-2xl text-sm leading-7 text-white/55">
                    {category.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-white/45">
                  {toFa(category._count.listings)} آگهی فعال
                </p>
              </div>
            </div>
          </div>

          {/* Sub-categories */}
          {category.children.length > 0 && (
            <div className="mb-10">
              <h2 className="mb-4 text-lg font-black text-white">
                زیردسته‌بندی‌ها
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {category.children.map((c) => (
                  <Link
                    key={c.id}
                    href={`/categories/${c.slug}`}
                    className="group flex items-center justify-between rounded-2xl border border-white/10 bg-[#111] p-4 transition hover:-translate-y-0.5 hover:border-[#F58220]/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{c.icon ?? "📁"}</span>
                      <span className="text-sm font-bold text-white transition group-hover:text-[#F58220]">
                        {c.name}
                      </span>
                    </div>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/55">
                      {toFa(c._count.listings)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Listings */}
          <h2 className="mb-4 text-lg font-black text-white">
            آگهی‌های این دسته
          </h2>
          {listings.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#111] p-16 text-center">
              <p className="text-sm text-white/50">
                آگهی فعالی در این دسته وجود ندارد.
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
                    brandName: l.brand?.name ?? null,
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

          <div className="mt-12 text-center">
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#F58220]"
            >
              <ArrowLeft className="h-4 w-4 rotate-180" />
              مشاهدهٔ همهٔ آگهی‌ها
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
