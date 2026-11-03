import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

/* ============================================================
   /api/admin/launch-phases
   GET  — list all launch phases
   POST — create or update phase { phase, title, targetValue, currentValue, status }
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PHASES = [
  { phase: 1, title: "۱۰۰ فروشنده واقعی", description: "جذب اولین فروشندگان واقعی", targetValue: 100 },
  { phase: 2, title: "۱٬۰۰۰ آگهی واقعی", description: "داشتن موجودی کافی", targetValue: 1000 },
  { phase: 3, title: "۱۰٬۰۰۰ آگهی", description: "رشد مقیاس", targetValue: 10000 },
  { phase: 4, title: "Request Marketplace", description: "فعال‌سازی کامل درخواست‌ها", targetValue: 500 },
  { phase: 5, title: "Verified Marketplace", description: "سیستم تأیید کامل", targetValue: 1000 },
  { phase: 6, title: "AI Marketplace", description: "قابلیت‌های AI فعال", targetValue: 100 },
  { phase: 7, title: "Industrial Network", description: "شبکه صنعتی کامل", targetValue: 50 },
];

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let phases = await db.launchPhase.findMany({ orderBy: { phase: "asc" } });

  // Auto-seed defaults
  if (phases.length === 0) {
    for (const p of DEFAULT_PHASES) {
      await db.launchPhase.create({ data: { ...p, status: "PENDING", currentValue: 0 } });
    }
    phases = await db.launchPhase.findMany({ orderBy: { phase: "asc" } });
  }

  // Auto-compute current values from DB
  const [totalSellers, totalListings, totalRequests] = await Promise.all([
    db.user.count({ where: { status: "ACTIVE" } }),
    db.listing.count({ where: { status: "PUBLISHED" } }),
    db.buyRequest.count({ where: { status: "ACTIVE" } }),
  ]);

  // Update current values
  const valueMap: Record<number, number> = {
    1: totalSellers, 2: totalListings, 3: totalListings,
    4: totalRequests, 5: totalListings, 6: totalListings, 7: totalSellers,
  };

  const updated = phases.map((p) => ({
    ...p,
    currentValue: valueMap[p.phase] ?? p.currentValue,
    progress: p.targetValue > 0 ? Math.min(100, Math.round(((valueMap[p.phase] ?? p.currentValue) / p.targetValue) * 100)) : 0,
  }));

  return NextResponse.json({ success: true, data: updated });
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { phase, status, targetValue, startDate, endDate } = body;

    const existing = await db.launchPhase.findUnique({ where: { phase: Number(phase) } });
    if (existing) {
      const updated = await db.launchPhase.update({
        where: { phase: Number(phase) },
        data: {
          ...(status ? { status } : {}),
          ...(targetValue !== undefined ? { targetValue: Number(targetValue) } : {}),
          ...(startDate ? { startDate: new Date(startDate) } : {}),
          ...(endDate ? { endDate: new Date(endDate) } : {}),
        },
      });
      return NextResponse.json({ success: true, data: updated });
    } else {
      const created = await db.launchPhase.create({
        data: {
          phase: Number(phase),
          title: body.title || `Phase ${phase}`,
          description: body.description,
          targetValue: Number(targetValue) || 100,
          currentValue: 0,
          status: status || "PENDING",
          ...(startDate ? { startDate: new Date(startDate) } : {}),
        },
      });
      return NextResponse.json({ success: true, data: created });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
