import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { storeDb } from "@/lib/store-db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/store/orders — HEAVIX orders list
   ============================================================ */

const STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  CONFIRMED: "تأییدشده",
  PROCESSING: "در حال پردازش",
  SHIPPED: "ارسال‌شده",
  DELIVERED: "تحویل‌شده",
  CANCELLED: "لغوشده",
  RETURNED: "مرجوع‌شده",
};

const PAY_STATUS_LABELS: Record<string, string> = {
  UNPAID: "پرداخت‌نشده",
  PARTIAL: "پرداخت جزئی",
  PAID: "پرداخت‌شده",
  REFUNDED: "بازگشت‌خورده",
};

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
    statusLabel: STATUS_LABELS[o.status] ?? o.status,
    paymentStatusLabel: PAY_STATUS_LABELS[o.paymentStatus] ?? o.paymentStatus,
    createdAt: o.createdAt?.toISOString?.() ?? null,
    updatedAt: o.updatedAt?.toISOString?.() ?? null,
    itemCount: o._count?.items ?? 0,
    _count: undefined,
  };
}

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const paymentStatus = url.searchParams.get("paymentStatus") || undefined;
    const q = url.searchParams.get("q")?.trim() || undefined;
    const limit = Math.min(200, Number(url.searchParams.get("limit")) || 100);

    const where: any = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (q) where.OR = [{ orderNumber: { contains: q } }, { customer: { phone: { contains: q } } }, { customer: { name: { contains: q } } }];

    const [items, total] = await Promise.all([
      storeDb.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          customer: { select: { id: true, name: true, family: true, phone: true } },
          mechanic: { select: { id: true, name: true, family: true, shopName: true } },
          _count: { select: { items: true, payments: true } },
        },
      }),
      storeDb.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: items.map(serialize),
      total,
    });
  } catch (e: any) {
    console.error("[store/orders GET] error:", e);
    return NextResponse.json(
      { success: false, error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
