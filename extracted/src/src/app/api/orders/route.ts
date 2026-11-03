import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/orders — list current user's orders. */
export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));

    // Get orders via deal buyer/seller
    const orders = await db.order.findMany({
      where: {
        deal: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        deal: {
          select: { id: true, dealNumber: true, buyerId: true, sellerId: true, listing: { select: { id: true, title: true } } },
        },
        payments: { select: { id: true, amount: true, status: true, type: true } },
      },
    });

    return NextResponse.json({
      orders: orders.map(o => ({
        ...o,
        priceSnapshot: o.priceSnapshot.toString(),
        commissionAmount: o.commissionAmount?.toString() || null,
        sellerAmount: o.sellerAmount?.toString() || null,
        payments: o.payments.map(p => ({ ...p, amount: p.amount.toString() })),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
