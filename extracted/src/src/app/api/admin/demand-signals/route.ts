import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/demand-signals
   GET — list demand signals with stats
   Query params: ?limit=  ?intent=
   ============================================================ */

const INTENT_LABELS: Record<string, string> = {
  BUY: "خرید",
  RENT: "اجاره",
  COMPARE: "مقایسه",
  RESEARCH: "تحقیق",
  PARTS: "قطعات",
  SERVICE: "خدمات",
};

export async function GET(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(200, Number(searchParams.get("limit")) || 50);
    const intent = searchParams.get("intent") || undefined;

    const where = intent ? { intent } : {};

    const [signals, total, zeroResults, converted, byIntent, topQueries] =
      await Promise.all([
        db.demandSignal.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
        db.demandSignal.count({ where }),
        db.demandSignal.count({ where: { ...where, resultCount: 0 } }),
        db.demandSignal.count({ where: { ...where, convertedToRequest: true } }),
        db.demandSignal.groupBy({
          by: ["intent"],
          _count: true,
          orderBy: { _count: { intent: "desc" } },
        }),
        db.demandSignal.groupBy({
          by: ["query"],
          _count: true,
          where: { resultCount: 0 },
          orderBy: { _count: { query: "desc" } },
          take: 15,
        }),
      ]);

    // 7-day trend (zero-result searches per day)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = await db.demandSignal.findMany({
      where: { createdAt: { gte: since }, resultCount: 0 },
      select: { createdAt: true },
    });
    const trend: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const count = recent.filter((r) => r.createdAt.toISOString().slice(0, 10) === key).length;
      trend.push({ date: key, count });
    }

    return NextResponse.json({
      success: true,
      data: signals.map((s) => ({
        ...s,
        intentLabel: s.intent ? INTENT_LABELS[s.intent] ?? s.intent : null,
      })),
      stats: {
        total,
        zeroResults,
        converted,
        conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
        byIntent: byIntent.map((b) => ({
          intent: b.intent,
          label: b.intent ? INTENT_LABELS[b.intent] ?? b.intent : "نامشخص",
          count: b._count,
        })),
        topZeroQueries: topQueries.map((q) => ({
          query: q.query,
          count: q._count,
        })),
        trend,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
