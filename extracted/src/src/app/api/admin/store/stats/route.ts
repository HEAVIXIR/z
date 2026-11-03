import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { storeDb } from "@/lib/store-db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/store/stats — HEAVIX store dashboard stats
   ============================================================ */

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [
      totalParts,
      activeParts,
      lowStockParts,
      totalOrders,
      pendingOrders,
      totalCustomers,
      totalMechanics,
      pendingPayments,
      approvedRevenueIrr,
      todayRate,
      currencySetting,
    ] = await Promise.all([
      storeDb.part.count(),
      storeDb.part.count({ where: { active: true } }),
      storeDb.part.count({ where: { stock: { lte: 5 } } }),
      storeDb.order.count(),
      storeDb.order.count({ where: { status: "PENDING" } }),
      storeDb.customer.count(),
      storeDb.mechanic.count(),
      storeDb.payment.count({ where: { status: "PENDING" } }),
      storeDb.payment.aggregate({
        where: { status: "APPROVED" },
        _sum: { amountIrr: true },
      }),
      storeDb.currencyRate.findFirst({ orderBy: { date: "desc" } }),
      storeDb.currencySetting.findUnique({ where: { id: "singleton" } }),
    ]);

    const byStatusOrders = await storeDb.order.groupBy({
      by: ["status"],
      _count: true,
    });
    const byPaymentStatus = await storeDb.payment.groupBy({
      by: ["status"],
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalParts,
        activeParts,
        lowStockParts,
        totalOrders,
        pendingOrders,
        totalCustomers,
        totalMechanics,
        pendingPayments,
        approvedRevenueIrr: approvedRevenueIrr._sum.amountIrr ?? 0,
        todayRate: todayRate?.rate ?? currencySetting?.defaultRate ?? 0,
        marginPercent: currencySetting?.marginPercent ?? 0,
        autoUpdateEnabled: currencySetting?.autoUpdateEnabled ?? false,
        lastAutoStatus: currencySetting?.lastAutoStatus ?? null,
        lastAutoFetchAt: currencySetting?.lastAutoFetchAt?.toISOString() ?? null,
        ordersByStatus: byStatusOrders.map((s) => ({
          status: s.status,
          count: s._count,
        })),
        paymentsByStatus: byPaymentStatus.map((p) => ({
          status: p.status,
          count: p._count,
        })),
      },
    });
  } catch (e: any) {
    console.error("[store/stats] error:", e);
    return NextResponse.json(
      { success: false, error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
