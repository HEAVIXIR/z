import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/orders/[id]/payments — list payments for an order. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const order = await db.order.findUnique({
      where: { id },
      include: { deal: { select: { buyerId: true, sellerId: true } } },
    });
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (order.deal.buyerId !== userId && order.deal.sellerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payments = await db.payment.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      payments: payments.map(p => ({ ...p, amount: p.amount.toString() })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* POST /api/orders/[id]/payments — create a payment record.
   Body: { amount, type?, gateway?, idempotencyKey?, providerReference? }
   Idempotency: if idempotencyKey matches an existing payment, returns that payment. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const order = await db.order.findUnique({
      where: { id },
      include: { deal: { select: { buyerId: true, sellerId: true } } },
    });
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Only buyer can create payments
    if (order.deal.buyerId !== userId) {
      return NextResponse.json({ error: "Only buyer can create payments" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { amount, type, gateway, idempotencyKey, providerReference } = body;

    if (!amount) return NextResponse.json({ error: "amount is required" }, { status: 400 });

    // Idempotency check
    if (idempotencyKey) {
      const existing = await db.payment.findUnique({ where: { idempotencyKey } });
      if (existing) {
        return NextResponse.json({ ok: true, id: existing.id, status: existing.status, idempotent: true });
      }
    }

    const payment = await db.payment.create({
      data: {
        userId,
        orderId: id,
        amount: BigInt(String(amount).replace(/[^\d]/g, "")),
        currency: order.currencySnapshot,
        type: type || "ORDER_PAYMENT",
        status: "PENDING",
        gateway: gateway || null,
        providerReference: providerReference || null,
        idempotencyKey: idempotencyKey || null,
      },
    });

    await logAudit({
      actorId: userId,
      actorType: "USER",
      action: "payment.created",
      entityType: "Payment",
      entityId: payment.id,
      after: { orderId: id, amount: String(amount), status: "PENDING" },
      ip: getClientIp(req),
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: payment.id, status: payment.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
