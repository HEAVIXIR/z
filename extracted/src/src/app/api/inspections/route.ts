import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(i: any) {
  return {
    ...i,
    price: i.price ? i.price.toString() : null,
    listing: i.listing
      ? {
          ...i.listing,
          price: i.listing.price ? i.listing.price.toString() : null,
        }
      : null,
  };
}

/* POST /api/inspections — request a new inspection. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const listingId = String(body.listingId ?? "").trim();
    const dealRoomId = body.dealRoomId ? String(body.dealRoomId) : null;
    const notes = body.notes ? String(body.notes) : null;
    if (!listingId) {
      return NextResponse.json(
        { error: "listingId الزامی است" },
        { status: 400 },
      );
    }
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { id: true, title: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    const inspection = await db.inspection.create({
      data: {
        listingId,
        dealRoomId,
        requestedBy: user.id,
        status: "REQUESTED",
        notes,
      },
      include: { listing: true },
    });
    return NextResponse.json({ inspection: serialize(inspection) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* GET /api/inspections — list inspections requested by or relevant to the user. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Inspections requested by this user OR for listings they own.
    const userListingIds = await db.listing.findMany({
      where: { sellerId: user.id },
      select: { id: true },
    });
    const ids = userListingIds.map((l) => l.id);
    const inspections = await db.inspection.findMany({
      where: {
        OR: [{ requestedBy: user.id }, { listingId: { in: ids } }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            price: true,
            province: true,
            city: true,
            images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
          },
        },
      },
    });
    return NextResponse.json({
      inspections: inspections.map((i) => ({
        ...i,
        price: i.price ? i.price.toString() : null,
        listing: i.listing
          ? {
              ...i.listing,
              price: i.listing.price ? i.listing.price.toString() : null,
            }
          : null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
