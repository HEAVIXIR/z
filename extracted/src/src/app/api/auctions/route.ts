import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/auctions  (PUBLIC)
   GET — list public auctions.
   - default: LIVE + SCHEDULED (UPCOMING) + ENDED (most recent 30)
   - ?status=LIVE|UPCOMING|ENDED  filter
   - ?limit=30
   ============================================================ */

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "زمان‌بندی‌شده",
  LIVE: "در حال برگزاری",
  ENDED: "پایان‌یافته",
  CANCELLED: "لغوشده",
};

function deriveLiveStatus(a: {
  status: string;
  startDate: Date;
  endDate: Date;
}): "LIVE" | "UPCOMING" | "ENDED" {
  const now = new Date();
  if (a.status === "ENDED") return "ENDED";
  if (a.status === "CANCELLED") return "ENDED";
  if (now < a.startDate) return "UPCOMING";
  if (now > a.endDate) return "ENDED";
  return "LIVE";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status")?.toUpperCase() || null;
    const limit = Math.min(60, Math.max(1, Number(url.searchParams.get("limit")) || 30));

    // Build where — exclude CANCELLED unless explicitly asked.
    const where: any = { status: { not: "CANCELLED" } };

    const auctions = await db.auction.findMany({
      where,
      orderBy: [{ startDate: "asc" }],
      take: 200,
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            shortDesc: true,
            condition: true,
            year: true,
            workingHours: true,
            city: true,
            province: true,
            images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
            brand: { select: { name: true } },
            category: { select: { name: true, icon: true } },
          },
        },
        bids: {
          orderBy: { amount: "desc" },
          take: 1,
          select: { amount: true },
        },
        _count: { select: { bids: true } },
      },
    });

    // Compute derived status + highest bid
    const enriched = auctions.map((a) => {
      const derived = deriveLiveStatus(a);
      const highestBid = a.bids[0]?.amount ?? null;
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        startPrice: a.startPrice.toString(),
        reservePrice: a.reservePrice ? a.reservePrice.toString() : null,
        minIncrement: a.minIncrement.toString(),
        startDate: a.startDate.toISOString(),
        endDate: a.endDate.toISOString(),
        status: a.status,
        statusLabel: STATUS_LABELS[a.status] ?? a.status,
        liveStatus: derived,
        winningBid: a.winningBid ? a.winningBid.toString() : null,
        winnerName: a.winnerName,
        currentBid: highestBid ? highestBid.toString() : a.startPrice.toString(),
        bidCount: a._count.bids,
        listing: {
          ...a.listing,
          image: a.listing.images[0]?.url ?? null,
          images: undefined,
        },
        bids: undefined,
        _count: undefined,
      };
    });

    // Apply status filter on the DERIVED live status (more useful for the public).
    const filtered = statusFilter
      ? enriched.filter((a) => a.liveStatus === statusFilter)
      : enriched;

    return NextResponse.json({
      auctions: filtered.slice(0, limit),
      total: filtered.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
