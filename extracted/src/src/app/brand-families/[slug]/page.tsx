import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Building2, MapPin, ArrowLeft, Layers, Star } from "lucide-react";
import { toFa } from "@/lib/format";
import {
  BRAND_TYPE_LABELS,
  VERIFICATION_LABELS,
  verificationBadgeClass,
} from "@/lib/brand-labels";

export const dynamic = "force-dynamic";

type FamilyMember = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  country: string | null;
  logoUrl: string | null;
  type: string | null;
  verification: string;
  _count: { listings: number };
};

export default async function BrandFamilyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const family = await db.brandFamily.findUnique({
    where: { slug },
    include: {
      brands: {
        select: {
          id: true,
          slug: true,
          name: true,
          nameEn: true,
          country: true,
          logoUrl: true,
          type: true,
          verification: true,
          _count: {
            select: { listings: { where: { status: "PUBLISHED" } } },
          },
        },
      },
    },
  });

  if (!family) notFound();

  // Sort members: featured-active brands with listings first, then by name.
  const members: FamilyMember[] = [...family.brands].sort((a, b) => {
    if (b._count.listings !== a._count.listings) {
      return b._count.listings - a._count.listings;
    }
    return a.name.localeCompare(b.name, "fa");
  });

  const totalListings = members.reduce(
    (sum, m) => sum + m._count.listings,
    0,
  );

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        <div className="mx-auto max-w-[1400px] px-6 py-12 lg:px-10">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-white/40">
            <Link href="/" className="hover:text-[#F58220]">
              خانه
            </Link>
            <ArrowLeft className="h-3 w-3" />
            <Link href="/brands" className="hover:text-[#F58220]">
              برندها
            </Link>
            <ArrowLeft className="h-3 w-3" />
            <span className="text-white/60">{family.name}</span>
          </nav>

          {/* Family hero */}
          <div className="mb-10 flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-[#111] p-8 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/5">
              {family.logoUrl ? (
                <img
                  src={family.logoUrl}
                  alt={family.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Layers className="h-10 w-10 text-[#F58220]" />
              )}
            </div>
            <div className="flex-1 text-center sm:text-right">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-3xl font-black text-white">
                  {family.name}
                </h1>
                {family.nameEn && (
                  <span className="text-lg text-white/40">
                    ({family.nameEn})
                  </span>
                )}
              </div>
              {family.country && (
                <p className="mt-2 inline-flex items-center gap-1 text-sm text-white/50">
                  <MapPin className="h-3.5 w-3.5 text-[#F58220]" />
                  {family.country}
                </p>
              )}
              {family.description && (
                <p className="mt-3 text-sm leading-7 text-white/50">
                  {family.description}
                </p>
              )}
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-[#F58220]">
                  {toFa(members.length)}
                </p>
                <p className="text-[11px] text-white/40">برند عضو</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-[#F58220]">
                  {toFa(totalListings)}
                </p>
                <p className="text-[11px] text-white/40">آگهی فعال</p>
              </div>
            </div>
          </div>

          {/* Member brand grid */}
          {members.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#111] p-12 text-center">
              <p className="text-sm text-white/40">
                هنوز برندی به این خانواده اضافه نشده است.
              </p>
              <Link
                href="/brands"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#F58220]"
              >
                مشاهده همه برندها
                <ArrowLeft className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white">
                <Building2 className="h-5 w-5 text-[#F58220]" />
                برندهای عضو خانواده
                <span className="text-sm font-normal text-white/40">
                  ({toFa(members.length)} برند)
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {members.map((m) => {
                  const verInfo = VERIFICATION_LABELS[m.verification];
                  const showVer =
                    verInfo && verInfo.level !== "none" && verInfo.label;
                  const typeLabel = m.type
                    ? BRAND_TYPE_LABELS[m.type] ?? null
                    : null;
                  return (
                    <Link
                      key={m.id}
                      href={`/brands/${encodeURIComponent(m.slug)}`}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#F58220]/40 hover:shadow-[0_20px_50px_rgba(0,0,0,.4)]"
                    >
                      {m._count.listings > 0 && (
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#F58220]/15 px-2 py-0.5 text-[9px] font-bold text-[#F58220]">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          فعال
                        </span>
                      )}
                      <div className="mb-3 flex h-16 w-full items-center justify-center overflow-hidden rounded-xl bg-white/5">
                        {m.logoUrl ? (
                          <img
                            src={m.logoUrl}
                            alt={m.name}
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <Building2 className="h-8 w-8 text-[#F58220]/60" />
                        )}
                      </div>
                      <h3 className="line-clamp-1 text-sm font-black text-white transition-colors group-hover:text-[#F58220]">
                        {m.name}
                      </h3>
                      {m.nameEn && (
                        <p className="line-clamp-1 text-[11px] text-white/35">
                          {m.nameEn}
                        </p>
                      )}
                      {m.country && (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-white/45">
                          <MapPin className="h-3 w-3 text-[#F58220]" />
                          {m.country}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {showVer && (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${verificationBadgeClass(
                              verInfo!.level,
                            )}`}
                          >
                            {verInfo!.label}
                          </span>
                        )}
                        {typeLabel && (
                          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold text-white/55">
                            {typeLabel}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 border-t border-white/10 pt-2.5 text-[11px] text-white/55">
                        {toFa(m._count.listings)} آگهی فعال
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer settings={null} />
    </div>
  );
}
