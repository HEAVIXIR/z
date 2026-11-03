import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseNumber } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(i: any) {
  return {
    ...i,
    price: i.price ? i.price.toString() : null,
    listing: i.listing
      ? {
          ...i.listing,
          price: i.listing.price ? i.listing.price.toString() : null,
        }
      : null,
    checklist: i.checklist ? JSON.parse(i.checklist) : null,
    photos: i.photos ? JSON.parse(i.photos) : null,
  };
}

/* GET /api/admin/inspections — admin list with filters + stats. */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const q = url.searchParams.get("q")?.trim() || undefined;
    const limit = parseNumber(url.searchParams.get("limit")) ?? 100;
    const offset = parseNumber(url.searchParams.get("offset")) ?? 0;

    const where: any = {};
    if (status) where.status = status;
    if (q) {
      // Search by listing title.
      where.listing = { title: { contains: q } };
    }
    const [inspections, total, stats] = await Promise.all([
      db.inspection.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          listing: {
            select: {
              id: true,
              slug: true,
              title: true,
              price: true,
              province: true,
              city: true,
              images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
            },
          },
        },
      }),
      db.inspection.count({ where }),
      (async () => {
        const grouped = await db.inspection.groupBy({
          by: ["status"],
          _count: true,
        });
        const map: Record<string, number> = {};
        for (const g of grouped) map[g.status] = g._count;
        return {
          requested: map["REQUESTED"] ?? 0,
          scheduled: map["SCHEDULED"] ?? 0,
          inProgress: map["IN_PROGRESS"] ?? 0,
          completed: map["COMPLETED"] ?? 0,
          cancelled: map["CANCELLED"] ?? 0,
          total: Object.values(map).reduce((a, b) => a + b, 0),
        };
      })(),
    ]);
    return NextResponse.json({
      inspections: inspections.map(serialize),
      total,
      stats,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
