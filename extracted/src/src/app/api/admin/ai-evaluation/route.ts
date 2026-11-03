import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/admin/ai-evaluation
   Returns AI metrics: accuracy, avg latency, cost estimate,
   and breakdown by task type.
   ============================================================ */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [recentLogs, totalAgg, successAgg, latencyAgg, costAgg, byTask] =
      await Promise.all([
        db.aIGatewayLog.findMany({
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        db.aIGatewayLog.count({ where: { createdAt: { gte: since } } }),
        db.aIGatewayLog.count({
          where: { createdAt: { gte: since }, success: true },
        }),
        db.aIGatewayLog.aggregate({
          where: { createdAt: { gte: since } },
          _avg: { latencyMs: true },
          _max: { latencyMs: true },
        }),
        db.aIGatewayLog.aggregate({
          where: { createdAt: { gte: since } },
          _sum: { cost: true },
          _avg: { cost: true },
        }),
        Promise.all(
          [
            "SEARCH",
            "SEMANTIC_SEARCH",
            "LISTING_BUILDER",
            "PRICE_ANALYSIS",
            "MARKET_ANALYST",
            "SELLER_ASSISTANT",
            "SCRAPER",
            "MODERATION",
          ].map(async (taskType) => {
            const [count, succ, lat, cost] = await Promise.all([
              db.aIGatewayLog.count({
                where: { createdAt: { gte: since }, taskType },
              }),
              db.aIGatewayLog.count({
                where: { createdAt: { gte: since }, taskType, success: true },
              }),
              db.aIGatewayLog.aggregate({
                where: { createdAt: { gte: since }, taskType },
                _avg: { latencyMs: true },
              }),
              db.aIGatewayLog.aggregate({
                where: { createdAt: { gte: since }, taskType },
                _sum: { cost: true },
              }),
            ]);
            return {
              taskType,
              total: count,
              success: succ,
              accuracy: count > 0 ? Math.round((succ / count) * 100) : 0,
              avgLatency: lat._avg.latencyMs
                ? Math.round(lat._avg.latencyMs)
                : null,
              totalCost: cost._sum.cost ?? 0,
            };
          }),
        ),
      ]);

    const accuracy =
      totalAgg > 0 ? Math.round((successAgg / totalAgg) * 100) : 0;
    const avgLatency = latencyAgg._avg.latencyMs
      ? Math.round(latencyAgg._avg.latencyMs)
      : 0;
    const maxLatency = latencyAgg._max.latencyMs ?? 0;
    const totalCost = costAgg._sum.cost ?? 0;
    const avgCost = costAgg._avg.cost ?? 0;

    // Build time series (last 14 days, by day)
    const days: { date: string; total: number; success: number; cost: number }[] =
      [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayLogs = recentLogs.filter(
        (l) => l.createdAt >= dayStart && l.createdAt < dayEnd,
      );
      days.push({
        date: dayStart.toISOString().slice(0, 10),
        total: dayLogs.length,
        success: dayLogs.filter((l) => l.success).length,
        cost: dayLogs.reduce((s, l) => s + (l.cost ?? 0), 0),
      });
    }

    return NextResponse.json({
      metrics: {
        totalRequests: totalAgg,
        successCount: successAgg,
        accuracy,
        avgLatency,
        maxLatency,
        totalCost: Number(totalCost.toFixed(4)),
        avgCost: Number(avgCost.toFixed(4)),
      },
      byTask: byTask.filter((b) => b.total > 0),
      timeseries: days,
      recentLogs: recentLogs.slice(0, 20).map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
