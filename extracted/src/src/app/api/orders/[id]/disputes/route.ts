import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/orders/[id]/disputes — open a dispute on an order.
   Body: { reason, description?, evidence? } */
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
    if (order.deal.buyerId !== userId && order.deal.sellerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { reason, description, evidence } = body;
    if (!reason) return NextResponse.json({ error: "reason is required" }, { status: 400 });

    const dispute = await db.dispute.create({
      data: {
        orderId: id,
        status: "OPEN",
        reason: String(reason).slice(0, 200),
        description: description ? String(description).slice(0, 2000) : null,
        evidence: evidence ? JSON.stringify(evidence) : null,
        openedBy: userId,
      },
    });

    // Update deal status to DISPUTED
    await db.deal.update({
      where: { id: order.dealId },
      data: { status: "DISPUTED" },
    }).catch(() => {});

    await logAudit({
      actorId: userId,
      actorType: "USER",
      action: "dispute.opened",
      entityType: "Dispute",
      entityId: dispute.id,
      after: { orderId: id, reason, status: "OPEN" },
      ip: getClientIp(req),
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: dispute.id, status: dispute.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* GET /api/orders/[id]/disputes — list disputes for an order. */
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

    const disputes = await db.dispute.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ disputes });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
