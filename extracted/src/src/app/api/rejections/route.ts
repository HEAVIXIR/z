import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/rejections — seller's rejections (by sellerId or sellerPhone). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const phone = url.searchParams.get("phone");
    const sellerId = url.searchParams.get("sellerId");

    if (!phone && !sellerId) {
      return NextResponse.json(
        { error: "phone or sellerId is required" },
        { status: 400 },
      );
    }
    const where: any = { listing: {} };
    if (sellerId) where.listing.sellerId = sellerId;
    if (phone) where.listing.sellerPhone = phone;

    const items = await db.listingRejection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { id: true, title: true, slug: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    return NextResponse.json({ rejections: items });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/rejections — seller adds message. Body: { rejectionId, message } */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.rejectionId ?? "");
    const message = String(body.message ?? "").trim();
    if (!id || !message) {
      return NextResponse.json(
        { error: "rejectionId and message are required" },
        { status: 400 },
      );
    }
    const rec = await db.listingRejection.findUnique({ where: { id } });
    if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const msg = await db.rejectionMessage.create({
      data: {
        rejectionId: id,
        senderRole: "SELLER",
        senderName: body.senderName ?? null,
        message,
      },
    });
    // Reopen if closed
    if (rec.status === "RESOLVED") {
      await db.listingRejection.update({
        where: { id },
        data: { status: "OPEN" },
      });
    }
    return NextResponse.json({ ok: true, message: msg });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
