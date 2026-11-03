import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

/* ============================================================
   GET /api/listings/[id]/attributes — PUBLIC

   Returns all ListingAttributeValue rows for a listing with the
   attribute definition joined. Used by the listing detail page
   to render the spec table.

   Response shape:
   {
     values: [{
       id, attributeId, key, labelFa, labelEn, type, unit,
       textValue, numberValue, booleanValue, dateValue, optionId,
       optionValue, optionLabel, unit (overrides),
       sourceType, confidence, verifiedAt, verifiedBy,
       createdAt, updatedAt
     }]
   }
   ============================================================ */
export async function GET(_req: Request, { params }: Args) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const listing = await db.listing.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const rows = await db.listingAttributeValue.findMany({
      where: { listingId: id },
      include: {
        attribute: {
          include: {
            options: {
              orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
            },
          },
        },
      },
      orderBy: [{ attribute: { sortOrder: "asc" } }, { attribute: { name: "asc" } }],
    });

    const values = rows.map((r) => {
      const opt = r.optionId
        ? r.attribute.options.find((o) => o.id === r.optionId)
        : null;
      return {
        id: r.id,
        attributeId: r.attributeId,
        key: r.attribute.key,
        labelFa: r.attribute.labelFa ?? r.attribute.name,
        labelEn: r.attribute.labelEn ?? r.attribute.nameEn ?? null,
        type: r.attribute.type,
        unit: r.unit ?? r.attribute.unit,
        textValue: r.textValue,
        numberValue: r.numberValue,
        booleanValue: r.booleanValue,
        dateValue: r.dateValue,
        optionId: r.optionId,
        optionValue: opt?.value ?? null,
        optionLabel: opt?.label ?? null,
        sourceType: r.sourceType,
        confidence: r.confidence,
        sourceReference: r.sourceReference,
        verifiedAt: r.verifiedAt,
        verifiedBy: r.verifiedBy,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    return NextResponse.json({ values });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ============================================================
   PUT /api/listings/[id]/attributes — admin / seller upsert.

   Body:
   {
     values: [{
       attributeId,
       textValue?, numberValue?, booleanValue?,
       dateValue?, optionId?, unit?,
       sourceType?, confidence?, sourceReference?
     }]
   }

   Strategy: upsert by @@unique([listingId, attributeId]).
   Returns: { ok: true, count }
   ============================================================ */
export async function PUT(req: Request, { params }: Args) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Auth: admin OR the listing's seller.
    const isAdmin = await isAuthenticated();
    const userId = await getCurrentUserId();
    if (!isAdmin && !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listing = await db.listing.findUnique({
      where: { id },
      select: { id: true, sellerId: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    if (!isAdmin && listing.sellerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const incoming: any[] = Array.isArray(body?.values) ? body.values : [];
    if (incoming.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    // Validate that all attributeIds exist
    const attrIds = Array.from(
      new Set(incoming.map((v) => String(v.attributeId)).filter(Boolean)),
    );
    if (attrIds.length === 0) {
      return NextResponse.json(
        { error: "attributeId is required for each value" },
        { status: 400 },
      );
    }
    const attrs = await db.attributeDefinition.findMany({
      where: { id: { in: attrIds } },
      select: { id: true, type: true },
    });
    const attrMap = new Map(attrs.map((a) => [a.id, a]));
    const missing = attrIds.filter((aid) => !attrMap.has(aid));
    if (missing.length) {
      return NextResponse.json(
        { error: `Unknown attributeId: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    // Build the upsert operations
    const ops = incoming
      .filter((v) => v && v.attributeId && attrMap.has(String(v.attributeId)))
      .map((v) => {
        const aid = String(v.attributeId);
        const dateValue =
          v.dateValue === undefined || v.dateValue === null || v.dateValue === ""
            ? null
            : new Date(v.dateValue);
        return db.listingAttributeValue.upsert({
          where: {
            listingId_attributeId: { listingId: id, attributeId: aid },
          },
          create: {
            listingId: id,
            attributeId: aid,
            textValue:
              v.textValue === undefined || v.textValue === null
                ? null
                : String(v.textValue),
            numberValue:
              v.numberValue === undefined || v.numberValue === null || v.numberValue === ""
                ? null
                : Number(v.numberValue),
            booleanValue:
              v.booleanValue === undefined || v.booleanValue === null
                ? null
                : Boolean(v.booleanValue),
            dateValue: isNaN(dateValue?.getTime() ?? NaN) ? null : dateValue,
            optionId:
              v.optionId === undefined || v.optionId === null || v.optionId === ""
                ? null
                : String(v.optionId),
            unit:
              v.unit === undefined || v.unit === null || v.unit === ""
                ? null
                : String(v.unit),
            sourceType:
              v.sourceType === undefined || v.sourceType === null
                ? isAdmin
                  ? "ADMIN_VERIFIED"
                  : "SELLER_INPUT"
                : String(v.sourceType),
            confidence:
              v.confidence === undefined || v.confidence === null
                ? null
                : Math.max(0, Math.min(1, Number(v.confidence))),
            sourceReference:
              v.sourceReference === undefined || v.sourceReference === null
                ? null
                : String(v.sourceReference),
            verifiedAt: isAdmin ? new Date() : null,
            verifiedBy: isAdmin ? "admin" : null,
          },
          update: {
            textValue:
              v.textValue === undefined || v.textValue === null
                ? null
                : String(v.textValue),
            numberValue:
              v.numberValue === undefined || v.numberValue === null || v.numberValue === ""
                ? null
                : Number(v.numberValue),
            booleanValue:
              v.booleanValue === undefined || v.booleanValue === null
                ? null
                : Boolean(v.booleanValue),
            dateValue: isNaN(dateValue?.getTime() ?? NaN) ? null : dateValue,
            optionId:
              v.optionId === undefined || v.optionId === null || v.optionId === ""
                ? null
                : String(v.optionId),
            unit:
              v.unit === undefined || v.unit === null || v.unit === ""
                ? null
                : String(v.unit),
            sourceType:
              v.sourceType === undefined || v.sourceType === null
                ? isAdmin
                  ? "ADMIN_VERIFIED"
                  : "SELLER_INPUT"
                : String(v.sourceType),
            confidence:
              v.confidence === undefined || v.confidence === null
                ? null
                : Math.max(0, Math.min(1, Number(v.confidence))),
            sourceReference:
              v.sourceReference === undefined || v.sourceReference === null
                ? null
                : String(v.sourceReference),
            verifiedAt: isAdmin ? new Date() : null,
            verifiedBy: isAdmin ? "admin" : null,
          },
        });
      });

    await db.$transaction(ops);

    return NextResponse.json({ ok: true, count: ops.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
