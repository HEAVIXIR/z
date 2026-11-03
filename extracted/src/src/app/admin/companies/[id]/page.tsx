import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Building2 } from "lucide-react";
import { db } from "@/lib/db";
import CompanyDetailClient from "./CompanyDetailClient";
import PartnershipSection from "./PartnershipSection";

export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "جزئیات شرکت — هویکس" };

/* /admin/companies/[id] — company detail / edit page.
   Server component: fetches the company + documents + branches +
   verifications + recent listings + partnerships once and hands
   the payload to the client component for editing.
*/
export default async function AdminCompanyDetailPage({ params }: Args) {
  const { id } = await params;

  const [company, cities, partners] = await Promise.all([
    db.company.findUnique({
      where: { id },
      include: {
        documents: { orderBy: { createdAt: "desc" } },
        branches: {
          orderBy: [{ isHeadquarters: "desc" }, { createdAt: "desc" }],
          include: {
            city: {
              select: {
                id: true,
                name: true,
                province: { select: { id: true, name: true } },
              },
            },
          },
        },
        verifications: { orderBy: { submittedAt: "desc" } },
        listings: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true, slug: true, title: true, price: true, status: true,
            province: true, city: true, publishedAt: true, featured: true,
          },
        },
        _count: {
          select: { listings: true, documents: true, branches: true, verifications: true },
        },
      },
    }),
    db.city.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        province: { select: { id: true, name: true } },
      },
    }),
    // P2-5a — Partnership network: load outgoing + incoming rows.
    Promise.all([
      db.companyPartner.findMany({
        where: { companyId: id },
        include: {
          partner: {
            select: {
              id: true, name: true, slug: true, logoUrl: true, city: true, province: true, verified: true,
              _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
            },
          },
        },
        orderBy: { requestedAt: "desc" },
      }),
      db.companyPartner.findMany({
        where: { partnerId: id },
        include: {
          company: {
            select: {
              id: true, name: true, slug: true, logoUrl: true, city: true, province: true, verified: true,
              _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
            },
          },
        },
        orderBy: { requestedAt: "desc" },
      }),
    ]).then(([outgoing, incoming]) => ({
      outgoing: outgoing.map((p) => ({
        id: p.id,
        status: p.status,
        requestedAt: p.requestedAt.toISOString(),
        acceptedAt: p.acceptedAt ? p.acceptedAt.toISOString() : null,
        notes: p.notes,
        direction: "OUTGOING" as const,
        partner: { ...p.partner, listingsCount: p.partner._count.listings, _count: undefined },
      })),
      incoming: incoming.map((p) => ({
        id: p.id,
        status: p.status,
        requestedAt: p.requestedAt.toISOString(),
        acceptedAt: p.acceptedAt ? p.acceptedAt.toISOString() : null,
        notes: p.notes,
        direction: "INCOMING" as const,
        partner: { ...p.company, listingsCount: p.company._count.listings, _count: undefined },
      })),
    })),
  ]);

  if (!company) notFound();

  const initial = {
    id: company.id,
    name: company.name,
    slug: company.slug,
    description: company.description ?? "",
    logoUrl: company.logoUrl ?? "",
    coverImage: company.coverImage ?? "",
    website: company.website ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    address: company.address ?? "",
    city: company.city ?? "",
    province: company.province ?? "",
    verified: company.verified,
    premium: company.premium,
    status: company.status,
    metaTitle: company.metaTitle ?? "",
    metaDescription: company.metaDescription ?? "",
    viewCount: company.viewCount,
    createdAt: company.createdAt.toISOString(),
    documents: company.documents.map((d) => ({
      id: d.id,
      type: d.type,
      url: d.url,
      status: d.status,
      verifiedBy: d.verifiedBy ?? "",
      verifiedAt: d.verifiedAt ? d.verifiedAt.toISOString() : null,
      createdAt: d.createdAt.toISOString(),
    })),
    branches: company.branches.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address ?? "",
      cityId: b.cityId ?? "",
      cityName: b.city?.name ?? null,
      provinceName: b.city?.province?.name ?? null,
      phone: b.phone ?? "",
      isHeadquarters: b.isHeadquarters,
      active: b.active,
      createdAt: b.createdAt.toISOString(),
    })),
    verifications: company.verifications.map((v) => ({
      id: v.id,
      status: v.status,
      submittedAt: v.submittedAt.toISOString(),
      reviewedAt: v.reviewedAt ? v.reviewedAt.toISOString() : null,
      reviewedBy: v.reviewedBy ?? "",
      notes: v.notes ?? "",
    })),
    listings: company.listings.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      price: l.price ? l.price.toString() : null,
      status: l.status,
      province: l.province ?? "",
      city: l.city ?? "",
      publishedAt: l.publishedAt ? l.publishedAt.toISOString() : null,
      featured: l.featured,
    })),
    listingsCount: company._count.listings,
    documentsCount: company._count.documents,
    branchesCount: company._count.branches,
    verificationsCount: company._count.verifications,
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/admin/companies" className="hover:text-[#F58220]">
            شرکت‌ها
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span>{company.name}</span>
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-zinc-900">
          <Building2 className="h-6 w-6 text-[#F58220]" />
          {company.name}
        </h1>
      </div>

      <CompanyDetailClient initial={initial} cities={cities} />

      {/* P2-5a — Company Network: partnership manager */}
      <PartnershipSection companyId={company.id} initial={partners} />
    </div>
  );
}
