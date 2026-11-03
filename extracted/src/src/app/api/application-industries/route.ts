import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/application-industries — public.
   Returns all 16 application industries ordered by sortOrder,
   each with the count of categories linked to it.
*/
export async function GET() {
  try {
    const industries = await db.applicationIndustry.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
      include: {
        _count: { select: { categories: true } },
      },
    });
    return NextResponse.json({
      industries: industries.map((i) => ({
        id: i.id,
        key: i.key,
        nameFa: i.nameFa,
        nameEn: i.nameEn,
        icon: i.icon,
        sortOrder: i.sortOrder,
        active: i.active,
        categoryCount: i._count.categories,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/application-industries — admin create. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.key || !body.nameFa) {
      return NextResponse.json(
        { error: "key and nameFa are required" },
        { status: 400 },
      );
    }
    const dup = await db.applicationIndustry.findUnique({
      where: { key: String(body.key) },
    });
    if (dup) {
      return NextResponse.json(
        { error: "key already exists" },
        { status: 409 },
      );
    }
    const industry = await db.applicationIndustry.create({
      data: {
        key: String(body.key),
        nameFa: String(body.nameFa),
        nameEn: body.nameEn ?? null,
        icon: body.icon ?? null,
        active: body.active !== false,
        sortOrder: Number(body.sortOrder) || 0,
      },
    });
    return NextResponse.json({ ok: true, industry });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
