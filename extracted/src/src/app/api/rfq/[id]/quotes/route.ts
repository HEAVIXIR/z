import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/rfq/[id]/quotes
   GET  — list quotes for an RFQ (public)
   POST — submit a quote (seller)
   ============================================================ */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rfq = await db.rFQ.findUnique({ where: { id } });
    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }
    const quotes = await db.rFQQuote.findMany({
      where: { rfqId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: quotes.map((q) => ({
        ...q,
        unitPrice: q.unitPrice.toString(),
        totalPrice: q.totalPrice.toString(),
      })),
      rfq: {
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rfq = await db.rFQ.findUnique({ where: { id } });
    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }
    if (rfq.status === "CLOSED" || rfq.status === "CANCELLED") {
      return NextResponse.json(
        { error: "RFQ is no longer accepting quotes" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const sellerName = String(body.sellerName ?? "").trim();
    const sellerPhone = String(body.sellerPhone ?? "").trim();
    const unitPrice = parseBig(body.unitPrice);
    const totalPrice = parseBig(body.totalPrice);
    if (!sellerName) {
      return NextResponse.json({ error: "sellerName is required" }, { status: 400 });
    }
    if (!sellerPhone) {
      return NextResponse.json({ error: "sellerPhone is required" }, { status: 400 });
    }
    if (unitPrice === null) {
      return NextResponse.json({ error: "unitPrice is required" }, { status: 400 });
    }
    if (totalPrice === null) {
      return NextResponse.json({ error: "totalPrice is required" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const quote = await db.rFQQuote.create({
      data: {
        rfqId: id,
        sellerName,
        sellerPhone,
        sellerEmail: body.sellerEmail ? String(body.sellerEmail) : null,
        sellerId: user?.id ?? null,
        unitPrice,
        totalPrice,
        deliveryTime: body.deliveryTime ? String(body.deliveryTime) : null,
        notes: body.notes ? String(body.notes) : null,
        status: "PENDING",
      },
    });

    // If RFQ was OPEN, move it to QUOTING once first quote arrives
    if (rfq.status === "OPEN") {
      await db.rFQ.update({ where: { id }, data: { status: "QUOTING" } });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...quote,
        unitPrice: quote.unitPrice.toString(),
        totalPrice: quote.totalPrice.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
