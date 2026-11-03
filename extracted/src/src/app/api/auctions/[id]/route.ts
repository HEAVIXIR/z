import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/auctions/[id]  (PUBLIC)
   GET — public auction detail with bid history.
   ============================================================ */

interface Args {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "زمان‌بندی‌شده",
  LIVE: "در حال برگزاری",
  ENDED: "پایان‌یافته",
  CANCELLED: "لغوشده",
};

function deriveLiveStatus(a: { status: string; startDate: Date; endDate: Date }): "LIVE" | "UPCOMING" | "ENDED" {
  const now = new Date();
  if (a.status === "ENDED") return "ENDED";
  if (a.status === "CANCELLED") return "ENDED";
  if (now < a.startDate) return "UPCOMING";
  if (now > a.endDate) return "ENDED";
  return "LIVE";
}

export async function GET(_req: Request, { params }: Args) {
  try {
    const { id } = await params;
    const auction = await db.auction.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            shortDesc: true,
            description: true,
            condition: true,
            year: true,
            workingHours: true,
            city: true,
            province: true,
            price: true,
            images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
            brand: { select: { name: true } },
            category: { select: { name: true, icon: true } },
          },
        },
        bids: {
          orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
          select: {
            id: true,
            bidderName: true,
            amount: true,
            createdAt: true,
            isWinning: true,
          },
        },
        _count: { select: { bids: true } },
      },
    });

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }
    if (auction.status === "CANCELLED") {
      return NextResponse.json({ error: "این مزایده لغو شده است" }, { status: 410 });
    }

    const derived = deriveLiveStatus(auction);
    const highestBid = auction.bids[0]?.amount ?? null;
    // Minimum next bid = current highest + minIncrement (or startPrice if no bids).
    const nextMin =
      (highestBid ?? auction.startPrice) + auction.minIncrement;

    return NextResponse.json({
      auction: {
        id: auction.id,
        title: auction.title,
        description: auction.description,
        startPrice: auction.startPrice.toString(),
        reservePrice: auction.reservePrice ? auction.reservePrice.toString() : null,
        minIncrement: auction.minIncrement.toString(),
        startDate: auction.startDate.toISOString(),
        endDate: auction.endDate.toISOString(),
        status: auction.status,
        statusLabel: STATUS_LABELS[auction.status] ?? auction.status,
        liveStatus: derived,
        winningBid: auction.winningBid ? auction.winningBid.toString() : null,
        winnerName: auction.winnerName,
        inspectionReport: auction.inspectionReport,
        adminNotes: auction.adminNotes,
        currentBid: highestBid ? highestBid.toString() : auction.startPrice.toString(),
        minimumNextBid: nextMin.toString(),
        bidCount: auction._count.bids,
        createdAt: auction.createdAt.toISOString(),
        listing: {
          ...auction.listing,
          price: auction.listing.price ? auction.listing.price.toString() : null,
          images: auction.listing.images.map((img) => ({
            id: img.id,
            url: img.url,
            alt: img.alt,
            isPrimary: img.isPrimary,
          })),
        },
        bids: auction.bids.map((b, idx) => ({
          id: b.id,
          bidderName: idx === 0 ? b.bidderName : maskName(b.bidderName),
          amount: b.amount.toString(),
          createdAt: b.createdAt.toISOString(),
          isWinning: b.isWinning,
          isLeading: idx === 0 && derived === "LIVE",
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* Mask bidder name for non-leading bids: "علی رضایی" → "علی ر. */
function maskName(name: string): string {
  if (!name) return "ناشناس";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2) + "****";
  }
  return `${parts[0]} ${parts[1][0]}.`;
}
