import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/transaction-types — public, ordered by sortOrder. */
export async function GET() {
  try {
    const types = await db.transactionType.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
      select: {
        id: true,
        key: true,
        nameFa: true,
        nameEn: true,
        description: true,
        icon: true,
        active: true,
        sortOrder: true,
      },
    });
    return NextResponse.json({ types });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/transaction-types — admin create. */
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
    const dup = await db.transactionType.findUnique({
      where: { key: String(body.key) },
    });
    if (dup) {
      return NextResponse.json(
        { error: "key already exists" },
        { status: 409 },
      );
    }
    const type = await db.transactionType.create({
      data: {
        key: String(body.key),
        nameFa: String(body.nameFa),
        nameEn: body.nameEn ?? null,
        description: body.description ?? null,
        icon: body.icon ?? null,
        active: body.active !== false,
        sortOrder: Number(body.sortOrder) || 0,
      },
    });
    return NextResponse.json({ ok: true, type });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
