import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseBig, parseNumber } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(r: any) {
  return {
    ...r,
    budgetMin: r.budgetMin ? r.budgetMin.toString() : null,
    budgetMax: r.budgetMax ? r.budgetMax.toString() : null,
  };
}

/* GET /api/requests — public list (only ACTIVE). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(100, Number(url.searchParams.get("limit")) || 30);
    const offset = Number(url.searchParams.get("offset")) || 0;
    const q = url.searchParams.get("q")?.trim() || undefined;
    const category = url.searchParams.get("category") || undefined;
    const province = url.searchParams.get("province") || undefined;

    const where: any = { status: "ACTIVE" };
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
      ];
    }
    if (category) where.category = category;
    if (province) where.province = province;

    const [items, total] = await Promise.all([
      db.buyRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.buyRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests: items.map(serialize),
      total,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/requests — submit buy request. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = String(body.title ?? "").trim();
    if (!title || title.length < 3) {
      return NextResponse.json({ error: "عنوان درخواست الزامی است" }, { status: 400 });
    }
    const user = await getCurrentUser();

    const data: any = {
      title,
      description: body.description ?? null,
      category: body.category ?? null,
      brandPref: body.brandPref ?? null,
      transaction: body.transaction || "SALE",
      budgetMin: parseBig(body.budgetMin),
      budgetMax: parseBig(body.budgetMax),
      city: body.city ?? null,
      province: body.province ?? null,
      deadline: body.deadline ?? null,
      status: "PENDING",
      verified: false,
      requesterName: body.requesterName ?? null,
      requesterPhone: body.requesterPhone ?? null,
      userId: user?.id ?? null,
      publishedAt: new Date(),
      expiresAt: body.deadline
        ? new Date(body.deadline)
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    };

    const r = await db.buyRequest.create({ data });
    return NextResponse.json({ ok: true, id: r.id, status: r.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
