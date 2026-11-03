import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/orders/[id] — get a single order with payments. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const order = await db.order.findUnique({
      where: { id },
      include: {
        deal: { select: { id: true, dealNumber: true, buyerId: true, sellerId: true, listingId: true } },
        payments: true,
        disputes: { select: { id: true, status: true, reason: true } },
      },
    });

    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (order.deal.buyerId !== userId && order.deal.sellerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      order: {
        ...order,
        priceSnapshot: order.priceSnapshot.toString(),
        commissionAmount: order.commissionAmount?.toString() || null,
        sellerAmount: order.sellerAmount?.toString() || null,
        payments: order.payments.map(p => ({ ...p, amount: p.amount.toString() })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
