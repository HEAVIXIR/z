import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/companies — public list. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || undefined;
    const province = url.searchParams.get("province") || undefined;
    const limit = Math.min(50, Number(url.searchParams.get("limit")) || 30);

    const where: any = { status: "ACTIVE" };
    if (q) where.name = { contains: q };
    if (province) where.province = province;

    const companies = await db.company.findMany({
      where,
      orderBy: [{ premium: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: { _count: { select: { listings: true } } },
    });
    return NextResponse.json({
      companies: companies.map((c) => ({
        ...c,
        listingsCount: c._count.listings,
        _count: undefined,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
