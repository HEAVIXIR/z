import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/wanted/[id]/responses — get seller responses (quotes) for a wanted request.
 * Only the buyer can see all responses. Sellers can see their own.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();

    const wanted = await db.buyRequest.findUnique({
      where: { id },
      select: { userId: true, status: true },
    });

    if (!wanted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get RFQ quotes linked to this request via RFQ
    const rfqs = await db.rFQ.findMany({
      where: { buyRequestId: id },
      select: { id: true },
    });

    if (rfqs.length === 0) {
      return NextResponse.json({ responses: [] });
    }

    const rfqIds = rfqs.map(r => r.id);
    const quotes = await db.rFQQuote.findMany({
      where: { rfqId: { in: rfqIds } },
      include: {
        seller: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter: buyer sees all, seller sees only own
    const filtered = userId && wanted.userId === userId
      ? quotes
      : quotes.filter(q => q.sellerId === userId);

    return NextResponse.json({
      responses: filtered.map(q => ({
        id: q.id,
        price: q.price ? q.price.toString() : null,
        currency: q.currency,
        deliveryDays: q.deliveryDays,
        notes: q.notes,
        status: q.status,
        createdAt: q.createdAt,
        seller: q.seller ? {
          id: q.seller.id,
          name: `${q.seller.firstName} ${q.seller.lastName}`.trim(),
        } : null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* POST /api/wanted/[id]/responses — seller submits a quote/response.
 * Body: { price, currency?, deliveryDays?, notes?, validityUntil? }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const wanted = await db.buyRequest.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!wanted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (wanted.status !== "ACTIVE") return NextResponse.json({ error: "Request is not active" }, { status: 409 });

    const body = await req.json().catch(() => ({}));
    const { price, currency, deliveryDays, notes, validityUntil } = body;

    if (!price) {
      return NextResponse.json({ error: "price is required" }, { status: 400 });
    }

    // Find or create an RFQ for this BuyRequest
    let rfq = await db.rFQ.findFirst({ where: { buyRequestId: id } });
    if (!rfq) {
      rfq = await db.rFQ.create({
        data: {
          buyRequestId: id,
          status: "QUOTING",
        },
      });
    }

    const quote = await db.rFQQuote.create({
      data: {
        rfqId: rfq.id,
        sellerId: userId,
        price: BigInt(String(price).replace(/[^\d]/g, "")),
        currency: currency || "IRR",
        deliveryDays: deliveryDays ? Number(deliveryDays) : null,
        notes: notes ? String(notes).slice(0, 1000) : null,
        validityUntil: validityUntil ? new Date(validityUntil) : null,
        status: "SUBMITTED",
      },
    });

    await logAudit({
      actorId: userId,
      actorType: "USER",
      action: "wanted.quote",
      entityType: "RFQQuote",
      entityId: quote.id,
      after: { rfqId: rfq.id, price: String(price), status: "SUBMITTED" },
      ip: getClientIp(req),
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: quote.id, status: quote.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
