import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toFa, faDate } from "@/lib/format";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ListingCard from "@/components/listings/ListingCard";
import {
  ArrowLeft,
  Building2,
  Globe,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const [company, headerCats] = await Promise.all([
    db.company.findFirst({
      where: { slug, status: "ACTIVE" },
      include: {
        _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
      },
    }),
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
  ]);

  if (!company) notFound();

  /* Increment view count */
  db.company
    .update({ where: { id: company.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  const listings = await db.listing.findMany({
    where: { companyId: company.id, status: "PUBLISHED" },
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
            <Link href="/companies" className="hover:text-[#F58220]">شرکت‌ها</Link>
            <ArrowLeft className="h-3 w-3" />
            <span className="text-white/70">{company.name}</span>
          </nav>

          {/* Company header */}
          <div className="relative mb-8 overflow-hidden rounded-3xl border border-white/10">
            {company.coverImage ? (
               
              <img
                src={company.coverImage}
                alt={company.name}
                className="h-48 w-full object-cover lg:h-60"
              />
            ) : (
              <div className="h-48 w-full bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c] lg:h-60" />
            )}
            <div className="relative -mt-16 px-8 pb-8">
              <div className="flex flex-wrap items-end gap-6">
                <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-[#0b0b0b] bg-white p-3">
                  {company.logoUrl ? (
                     
                    <img src={company.logoUrl} alt={company.name} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <Building2 className="h-12 w-12 text-[#F58220]" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-black text-white lg:text-4xl">
                      {company.name}
                    </h1>
                    {company.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                        <ShieldCheck className="h-3 w-3" />
                        تأییدشده
                      </span>
                    )}
                    {company.premium && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-400">
                        <Star className="h-3 w-3 fill-current" />
                        Premium
                      </span>
                    )}
                  </div>
                  {company.description && (
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
                      {company.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/55">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-[#F58220]" />
                      {toFa(company._count.listings)} آگهی
                    </span>
                    {company.province && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-[#F58220]" />
                        {company.city ? `${company.city}، ` : ""}{company.province}
                      </span>
                    )}
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#F58220] hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        وب‌سایت
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111] p-4 transition hover:border-[#F58220]/40"
              >
                <Phone className="h-5 w-5 shrink-0 text-[#F58220]" />
                <div>
                  <p className="text-[10px] text-white/45">تماس</p>
                  <p className="text-sm font-bold text-white" dir="ltr">
                    {company.phone}
                  </p>
                </div>
              </a>
            )}
            {company.email && (
              <a
                href={`mailto:${company.email}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111] p-4 transition hover:border-[#F58220]/40"
              >
                <Mail className="h-5 w-5 shrink-0 text-[#F58220]" />
                <div>
                  <p className="text-[10px] text-white/45">ایمیل</p>
                  <p className="text-sm font-bold text-white" dir="ltr">
                    {company.email}
                  </p>
                </div>
              </a>
            )}
            {company.address && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111] p-4">
                <MapPin className="h-5 w-5 shrink-0 text-[#F58220]" />
                <div>
                  <p className="text-[10px] text-white/45">آدرس</p>
                  <p className="text-xs leading-5 text-white/75">
                    {company.address}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Listings */}
          <h2 className="mb-4 text-lg font-black text-white">
            آگهی‌های شرکت
          </h2>
          {listings.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#111] p-16 text-center">
              <p className="text-sm text-white/50">
                این شرکت هنوز آگهی ثبت نکرده است.
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
