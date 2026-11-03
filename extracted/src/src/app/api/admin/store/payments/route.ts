import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { storeDb } from "@/lib/store-db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/store/payments — HEAVIX payments list
   ============================================================ */

const STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
  REFUNDED: "بازگشت‌خورده",
};

const METHOD_LABELS: Record<string, string> = {
  CARD: "کارت به کارت",
  WALLET: "کیف پول",
  CASH: "نقدی",
  GATEWAY: "درگاه آنلاین",
};

function serialize(p: any) {
  return {
    ...p,
    amountIrr: p.amountIrr?.toString?.() ?? String(p.amountIrr ?? 0),
    amountUsd: p.amountUsd?.toString?.() ?? String(p.amountUsd ?? 0),
    statusLabel: STATUS_LABELS[p.status] ?? p.status,
    methodLabel: METHOD_LABELS[p.method] ?? p.method,
    createdAt: p.createdAt?.toISOString?.() ?? null,
    reviewedAt: p.reviewedAt?.toISOString?.() ?? null,
  };
}

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const method = url.searchParams.get("method") || undefined;
    const q = url.searchParams.get("q")?.trim() || undefined;
    const limit = Math.min(200, Number(url.searchParams.get("limit")) || 100);

    const where: any = {};
    if (status) where.status = status;
    if (method) where.method = method;
    if (q) {
      where.OR = [
        { referenceCode: { contains: q } },
        { payerName: { contains: q } },
        { payerCard: { contains: q } },
        { order: { orderNumber: { contains: q } } },
        { customer: { phone: { contains: q } } },
      ];
    }

    const [items, total] = await Promise.all([
      storeDb.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          order: { select: { id: true, orderNumber: true, totalIrr: true, status: true } },
          customer: { select: { id: true, name: true, family: true, phone: true } },
        },
      }),
      storeDb.payment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: items.map(serialize),
      total,
    });
  } catch (e: any) {
    console.error("[store/payments GET] error:", e);
    return NextResponse.json(
      { success: false, error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
