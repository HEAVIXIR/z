import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/deals — list current user's deals (as buyer or seller). */
export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status")?.trim();
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));

    const where: any = {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    };
    if (status) where.status = status;

    const deals = await db.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        listing: { select: { id: true, title: true, slug: true } },
        order: { select: { id: true, orderNumber: true, status: true } },
      },
    });

    return NextResponse.json({
      deals: deals.map(d => ({
        ...d,
        agreedAmount: d.agreedAmount ? d.agreedAmount.toString() : null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* POST /api/deals — create a deal from an accepted offer/quote/dealroom.
   Body: { sourceType, sourceId, listingId?, buyerId?, sellerId?, agreedAmount?, transactionType? } */
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { sourceType, sourceId, listingId, buyerId, sellerId, agreedAmount, transactionType } = body;

    if (!sourceType || !sourceId) {
      return NextResponse.json({ error: "sourceType and sourceId are required" }, { status: 400 });
    }

    // Verify the source exists and is in accepted/agreed state
    let verifiedAmount: bigint | null = null;
    let verifiedBuyerId = buyerId || null;
    let verifiedSellerId = sellerId || null;
    let verifiedListingId = listingId || null;

    if (sourceType === "LISTING_OFFER") {
      const offer = await db.listingOffer.findUnique({ where: { id: sourceId } });
      if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
      if (offer.status !== "ACCEPTED") return NextResponse.json({ error: "Offer must be ACCEPTED" }, { status: 409 });
      verifiedAmount = offer.offerAmount;
      verifiedBuyerId = offer.buyerId;
      verifiedListingId = offer.listingId;
    } else if (sourceType === "DEAL_ROOM") {
      const room = await db.dealRoom.findUnique({ where: { id: sourceId } });
      if (!room) return NextResponse.json({ error: "Deal room not found" }, { status: 404 });
      if (room.status !== "AGREED" && room.status !== "NEGOTIATING") {
        return NextResponse.json({ error: "Deal room must be AGREED" }, { status: 409 });
      }
      verifiedAmount = room.agreedPrice;
      verifiedBuyerId = room.buyerId;
      verifiedSellerId = room.sellerId;
      verifiedListingId = room.listingId;
    } else if (sourceType === "RFQ_QUOTE") {
      const quote = await db.rFQQuote.findUnique({ where: { id: sourceId } });
      if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
      if (quote.status !== "ACCEPTED") return NextResponse.json({ error: "Quote must be ACCEPTED" }, { status: 409 });
      verifiedAmount = quote.price;
      verifiedSellerId = quote.sellerId;
    }

    // Generate deal number
    const dealNumber = "DEAL-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

    const deal = await db.deal.create({
      data: {
        dealNumber,
        sourceType,
        sourceId,
        buyerId: verifiedBuyerId,
        sellerId: verifiedSellerId,
        listingId: verifiedListingId,
        agreedAmount: agreedAmount ? BigInt(String(agreedAmount).replace(/[^\d]/g, "")) : verifiedAmount,
        currency: "IRR",
        transactionType: transactionType || "SALE",
        status: "PENDING_CONFIRMATION",
        agreedAt: new Date(),
      },
    });

    await logAudit({
      actorId: userId,
      actorType: "USER",
      action: "deal.created",
      entityType: "Deal",
      entityId: deal.id,
      after: { dealNumber, sourceType, status: "PENDING_CONFIRMATION" },
      ip: getClientIp(req),
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: deal.id, dealNumber, status: deal.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
