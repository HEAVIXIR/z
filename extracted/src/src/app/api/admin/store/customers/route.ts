import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { storeDb } from "@/lib/store-db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/store/customers — HEAVIX customers list
   ============================================================ */

function serialize(c: any) {
  return {
    ...c,
    totalSpentIrr: c.totalSpentIrr?.toString?.() ?? String(c.totalSpentIrr ?? 0),
    walletBalanceIrr: c.walletBalanceIrr?.toString?.() ?? String(c.walletBalanceIrr ?? 0),
    createdAt: c.createdAt?.toISOString?.() ?? null,
    updatedAt: c.updatedAt?.toISOString?.() ?? null,
    orderCount: c._count?.orders ?? 0,
    _count: undefined,
  };
}

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || undefined;
    const status = url.searchParams.get("status") || undefined;
    const limit = Math.min(200, Number(url.searchParams.get("limit")) || 100);

    const where: any = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { phone: { contains: q } },
        { name: { contains: q } },
        { family: { contains: q } },
        { nationalCode: { contains: q } },
      ];
    }

    const [items, total] = await Promise.all([
      storeDb.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { _count: { select: { orders: true } } },
      }),
      storeDb.customer.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: items.map(serialize),
      total,
    });
  } catch (e: any) {
    console.error("[store/customers GET] error:", e);
    return NextResponse.json(
      { success: false, error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
