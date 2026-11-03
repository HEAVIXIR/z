import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { storeDb } from "@/lib/store-db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/store/orders/[id] — order detail + status update
   ============================================================ */

const ALLOWED_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];
const ALLOWED_PAY_STATUSES = ["UNPAID", "PARTIAL", "PAID", "REFUNDED"];

function serialize(o: any) {
  return {
    ...o,
    subtotalUsd: o.subtotalUsd?.toString?.() ?? String(o.subtotalUsd ?? 0),
    shippingUsd: o.shippingUsd?.toString?.() ?? String(o.shippingUsd ?? 0),
    discountIrr: o.discountIrr?.toString?.() ?? String(o.discountIrr ?? 0),
    totalUsd: o.totalUsd?.toString?.() ?? String(o.totalUsd ?? 0),
    totalIrr: o.totalIrr?.toString?.() ?? String(o.totalIrr ?? 0),
    currencyRateAtOrder: o.currencyRateAtOrder?.toString?.() ?? String(o.currencyRateAtOrder ?? 0),
    marginPercentAtOrder: o.marginPercentAtOrder?.toString?.() ?? String(o.marginPercentAtOrder ?? 0),
    createdAt: o.createdAt?.toISOString?.() ?? null,
    updatedAt: o.updatedAt?.toISOString?.() ?? null,
    items: (o.items || []).map((it: any) => ({
      ...it,
      unitPriceUsd: it.unitPriceUsd?.toString?.() ?? String(it.unitPriceUsd ?? 0),
      unitPriceIrr: it.unitPriceIrr?.toString?.() ?? String(it.unitPriceIrr ?? 0),
      lineTotalUsd: it.lineTotalUsd?.toString?.() ?? String(it.lineTotalUsd ?? 0),
      lineTotalIrr: it.lineTotalIrr?.toString?.() ?? String(it.lineTotalIrr ?? 0),
    })),
    payments: (o.payments || []).map((p: any) => ({
      ...p,
      amountIrr: p.amountIrr?.toString?.() ?? String(p.amountIrr ?? 0),
      amountUsd: p.amountUsd?.toString?.() ?? String(p.amountUsd ?? 0),
      createdAt: p.createdAt?.toISOString?.() ?? null,
      reviewedAt: p.reviewedAt?.toISOString?.() ?? null,
    })),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const order = await storeDb.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, family: true, phone: true, address: true } },
        mechanic: { select: { id: true, name: true, family: true, shopName: true, phone: true } },
        items: { include: { part: { select: { id: true, name: true, nameFa: true, sku: true } } } },
        payments: true,
        shipment: true,
      },
    });
    if (!order) return NextResponse.json({ success: false, error: "یافت نشد" }, { status: 404 });
    return NextResponse.json({ success: true, data: serialize(order) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    const existing = await storeDb.order.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: "یافت نشد" }, { status: 404 });

    const data: any = {};
    if (body.status !== undefined) {
      if (!ALLOWED_STATUSES.includes(body.status)) {
        return NextResponse.json({ success: false, error: "وضعیت نامعتبر" }, { status: 400 });
      }
      data.status = body.status;
    }
    if (body.paymentStatus !== undefined) {
      if (!ALLOWED_PAY_STATUSES.includes(body.paymentStatus)) {
        return NextResponse.json({ success: false, error: "وضعیت پرداخت نامعتبر" }, { status: 400 });
      }
      data.paymentStatus = body.paymentStatus;
    }
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.shippingAddress !== undefined) data.shippingAddress = body.shippingAddress || null;
    if (body.couponCode !== undefined) data.couponCode = body.couponCode || null;
    if (body.mechanicId !== undefined) data.mechanicId = body.mechanicId || null;

    const order = await storeDb.order.update({
      where: { id },
      data,
      include: {
        customer: { select: { id: true, name: true, family: true, phone: true } },
        mechanic: { select: { id: true, name: true, family: true, shopName: true } },
        _count: { select: { items: true, payments: true } },
      },
    });
    return NextResponse.json({ success: true, data: serialize(order) });
  } catch (e: any) {
    console.error("[store/orders PATCH] error:", e);
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
