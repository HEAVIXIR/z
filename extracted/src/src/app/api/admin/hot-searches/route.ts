import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/hot-searches */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const items = await db.hotSearch.findMany({
      orderBy: [{ sortOrder: "asc" }, { count: "desc" }],
    });
    return NextResponse.json({ hotSearches: items });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/hot-searches — create + bulk actions. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));

    // Bulk
    if (body.action && Array.isArray(body.ids)) {
      const ids: string[] = body.ids;
      if (body.action === "delete") {
        await db.hotSearch.deleteMany({ where: { id: { in: ids } } });
        return NextResponse.json({ ok: true, action: body.action, count: ids.length });
      }
      let data: any = {};
      if (body.action === "activate") data.active = true;
      else if (body.action === "deactivate") data.active = false;
      else return NextResponse.json({ error: "Unknown action" }, { status: 400 });
      const r = await db.hotSearch.updateMany({
        where: { id: { in: ids } },
        data,
      });
      return NextResponse.json({ ok: true, action: body.action, updated: r.count });
    }

    // Create
    if (!body.term) {
      return NextResponse.json({ error: "term is required" }, { status: 400 });
    }
    const hs = await db.hotSearch.create({
      data: {
        term: String(body.term),
        link: body.link ?? null,
        count: Number(body.count) || 0,
        active: body.active !== false,
        sortOrder: Number(body.sortOrder) || 0,
      },
    });
    return NextResponse.json({ ok: true, hotSearch: hs });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
