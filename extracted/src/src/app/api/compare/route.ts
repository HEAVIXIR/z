import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/compare-engine";
import { getCurrentUserId } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(l: any) {
  return {
    ...l,
    price: l.price ? l.price.toString() : null,
  };
}

/* ============================================================
   POST /api/compare — create a new comparison session.
   Body: { name?: string, listingIds?: string[] }
   - Optional `name` for the session.
   - Optional `listingIds` to pre-populate the session with up to 5 items.
   - When the user is logged in, the session is bound to their userId.
   Returns: { session: { id, shareToken, name, createdAt }, items: [{id}] }
   ============================================================ */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) || null : null;
    const userId = await getCurrentUserId();

    const session = await createSession(userId, name ?? undefined);

    const items: { id: string; sortOrder: number }[] = [];
    const listingIds: string[] = Array.isArray(body.listingIds)
      ? body.listingIds.filter((x: any) => typeof x === "string").slice(0, 5)
      : [];

    // Pre-populate items if provided.
    for (const listingId of listingIds) {
      try {
        // Verify the listing exists + is PUBLISHED before adding.
        const listing = await db.listing.findUnique({
          where: { id: listingId },
          select: { id: true, status: true },
        });
        if (!listing || listing.status !== "PUBLISHED") continue;
        const it = await db.comparisonItem.create({
          data: {
            sessionId: session.id,
            listingId,
            sortOrder: items.length,
          },
          select: { id: true, sortOrder: true },
        });
        items.push(it);
      } catch {
        /* skip individual failures */
      }
    }

    // P1-2 — track COMPARE (fire-and-forget). Captures both session
    // creates and the count of items the user added for comparison.
    trackEvent({
      eventType: "COMPARE",
      userId,
      page: "/api/compare",
      metadata: { sessionId: session.id, itemCount: items.length },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        shareToken: session.shareToken,
        name: session.name,
        status: session.status,
        createdAt: session.createdAt,
      },
      items,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ============================================================
   GET /api/compare?ids=id1,id2,id3 — LEGACY ad-hoc compare.
   Returns 2-3 listings for inline comparison without a session.
   Kept for backward compatibility with the old /compare page; the
   new compare flow uses POST → /api/compare/[id].
   ============================================================ */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const idsParam = url.searchParams.get("ids") || "";
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length < 2 || ids.length > 5) {
      return NextResponse.json(
        { error: "۲ تا ۵ آگهی برای مقایسه وارد کنید" },
        { status: 400 },
      );
    }

    const listings = await db.listing.findMany({
      where: { id: { in: ids } },
      include: {
        brand: { select: { id: true, name: true, nameEn: true } },
        category: { select: { id: true, name: true, nameEn: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });

    const ordered = ids
      .map((id) => listings.find((l) => l.id === id))
      .filter(Boolean) as typeof listings;

    return NextResponse.json({
      listings: ordered.map(serialize),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
