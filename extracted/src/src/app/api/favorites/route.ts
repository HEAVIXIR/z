import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(f: any) {
  return {
    ...f,
    listing: f.listing
      ? {
          ...f.listing,
          price: f.listing.price ? f.listing.price.toString() : null,
        }
      : null,
  };
}

/* GET /api/favorites — list current user favorites. */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const items = await db.favorite.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            brand: { select: { id: true, name: true, nameEn: true } },
            images: { take: 1, orderBy: { sortOrder: "asc" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ favorites: items.map(serialize) });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/favorites — add. Body: { listingId } */
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const listingId = String(body.listingId ?? "");
    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }
    const existing = await db.favorite.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    if (existing) {
      return NextResponse.json({ ok: true, already: true, id: existing.id });
    }
    const fav = await db.favorite.create({ data: { userId, listingId } });
    await db.listing.update({
      where: { id: listingId },
      data: { favoriteCount: { increment: 1 } },
    });
    return NextResponse.json({ ok: true, id: fav.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/favorites?listingId=...  or  ?id=... */
export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const listingId = url.searchParams.get("listingId");
    const id = url.searchParams.get("id");
    if (listingId) {
      await db.favorite.deleteMany({ where: { userId, listingId } });
      await db.listing.update({
        where: { id: listingId },
        data: { favoriteCount: { decrement: 1 } },
      });
    } else if (id) {
      await db.favorite.deleteMany({ where: { id, userId } });
    } else {
      return NextResponse.json(
        { error: "listingId or id is required" },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
