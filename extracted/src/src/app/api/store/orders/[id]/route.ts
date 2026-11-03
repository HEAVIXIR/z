import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/orders/[id] — PUBLIC order detail
   The customer looks up their orders by phone via /api/store/orders,
   but if they have a direct orderId (e.g. from a payment callback)
   we also expose this endpoint to fetch the full detail.
   ============================================================ */

function serializeOrder(o: any) {
  return {
    ...o,
    subtotalUsd: Number(o.subtotalUsd ?? 0),
    shippingUsd: Number(o.shippingUsd ?? 0),
    discountIrr: Number(o.discountIrr ?? 0),
    totalUsd: Number(o.totalUsd ?? 0),
    totalIrr: Number(o.totalIrr ?? 0),
    currencyRateAtOrder: Number(o.currencyRateAtOrder ?? 0),
    marginPercentAtOrder: Number(o.marginPercentAtOrder ?? 0),
    createdAt: o.createdAt?.toISOString?.() ?? null,
    updatedAt: o.updatedAt?.toISOString?.() ?? null,
    items: (o.items || []).map((it: any) => ({
      ...it,
      unitPriceUsd: Number(it.unitPriceUsd ?? 0),
      unitPriceIrr: Number(it.unitPriceIrr ?? 0),
      lineTotalUsd: Number(it.lineTotalUsd ?? 0),
      lineTotalIrr: Number(it.lineTotalIrr ?? 0),
    })),
    payments: (o.payments || []).map((p: any) => ({
      ...p,
      amountIrr: Number(p.amountIrr ?? 0),
      amountUsd: Number(p.amountUsd ?? 0),
      createdAt: p.createdAt?.toISOString?.() ?? null,
      reviewedAt: p.reviewedAt?.toISOString?.() ?? null,
    })),
    shipment: o.shipment
      ? {
          ...o.shipment,
          shippedAt: o.shipment.shippedAt?.toISOString?.() ?? null,
          deliveredAt: o.shipment.deliveredAt?.toISOString?.() ?? null,
        }
      : null,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const order = await storeDb.order.findUnique({
      where: { id },
      include: {
        items: { include: { part: { select: { id: true, name: true, nameFa: true, sku: true, images: true, active: true } } } },
        payments: { orderBy: { createdAt: "desc" } },
        shipment: true,
        mechanic: { select: { id: true, name: true, family: true, shopName: true, phone: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
    }
    return NextResponse.json({ order: serializeOrder(order) });
  } catch (e: any) {
    console.error("[api/store/orders/[id] GET] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
