import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, getCurrentUserId } from "@/lib/auth";
import { parseBig, parseNumber, slugify } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

/* ============================================================
   /api/listings/[id] — seller-scoped listing endpoint.

   Sellers can GET / PATCH / DELETE their OWN listings only.
   Admins (isAuthenticated) can also operate on any listing.
   ============================================================ */

async function authorize(listingId: string) {
  const isAdmin = await isAuthenticated();
  const userId = await getCurrentUserId();
  if (!isAdmin && !userId) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true, slug: true, title: true },
  });
  if (!listing) {
    return { ok: false as const, status: 404, error: "Not found" };
  }
  if (!isAdmin && listing.sellerId !== userId) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const, isAdmin, userId, listing };
}

/* GET /api/listings/[id] — seller's own listing detail. */
export async function GET(_req: Request, { params }: Args) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    // NOTE: The new P1-5/6 relations (product, transactionType, country,
    // provinceRel, cityRel) are additive. We try the full include first; if
    // the running PrismaClient is stale, we fall back to a query without them.
    const fullInclude = {
      brand: { select: { id: true, name: true, nameEn: true } },
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
    let l: any = null;
    try {
      l = await db.listing.findUnique({ where: { id }, include: fullInclude });
    } catch (includeErr: any) {
      if (
        typeof includeErr?.message === "string" &&
        includeErr.message.includes("Unknown field")
      ) {
        const { product: _p, transactionType: _t, country: _c, provinceRel: _pr, cityRel: _ci, ...legacyInclude } = fullInclude;
        l = await db.listing.findUnique({ where: { id }, include: legacyInclude });
      } else {
        throw includeErr;
      }
    }
    if (!l) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      listing: {
        ...l,
        price: l.price ? l.price.toString() : null,
        images: l.images.map((i) => ({ ...i })),
        attributeValues: l.attributeValues.map((av) => ({
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
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* PATCH /api/listings/[id] — seller updates own listing.
   Supports ?action=extend to renew (publishedAt = now + 30d).
   Sellers cannot set status to PUBLISHED themselves (must be PENDING
   for admin review) — except for already-PUBLISHED listings they can
   save edits to.
*/
export async function PATCH(req: Request, { params }: Args) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { isAdmin, listing } = auth;

    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? body.action;

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: any = {};
    const allowedFields = [
      "title", "description", "shortDesc", "priceType", "listingType",
      "condition", "province", "city", "year", "workingHours",
      "sellerPhone", "sellerName", "brandId", "categoryId", "modelId",
      // P1-5/6 — canonical Location + Transaction normalization (additive)
      "transactionTypeId", "countryId", "provinceId", "cityId", "productId",
    ];
    for (const f of allowedFields) {
      if (f in body) {
        if (f === "year" || f === "workingHours") {
          data[f] = body[f] === null ? null : parseNumber(body[f]);
        } else {
          data[f] = body[f];
        }
      }
    }
    if ("price" in body) {
      data.price = parseBig(body.price);
    }

    // Sellers can update status but cannot self-publish a PENDING/DRAFT/REJECTED listing.
    if ("status" in body) {
      const newStatus = String(body.status);
      if (isAdmin) {
        data.status = newStatus;
      } else {
        // Seller constraints:
        // - cannot mark as SOLD unless already PUBLISHED
        // - cannot directly publish from PENDING/REJECTED/DRAFT (must go through review)
        if (newStatus === "PUBLISHED" && existing.status !== "PUBLISHED") {
          // Seller requesting publication — set to PENDING for admin review.
          data.status = "PENDING";
        } else if (newStatus === "PAUSED" || newStatus === "SOLD") {
          data.status = newStatus;
          if (newStatus === "SOLD") data.soldAt = new Date();
        } else if (newStatus === "DRAFT") {
          data.status = "DRAFT";
        }
        // else: ignore forbidden status transitions
      }
    }

    // Only admin can change featured / verified / showInLatest
    if (isAdmin) {
      if ("featured" in body) data.featured = Boolean(body.featured);
      if ("verified" in body) data.verified = Boolean(body.verified);
      if ("showInLatest" in body) data.showInLatest = Boolean(body.showInLatest);
      if ("adminNotes" in body) data.adminNotes = body.adminNotes;
    }

    // Slug re-sync if title changed
    if (body.title && body.title !== existing.title) {
      let slug = slugify(body.title);
      let i = 1;
      while (await db.listing.findFirst({ where: { slug, NOT: { id } } })) {
        slug = `${slugify(body.title)}-${i++}`;
      }
      data.slug = slug;
    }

    // Action: extend (renew)
    if (action === "extend") {
      const now = new Date();
      data.publishedAt = now;
      data.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      // Seller extend: keep current status (PUBLISHED stays PUBLISHED).
    }

    await db.listing.update({ where: { id }, data }).catch(async (updateErr: any) => {
      // Stale PrismaClient may reject the new P1-5/6 scalar fields. Strip them and retry.
      const msg = String(updateErr?.message ?? "");
      if (msg.includes("Unknown argument") || msg.includes("Unknown field")) {
        const legacyData = { ...data };
        delete legacyData.transactionTypeId;
        delete legacyData.countryId;
        delete legacyData.provinceId;
        delete legacyData.cityId;
        delete legacyData.productId;
        await db.listing.update({ where: { id }, data: legacyData });
      } else {
        throw updateErr;
      }
    });

    // Image management (seller can add/remove/reorder/primary)
    if (body.addImages && Array.isArray(body.addImages)) {
      const existingCount = await db.listingImage.count({ where: { listingId: id } });
      await db.listingImage.createMany({
        data: body.addImages.map((img: any, idx: number) => ({
          listingId: id,
          url: String(img.url ?? img),
          alt: img.alt ?? null,
          isPrimary: img.isPrimary ?? (existingCount === 0 && idx === 0),
          sortOrder: img.sortOrder ?? existingCount + idx,
        })),
      });
    }
    if (body.removeImages && Array.isArray(body.removeImages)) {
      await db.listingImage.deleteMany({
        where: { id: { in: body.removeImages.map(String) } },
      });
    }
    if (body.setPrimaryImage) {
      await db.listingImage.updateMany({
        where: { listingId: id },
        data: { isPrimary: false },
      });
      await db.listingImage.update({
        where: { id: String(body.setPrimaryImage) },
        data: { isPrimary: true },
      });
    }
    if (body.reorderImages && Array.isArray(body.reorderImages)) {
      await Promise.all(
        body.reorderImages.map((imgId: string, idx: number) =>
          db.listingImage.update({ where: { id: String(imgId) }, data: { sortOrder: idx } }),
        ),
      );
    }

    // Attribute values upsert
    if (Array.isArray(body.attributeValues)) {
      const incoming: any[] = body.attributeValues;
      for (const v of incoming) {
        if (!v || !v.attributeId) continue;
        const aid = String(v.attributeId);
        const dateValue =
          v.dateValue === undefined || v.dateValue === null || v.dateValue === ""
            ? null
            : new Date(v.dateValue);
        await db.listingAttributeValue.upsert({
          where: { listingId_attributeId: { listingId: id, attributeId: aid } },
          create: {
            listingId: id,
            attributeId: aid,
            textValue: v.textValue == null ? null : String(v.textValue),
            numberValue: v.numberValue == null || v.numberValue === "" ? null : Number(v.numberValue),
            booleanValue: v.booleanValue == null ? null : Boolean(v.booleanValue),
            dateValue: isNaN(dateValue?.getTime() ?? NaN) ? null : dateValue,
            optionId: v.optionId == null || v.optionId === "" ? null : String(v.optionId),
            unit: v.unit == null || v.unit === "" ? null : String(v.unit),
            sourceType: isAdmin ? "ADMIN_VERIFIED" : "SELLER_INPUT",
            verifiedAt: isAdmin ? new Date() : null,
            verifiedBy: isAdmin ? "admin" : null,
          },
          update: {
            textValue: v.textValue == null ? null : String(v.textValue),
            numberValue: v.numberValue == null || v.numberValue === "" ? null : Number(v.numberValue),
            booleanValue: v.booleanValue == null ? null : Boolean(v.booleanValue),
            dateValue: isNaN(dateValue?.getTime() ?? NaN) ? null : dateValue,
            optionId: v.optionId == null || v.optionId === "" ? null : String(v.optionId),
            unit: v.unit == null || v.unit === "" ? null : String(v.unit),
            sourceType: isAdmin ? "ADMIN_VERIFIED" : "SELLER_INPUT",
            verifiedAt: isAdmin ? new Date() : null,
            verifiedBy: isAdmin ? "admin" : null,
          },
        });
      }
    }

    const fresh = await db.listing.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        model: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    });
    return NextResponse.json({
      ok: true,
      listing: fresh
        ? {
            ...fresh,
            price: fresh.price ? fresh.price.toString() : null,
          }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* DELETE /api/listings/[id] — seller can delete own listing. */
export async function DELETE(_req: Request, { params }: Args) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    await db.listing.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
