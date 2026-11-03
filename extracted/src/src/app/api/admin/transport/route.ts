import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseBig, parseNumber } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(t: any) {
  return {
    ...t,
    quotedPrice: t.quotedPrice ? t.quotedPrice.toString() : null,
    listing: t.listing
      ? {
          ...t.listing,
          price: t.listing.price ? t.listing.price.toString() : null,
        }
      : null,
  };
}

/* GET /api/admin/transport — admin list with filters. */
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
      where.OR = [
        { origin: { contains: q } },
        { destination: { contains: q } },
        { carrierName: { contains: q } },
        { trackingCode: { contains: q } },
        { cargoType: { contains: q } },
      ];
    }
    const [requests, total, grouped] = await Promise.all([
      db.transportRequest.findMany({
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
              images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
            },
          },
        },
      }),
      db.transportRequest.count({ where }),
      db.transportRequest.groupBy({ by: ["status"], _count: true }),
    ]);
    const stats: Record<string, number> = {};
    for (const g of grouped) stats[g.status] = g._count;
    return NextResponse.json({
      requests: requests.map(serialize),
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
