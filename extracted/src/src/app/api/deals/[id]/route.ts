import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Valid state transitions
const TRANSITIONS: Record<string, string[]> = {
  "DRAFT": ["PENDING_CONFIRMATION", "CANCELLED"],
  "PENDING_CONFIRMATION": ["CONFIRMED", "CANCELLED", "EXPIRED"],
  "CONFIRMED": ["IN_PROGRESS", "CANCELLED"],
  "IN_PROGRESS": ["COMPLETED", "DISPUTED", "CANCELLED"],
  "COMPLETED": [],
  "CANCELLED": [],
  "DISPUTED": ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  "EXPIRED": [],
};

/* GET /api/deals/[id] — get a single deal. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const deal = await db.deal.findUnique({
      where: { id },
      include: {
        listing: { select: { id: true, title: true, slug: true } },
        order: { select: { id: true, orderNumber: true, status: true } },
        disputes: { select: { id: true, status: true, reason: true } },
      },
    });

    if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (deal.buyerId !== userId && deal.sellerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      deal: {
        ...deal,
        agreedAmount: deal.agreedAmount ? deal.agreedAmount.toString() : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* PATCH /api/deals/[id] — transition deal status (state machine). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const deal = await db.deal.findUnique({ where: { id } });
    if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (deal.buyerId !== userId && deal.sellerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const newStatus = String(body.status ?? "");

    // Validate transition
    const allowed = TRANSITIONS[deal.status] || [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json({
        error: `Invalid transition: ${deal.status} → ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`,
      }, { status: 409 });
    }

    const updateData: any = { status: newStatus };
    if (newStatus === "CONFIRMED") updateData.confirmedAt = new Date();
    if (newStatus === "COMPLETED") updateData.completedAt = new Date();
    if (newStatus === "CANCELLED") {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = body.cancelReason || null;
    }

    const updated = await db.deal.update({ where: { id }, data: updateData });

    // If deal is confirmed and no order exists, create one
    if (newStatus === "CONFIRMED" && !deal.order) {
      const orderNumber = "ORD-" + Date.now().toString(36).toUpperCase();
      const listing = deal.listingId ? await db.listing.findUnique({ where: { id: deal.listingId }, select: { title: true } }) : null;
      
      await db.order.create({
        data: {
          orderNumber,
          dealId: deal.id,
          titleSnapshot: listing?.title || "Deal " + deal.dealNumber,
          priceSnapshot: deal.agreedAmount || 0n,
          currencySnapshot: deal.currency,
          sellerSnapshot: deal.sellerId,
          buyerSnapshot: deal.buyerId,
          quantity: 1,
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });

      await logAudit({
        actorId: userId,
        actorType: "USER",
        action: "order.created",
        entityType: "Order",
        after: { dealId: deal.id, status: "CONFIRMED" },
        ip: getClientIp(req),
      }).catch(() => {});
    }

    await logAudit({
      actorId: userId,
      actorType: "USER",
      action: "deal." + newStatus.toLowerCase(),
      entityType: "Deal",
      entityId: id,
      before: { status: deal.status },
      after: { status: newStatus },
      ip: getClientIp(req),
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: updated.id, status: updated.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
