import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getParticipantRole(
  dealRoomId: string,
  userId: string,
): Promise<"BUYER" | "SELLER" | null> {
  const room = await db.dealRoom.findUnique({
    where: { id: dealRoomId },
    select: { buyerId: true, sellerId: true },
  });
  if (!room) return null;
  if (room.buyerId === userId) return "BUYER";
  if (room.sellerId === userId) return "SELLER";
  return null;
}

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

/* GET /api/deal-rooms/[id] — full deal room with messages + documents. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const role = await getParticipantRole(id, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const room = await db.dealRoom.findUnique({
      where: { id },
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
        messages: { orderBy: { createdAt: "asc" } },
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!room) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ dealRoom: serialize(room), role });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/deal-rooms/[id] — update status / confirm. */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const role = await getParticipantRole(id, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const data: any = {};
    if (typeof body.status === "string") data.status = body.status;
    if (typeof body.buyerConfirmed === "boolean" && role === "BUYER")
      data.buyerConfirmed = body.buyerConfirmed;
    if (typeof body.sellerConfirmed === "boolean" && role === "SELLER")
      data.sellerConfirmed = body.sellerConfirmed;
    if (body.agreedPrice !== undefined) {
      data.agreedPrice = parseBig(body.agreedPrice);
    }
    // If both participants confirmed, advance to AGREED automatically.
    const current = await db.dealRoom.findUnique({
      where: { id },
      select: { buyerConfirmed: true, sellerConfirmed: true, status: true },
    });
    if (current) {
      const buyerConfirmed = data.buyerConfirmed ?? current.buyerConfirmed;
      const sellerConfirmed = data.sellerConfirmed ?? current.sellerConfirmed;
      if (buyerConfirmed && sellerConfirmed && !data.status) {
        data.status = "AGREED";
      }
    }
    const updated = await db.dealRoom.update({
      where: { id },
      data,
      include: {
        listing: true,
        messages: { orderBy: { createdAt: "asc" } },
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
    return NextResponse.json({ dealRoom: serialize(updated) });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
