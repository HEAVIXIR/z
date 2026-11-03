import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toFa, faDate } from "@/lib/format";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ListingCard from "@/components/listings/ListingCard";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Star,
  ShieldCheck,
  Megaphone,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [seller, headerCats] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, slug: true, logoUrl: true, verified: true } },
        _count: {
          select: { listings: { where: { status: "PUBLISHED" } } },
        },
      },
    }),
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
  ]);

  if (!seller) notFound();

  const listings = await db.listing.findMany({
    where: { sellerId: seller.id, status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    take: 12,
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true, icon: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
    },
  });

  const totalViews = await db.listing.aggregate({
    where: { sellerId: seller.id },
    _sum: { viewCount: true },
  });

  const trustScore = Math.min(
    100,
    40 +
      (listings.length >= 5 ? 20 : listings.length * 4) +
      (seller._count.listings >= 10 ? 20 : 0) +
      (seller.company?.verified ? 20 : 0),
  );

  const fullName = `${seller.firstName} ${seller.lastName}`.trim();

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={headerCats} />

      <main className="flex-1 pt-32">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
          {/* Breadcrumb */}
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-white/40">
            <Link href="/" className="hover:text-[#F58220]">خانه</Link>
            <ArrowLeft className="h-3 w-3" />
            <Link href="/sellers" className="hover:text-[#F58220]">فروشندگان</Link>
            <ArrowLeft className="h-3 w-3" />
            <span className="text-white/70">{fullName}</span>
          </nav>

          {/* Profile header */}
          <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-l from-[#F58220]/10 via-[#141414] to-[#141414] p-8">
            <div className="flex flex-wrap items-start gap-6">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#F58220]/15 text-3xl font-black text-[#F58220]">
                {seller.firstName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-black text-white lg:text-4xl">
                    {fullName}
                  </h1>
                  {seller.company?.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                      <ShieldCheck className="h-3 w-3" />
                      تأییدشده
                    </span>
                  )}
                </div>
                {seller.companyName && (
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-white/55">
                    <Building2 className="h-4 w-4 text-[#F58220]" />
                    {seller.companyName}
                  </p>
                )}

                {/* Trust score */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-1.5">
                    <Star className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">
                      امتیاز اعتماد: {toFa(trustScore)} از {toFa(100)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-[#111] p-4 text-center">
                  <Megaphone className="mx-auto h-5 w-5 text-[#F58220]" />
                  <div className="mt-1 text-xl font-black text-white">
                    {toFa(seller._count.listings)}
                  </div>
                  <div className="text-[10px] text-white/45">آگهی</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#111] p-4 text-center">
                  <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-400" />
                  <div className="mt-1 text-xl font-black text-white">
                    {toFa(totalViews._sum.viewCount ?? 0)}
                  </div>
                  <div className="text-[10px] text-white/45">بازدید</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#111] p-4 text-center">
                  <Star className="mx-auto h-5 w-5 text-amber-400" />
                  <div className="mt-1 text-xl font-black text-white">
                    {toFa(seller._count.listings > 0 ? 5 : 0)}
                  </div>
                  <div className="text-[10px] text-white/45">امتیاز</div>
                </div>
              </div>
            </div>

            {/* Company link */}
            {seller.company && (
              <Link
                href={`/companies/${seller.company.slug}`}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#F58220]/30 bg-[#F58220]/5 px-4 py-2 text-xs font-bold text-[#F58220] transition hover:bg-[#F58220]/10"
              >
                <Building2 className="h-3.5 w-3.5" />
                مشاهدهٔ صفحهٔ شرکت: {seller.company.name}
              </Link>
            )}
          </div>

          {/* Listings */}
          <h2 className="mb-4 text-lg font-black text-white">
            آگهی‌های این فروشنده
          </h2>
          {listings.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#111] p-16 text-center">
              <p className="text-sm text-white/50">
                این فروشنده هنوز آگهی ثبت نکرده است.
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
