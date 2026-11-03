import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/auctions/[id]/bids  (AUTH REQUIRED)
   POST — place a bid on an auction.
   - requires user session
   - amount must be a positive integer (Toman)
   - amount must be > current highest bid (or startPrice if none) + minIncrement
   - auction must be LIVE (not SCHEDULED, ENDED, or CANCELLED)
   ============================================================ */

interface Args {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Args) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "برای شرکت در مزایده باید وارد شوید" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const amount = parseBig(body.amount);

    if (amount === null || amount <= 0n) {
      return NextResponse.json({ error: "مبلغ پیشنهاد نامعتبر است" }, { status: 400 });
    }

    // Fetch auction with leading bid (highest amount).
    const auction = await db.auction.findUnique({
      where: { id },
      include: {
        bids: {
          orderBy: { amount: "desc" },
          take: 1,
          select: { id: true, amount: true, bidderId: true, isWinning: true },
        },
      },
    });

    if (!auction) {
      return NextResponse.json({ error: "مزایده یافت نشد" }, { status: 404 });
    }

    // Validate state — must be LIVE.
    const now = new Date();
    if (auction.status === "CANCELLED") {
      return NextResponse.json({ error: "این مزایده لغو شده است" }, { status: 400 });
    }
    if (auction.status === "ENDED" || now > auction.endDate) {
      return NextResponse.json({ error: "مزایده پایان یافته است" }, { status: 400 });
    }
    if (now < auction.startDate) {
      return NextResponse.json({ error: "مزایده هنوز آغاز نشده است" }, { status: 400 });
    }

    // Compute current leading bid (or fall back to start price).
    const leading = auction.bids[0];
    const currentHighest = leading ? leading.amount : auction.startPrice;
    const minNext = currentHighest + auction.minIncrement;

    if (amount < minNext) {
      return NextResponse.json(
        {
          error: `مبلغ پیشنهاد باید حداقل ${minNext.toLocaleString("fa-IR")} تومان باشد`,
          minimumNextBid: minNext.toString(),
          currentBid: currentHighest.toString(),
        },
        { status: 400 },
      );
    }

    // Reject own listing seller from bidding? (we don't have a clear seller
    // pointer here since Auction.listing.sellerId is optional — allow but
    // flag for review in audit later.)

    // Demote any prior winning/leading bid on this auction.
    if (leading && leading.isWinning) {
      await db.auctionBid.update({
        where: { id: leading.id },
        data: { isWinning: false },
      });
    }

    // Persist the new bid.
    const bid = await db.auctionBid.create({
      data: {
        auctionId: auction.id,
        bidderName: `${user.firstName} ${user.lastName}`.trim() || user.mobile,
        bidderPhone: user.mobile,
        bidderId: user.id,
        amount,
        isWinning: true,
      },
    });

    return NextResponse.json({
      ok: true,
      bid: {
        id: bid.id,
        amount: bid.amount.toString(),
        createdAt: bid.createdAt.toISOString(),
        isWinning: bid.isWinning,
      },
      currentBid: amount.toString(),
      minimumNextBid: (amount + auction.minIncrement).toString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
