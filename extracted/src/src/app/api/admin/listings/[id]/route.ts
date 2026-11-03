import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { parseBig, parseNumber, slugify } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

function serialize(l: any) {
  return {
    ...l,
    price: l.price ? l.price.toString() : null,
    images: (l.images ?? []).map((i: any) => ({ ...i })),
    attributeValues: (l.attributeValues ?? []).map((av: any) => ({
      id: av.id,
      attributeId: av.attributeId,
      textValue: av.textValue,
      numberValue: av.numberValue,
      booleanValue: av.booleanValue,
      dateValue: av.dateValue,
      optionId: av.optionId,
      unit: av.unit,
      sourceType: av.sourceType,
      attribute: av.attribute
        ? {
            id: av.attribute.id,
            key: av.attribute.key,
            name: av.attribute.name,
            nameEn: av.attribute.nameEn,
            labelFa: av.attribute.labelFa,
            labelEn: av.attribute.labelEn,
            type: av.attribute.type,
            unit: av.attribute.unit,
            options: (av.attribute.options ?? []).map((o: any) => ({
              id: o.id,
              value: o.value,
              label: o.label,
            })),
          }
        : null,
    })),
    passport: l.passport
      ? {
          ...l.passport,
          events: (l.passport.events ?? []).map((e: any) => ({ ...e })),
        }
      : null,
  };
}

/* GET /api/admin/listings/[id] — full detail. */
export async function GET(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    // NOTE: The new P1-5/6 relations (product, transactionType, country,
    // provinceRel, cityRel) are additive. We try the full include first; if
    // the running PrismaClient is stale (e.g. dev server hasn't picked up
    // the regenerated client yet), we fall back to a query without them.
    const fullInclude = {
      brand: true,
      category: true,
      model: true,
      seller: { select: { id: true, firstName: true, lastName: true, mobile: true, email: true } },
      company: true,
      product: { select: { id: true, canonicalName: true, slug: true } },
      transactionType: true,
      country: { select: { id: true, name: true, nameEn: true, code: true } },
      provinceRel: { select: { id: true, name: true, nameEn: true, code: true, countryId: true } },
      cityRel: { select: { id: true, name: true, nameEn: true, provinceId: true } },
      images: { orderBy: { sortOrder: "asc" } },
      favorites: { select: { id: true } },
      leads: { orderBy: { createdAt: "desc" }, take: 50 },
      offers: { orderBy: { createdAt: "desc" } },
      rejections: { include: { messages: true }, orderBy: { createdAt: "desc" } },
      passport: { include: { events: { orderBy: { date: "desc" } } } },
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
      // Stale PrismaClient — retry without the new P1-5/6 relations.
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
    return NextResponse.json({ listing: serialize(l) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* PATCH /api/admin/listings/[id] — update + actions + image management.
   Supports ?action=extend query param to renew the listing
   (sets publishedAt = now + extends expiresAt by 30 days).
*/
export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = new URL(req.url);
    const queryAction = url.searchParams.get("action");
    const bodyAction = body.action as string | undefined;
    const action = queryAction ?? bodyAction;

    const data: any = {};
    const allowedFields = [
      "title", "description", "shortDesc", "priceType", "listingType",
      "condition", "province", "city", "year", "workingHours", "status",
      "featured", "verified", "showInLatest", "sellerPhone", "sellerName",
      "sourceUrl", "sourceSite", "adminNotes", "brandId", "categoryId", "modelId",
      "sellerId", "companyId", "publishedAt",
      // P1-5/6 — canonical Location + Transaction normalization
      "transactionTypeId", "countryId", "provinceId", "cityId", "productId",
    ];
    for (const f of allowedFields) {
      if (f in body) {
        if (f === "year" || f === "workingHours") {
          data[f] = body[f] === null ? null : parseNumber(body[f]);
        } else if (typeof body[f] === "boolean") {
          data[f] = body[f];
        } else if (f === "publishedAt" || f === "expiresAt" || f === "soldAt") {
          data[f] = body[f] === null ? null : new Date(body[f]);
        } else {
          data[f] = body[f];
        }
      }
    }
    if ("price" in body) {
      data.price = parseBig(body.price);
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

    // Action
    if (action === "extend") {
      const now = new Date();
      data.publishedAt = now;
      data.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (existing.status === "PAUSED" || existing.status === "DRAFT") {
        data.status = "PUBLISHED";
      }
    } else if (action === "toggleFeatured") {
      data.featured = !existing.featured;
    } else if (action === "toggleVerified") {
      data.verified = !existing.verified;
    } else if (action === "toggleShowInLatest") {
      data.showInLatest = !existing.showInLatest;
    } else if (action === "markSold") {
      data.status = "SOLD";
      data.soldAt = new Date();
    } else if (action === "duplicate") {
      const newSlug = `${existing.slug}-copy-${Date.now()}`;
      const dup = await db.listing.create({
        data: {
          slug: newSlug,
          title: `${existing.title} (کپی)`,
          description: existing.description,
          shortDesc: existing.shortDesc,
          price: existing.price,
          priceType: existing.priceType,
          listingType: existing.listingType,
          condition: existing.condition,
          province: existing.province,
          city: existing.city,
          year: existing.year,
          workingHours: existing.workingHours,
          status: "PENDING",
          featured: false,
          verified: false,
          showInLatest: false,
          sellerPhone: existing.sellerPhone,
          sellerName: existing.sellerName,
          brandId: existing.brandId,
          categoryId: existing.categoryId,
          modelId: existing.modelId,
          sellerId: existing.sellerId,
          companyId: existing.companyId,
        },
      });
      // Copy images
      const imgs = await db.listingImage.findMany({ where: { listingId: id } });
      if (imgs.length > 0) {
        await db.listingImage.createMany({
          data: imgs.map((i) => ({
            listingId: dup.id,
            url: i.url,
            alt: i.alt,
            isPrimary: i.isPrimary,
            sortOrder: i.sortOrder,
          })),
        });
      }
      return NextResponse.json({ ok: true, duplicated: true, id: dup.id });
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

    // Image management
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

    // ── Attribute values upsert (full attribute editing) ──
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
            numberValue:
              v.numberValue == null || v.numberValue === ""
                ? null
                : Number(v.numberValue),
            booleanValue:
              v.booleanValue == null ? null : Boolean(v.booleanValue),
            dateValue: isNaN(dateValue?.getTime() ?? NaN) ? null : dateValue,
            optionId:
              v.optionId == null || v.optionId === "" ? null : String(v.optionId),
            unit: v.unit == null || v.unit === "" ? null : String(v.unit),
            sourceType: "ADMIN_VERIFIED",
            verifiedAt: new Date(),
            verifiedBy: "admin",
          },
          update: {
            textValue: v.textValue == null ? null : String(v.textValue),
            numberValue:
              v.numberValue == null || v.numberValue === ""
                ? null
                : Number(v.numberValue),
            booleanValue:
              v.booleanValue == null ? null : Boolean(v.booleanValue),
            dateValue: isNaN(dateValue?.getTime() ?? NaN) ? null : dateValue,
            optionId:
              v.optionId == null || v.optionId === "" ? null : String(v.optionId),
            unit: v.unit == null || v.unit === "" ? null : String(v.unit),
            sourceType: "ADMIN_VERIFIED",
            verifiedAt: new Date(),
            verifiedBy: "admin",
          },
        });
      }
    }
    // Optional: delete attribute values for attributes not in the incoming set
    if (Array.isArray(body.removeAttributeIds) && body.removeAttributeIds.length) {
      await db.listingAttributeValue.deleteMany({
        where: {
          listingId: id,
          attributeId: { in: body.removeAttributeIds.map(String) },
        },
      });
    }

    const fresh = await db.listing.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    });
    return NextResponse.json({ ok: true, listing: fresh ? serialize(fresh) : null });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* DELETE /api/admin/listings/[id]  (P0-RBAC: requires listing.delete) */
export async function DELETE(_req: Request, { params }: Params) {
  // Authorization: legacy admin-cookie path OR user session with `listing.delete`.
  // The admin-cookie path is legacy (see src/app/admin/layout.tsx) and bypasses RBAC.
  const adminCookieOk = await isAuthenticated();
  const sessionUser = adminCookieOk ? null : await getCurrentUser();
  if (!adminCookieOk && !sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sessionUser && !(await hasPermission(sessionUser.id, "listing.delete"))) {
    return NextResponse.json(
      { error: "Forbidden: missing permission 'listing.delete'" },
      { status: 403 },
    );
  }
  try {
    const { id } = await params;
    await db.listing.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
