import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/auctions
   GET  — list all auctions with stats
   POST — create auction
   ============================================================ */

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "زمان‌بندی‌شده",
  LIVE: "در حال برگزاری",
  ENDED: "پایان‌یافته",
  CANCELLED: "لغوشده",
};

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const auctions = await db.auction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
          },
        },
        _count: { select: { bids: true } },
      },
    });

    const [
      total,
      scheduled,
      live,
      ended,
      cancelled,
      totalBids,
    ] = await Promise.all([
      db.auction.count(),
      db.auction.count({ where: { status: "SCHEDULED" } }),
      db.auction.count({ where: { status: "LIVE" } }),
      db.auction.count({ where: { status: "ENDED" } }),
      db.auction.count({ where: { status: "CANCELLED" } }),
      db.auctionBid.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: auctions.map((a) => ({
        ...a,
        startPrice: a.startPrice.toString(),
        reservePrice: a.reservePrice ? a.reservePrice.toString() : null,
        minIncrement: a.minIncrement.toString(),
        winningBid: a.winningBid ? a.winningBid.toString() : null,
        statusLabel: STATUS_LABELS[a.status] ?? a.status,
        bidCount: a._count.bids,
        listing: {
          ...a.listing,
          price: a.listing.price ? a.listing.price.toString() : null,
        },
        _count: undefined,
      })),
      stats: {
        total,
        scheduled,
        live,
        ended,
        cancelled,
        totalBids,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const listingId = String(body.listingId ?? "").trim();
    const title = String(body.title ?? "").trim();
    const startPrice = parseBig(body.startPrice);
    const minIncrement = parseBig(body.minIncrement);
    const startDate = body.startDate ? new Date(body.startDate) : null;
    const endDate = body.endDate ? new Date(body.endDate) : null;

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (startPrice === null) {
      return NextResponse.json({ error: "startPrice is required" }, { status: 400 });
    }
    if (minIncrement === null) {
      return NextResponse.json({ error: "minIncrement is required" }, { status: 400 });
    }
    if (!startDate || isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "invalid startDate" }, { status: 400 });
    }
    if (!endDate || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "invalid endDate" }, { status: 400 });
    }
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "endDate must be after startDate" },
        { status: 400 },
      );
    }

    const listing = await db.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return NextResponse.json({ error: "listing not found" }, { status: 404 });
    }

    const auction = await db.auction.create({
      data: {
        listingId,
        title,
        description: body.description ? String(body.description) : null,
        startPrice,
        reservePrice: parseBig(body.reservePrice),
        minIncrement,
        startDate,
        endDate,
        status: "SCHEDULED",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...auction,
        startPrice: auction.startPrice.toString(),
        reservePrice: auction.reservePrice ? auction.reservePrice.toString() : null,
        minIncrement: auction.minIncrement.toString(),
        winningBid: auction.winningBid ? auction.winningBid.toString() : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
