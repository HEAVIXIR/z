import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseBig, parseNumber } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/rfq
   GET  — list open RFQs (public)
   POST — create new RFQ
   ============================================================ */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Number(searchParams.get("limit")) || 20);

    const rfqs = await db.rFQ.findMany({
      where: { status: { in: ["OPEN", "QUOTING"] } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        _count: { select: { quotes: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: rfqs.map((r) => ({
        ...r,
        budgetMin: r.budgetMin ? r.budgetMin.toString() : null,
        budgetMax: r.budgetMax ? r.budgetMax.toString() : null,
        quoteCount: r._count.quotes,
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = String(body.title ?? "").trim();
    const buyerPhone = String(body.buyerPhone ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!buyerPhone) {
      return NextResponse.json(
        { error: "buyerPhone is required" },
        { status: 400 },
      );
    }

    const user = await getCurrentUser();
    const quantity = parseNumber(body.quantity) ?? 1;
    const deadline = body.deadline ? new Date(body.deadline) : null;
    if (deadline && isNaN(deadline.getTime())) {
      return NextResponse.json({ error: "invalid deadline" }, { status: 400 });
    }

    const rfq = await db.rFQ.create({
      data: {
        title,
        description: body.description ? String(body.description) : null,
        machineType: body.machineType ? String(body.machineType) : null,
        brandPref: body.brandPref ? String(body.brandPref) : null,
        quantity,
        budgetMin: parseBig(body.budgetMin),
        budgetMax: parseBig(body.budgetMax),
        location: body.location ? String(body.location) : null,
        deadline,
        terms: body.terms ? String(body.terms) : null,
        buyerName: body.buyerName ? String(body.buyerName) : null,
        buyerPhone,
        buyerEmail: body.buyerEmail ? String(body.buyerEmail) : null,
        buyerId: user?.id ?? null,
        status: "OPEN",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...rfq,
        budgetMin: rfq.budgetMin ? rfq.budgetMin.toString() : null,
        budgetMax: rfq.budgetMax ? rfq.budgetMax.toString() : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
