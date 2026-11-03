import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(d: any) {
  return {
    ...d,
    agreedPrice: d.agreedPrice ? d.agreedPrice.toString() : null,
    messages: (d.messages ?? []).map((m: any) => ({ ...m })),
    documents: (d.documents ?? []).map((doc: any) => ({ ...doc })),
    listing: d.listing
      ? {
          ...d.listing,
          price: d.listing.price ? d.listing.price.toString() : null,
        }
      : null,
  };
}

/* POST /api/deal-rooms — buyer creates a deal room for a listing. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const listingId = String(body.listingId ?? "").trim();
    const buyerPhone = String(body.buyerPhone ?? user.mobile ?? "").trim();
    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 },
      );
    }
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, sellerPhone: true, sellerName: true, title: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    if (listing.sellerId === user.id) {
      return NextResponse.json(
        { error: "نمی‌توانید برای آگهی خودتان اتاق معامله بسازید" },
        { status: 400 },
      );
    }
    // Reuse an existing OPEN/NEGOTIATING deal room for the same buyer+listing pair.
    const existing = await db.dealRoom.findFirst({
      where: {
        listingId,
        buyerId: user.id,
        status: { in: ["OPEN", "NEGOTIATING", "AGREED", "INSPECTION", "TRANSPORT"] },
      },
      include: { listing: true, messages: true, documents: true },
    });
    if (existing) {
      return NextResponse.json({ dealRoom: serialize(existing) });
    }
    const dealRoom = await db.dealRoom.create({
      data: {
        listingId,
        buyerId: user.id,
        sellerId: listing.sellerId ?? null,
        buyerPhone,
        sellerPhone: listing.sellerPhone ?? null,
        status: "OPEN",
      },
      include: { listing: true, messages: true, documents: true },
    });
    return NextResponse.json({ dealRoom: serialize(dealRoom) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* GET /api/deal-rooms — list deal rooms where the current user is buyer OR seller. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const rooms = await db.dealRoom.findMany({
      where: {
        OR: [{ buyerId: user.id }, { sellerId: user.id }],
      },
      orderBy: { updatedAt: "desc" },
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
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    return NextResponse.json({
      dealRooms: rooms.map((r) => ({
        ...r,
        agreedPrice: r.agreedPrice ? r.agreedPrice.toString() : null,
        listing: r.listing
          ? {
              ...r.listing,
              price: r.listing.price ? r.listing.price.toString() : null,
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
