import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ListingEditForm from "@/app/admin/listings/[id]/edit/ListingEditForm";

export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

/* ─────────────────────────────────────────────────────────────
   /dashboard/listings/[id]/edit — seller's own listing editor.
   Reuses the same ListingEditForm (mode="seller") which posts
   to /api/listings/[id] (ownership-checked).
───────────────────────────────────────────────────────────── */
export default async function SellerListingEditPage({ params }: Args) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // NOTE: P1-5/6 relations are additive. Defensive include — fall back to
  // legacy include if the running PrismaClient is stale.
  const fullInclude = {
    brand: { select: { id: true, name: true, nameEn: true, slug: true } },
    category: { select: { id: true, name: true, slug: true, parentId: true } },
    model: { select: { id: true, name: true, nameEn: true } },
    product: { select: { id: true, canonicalName: true, slug: true } },
    transactionType: true,
    country: { select: { id: true, name: true, nameEn: true, code: true } },
    provinceRel: { select: { id: true, name: true, nameEn: true, code: true, countryId: true } },
    cityRel: { select: { id: true, name: true, nameEn: true, provinceId: true } },
    images: { orderBy: { sortOrder: "asc" } },
    attributeValues: {
      include: {
        attribute: {
          include: {
            options: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] },
          },
        },
      },
    },
  };
  let listing: any = null;
  try {
    listing = await db.listing.findUnique({ where: { id }, include: fullInclude });
  } catch (includeErr: any) {
    if (
      typeof includeErr?.message === "string" &&
      includeErr.message.includes("Unknown field")
    ) {
      const { product: _p, transactionType: _t, country: _c, provinceRel: _pr, cityRel: _ci, ...legacyInclude } = fullInclude;
      listing = await db.listing.findUnique({ where: { id }, include: legacyInclude });
    } else {
      throw includeErr;
    }
  }

  if (!listing) notFound();
  if (listing.sellerId !== user.id) {
    // Not the owner — forbid.
    notFound();
  }

  const initial = {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    description: listing.description ?? "",
    shortDesc: listing.shortDesc ?? "",
    price: listing.price ? listing.price.toString() : "",
    priceType: listing.priceType,
    listingType: listing.listingType,
    condition: listing.condition ?? "",
    province: listing.province ?? "",
    city: listing.city ?? "",
    year: listing.year ?? null,
    workingHours: listing.workingHours ?? null,
    status: listing.status,
    featured: listing.featured,
    verified: listing.verified,
    showInLatest: listing.showInLatest,
    sellerPhone: listing.sellerPhone ?? "",
    sellerName: listing.sellerName ?? "",
    adminNotes: listing.adminNotes ?? "",
    brandId: listing.brandId ?? "",
    brandName: listing.brand?.name ?? "",
    categoryId: listing.categoryId ?? "",
    modelId: listing.modelId ?? "",
    publishedAt: listing.publishedAt ? listing.publishedAt.toISOString() : null,
    expiresAt: listing.expiresAt ? listing.expiresAt.toISOString() : null,
    // P1-5/6 — new fields (additive)
    transactionTypeId: listing.transactionTypeId ?? "",
    countryId: listing.countryId ?? "",
    provinceId: listing.provinceId ?? "",
    cityId: listing.cityId ?? "",
    productId: listing.productId ?? "",
    productCanonicalName: listing.product?.canonicalName ?? "",
    images: listing.images.map((i) => ({
      id: i.id,
      url: i.url,
      alt: i.alt,
      isPrimary: i.isPrimary,
      sortOrder: i.sortOrder,
    })),
    attributeValues: listing.attributeValues.map((av) => ({
      attributeId: av.attributeId,
      key: av.attribute.key,
      type: av.attribute.type,
      textValue: av.textValue,
      numberValue: av.numberValue,
      booleanValue: av.booleanValue,
      dateValue: av.dateValue ? av.dateValue.toISOString() : null,
      optionId: av.optionId,
      unit: av.unit ?? av.attribute.unit,
    })),
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <ListingEditForm initial={initial} mode="seller" />
      </div>
    </div>
  );
}
