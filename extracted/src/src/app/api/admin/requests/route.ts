import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseBool } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(r: any) {
  return {
    ...r,
    budgetMin: r.budgetMin ? r.budgetMin.toString() : null,
    budgetMax: r.budgetMax ? r.budgetMax.toString() : null,
  };
}

/* GET /api/admin/requests — admin list + stats. */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const verified = url.searchParams.get("verified");
    const q = url.searchParams.get("q")?.trim() || undefined;
    const limit = Number(url.searchParams.get("limit")) || 100;
    const offset = Number(url.searchParams.get("offset")) || 0;

    const where: any = {};
    if (status) where.status = status;
    if (verified !== null && verified !== undefined && verified !== "")
      where.verified = parseBool(verified);
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { requesterName: { contains: q } },
        { requesterPhone: { contains: q } },
      ];
    }

    const [items, total, stats] = await Promise.all([
      db.buyRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.buyRequest.count({ where }),
      {
        total: await db.buyRequest.count(),
        active: await db.buyRequest.count({ where: { status: "ACTIVE" } }),
        pending: await db.buyRequest.count({ where: { status: "PENDING" } }),
        closed: await db.buyRequest.count({ where: { status: "CLOSED" } }),
        fulfilled: await db.buyRequest.count({ where: { status: "FULFILLED" } }),
        verified: await db.buyRequest.count({ where: { verified: true } }),
      },
    ]);

    return NextResponse.json({
      requests: items.map(serialize),
      total,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/requests — bulk actions. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "ids is required" }, { status: 400 });
    }

    let data: any = {};
    switch (action) {
      case "verify": data = { verified: true }; break;
      case "unverify": data = { verified: false }; break;
      case "close": data = { status: "CLOSED" }; break;
      case "fulfill": data = { status: "FULFILLED" }; break;
      case "delete":
        await db.buyRequest.deleteMany({ where: { id: { in: ids } } });
        return NextResponse.json({ ok: true, action, count: ids.length });
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const result = await db.buyRequest.updateMany({
      where: { id: { in: ids } },
      data,
    });
    return NextResponse.json({ ok: true, action, updated: result.count });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
