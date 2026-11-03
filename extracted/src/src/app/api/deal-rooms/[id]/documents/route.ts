import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "CONTRACT",
  "INSPECTION_REPORT",
  "INVOICE",
  "OWNERSHIP_PROOF",
  "TRANSPORT_DOC",
  "OTHER",
]);

/* POST /api/deal-rooms/[id]/documents — upload a document URL. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const room = await db.dealRoom.findUnique({
      where: { id },
      select: { id: true, buyerId: true, sellerId: true },
    });
    if (!room) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const isBuyer = room.buyerId === user.id;
    const isSeller = room.sellerId === user.id;
    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const type = String(body.type ?? "OTHER").toUpperCase();
    const url = String(body.url ?? "").trim();
    if (!url) {
      return NextResponse.json({ error: "url الزامی است" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: "نوع سند نامعتبر است" }, { status: 400 });
    }
    const doc = await db.dealDocument.create({
      data: {
        dealRoomId: id,
        type,
        url,
        uploadedBy: user.id,
        status: "PENDING",
      },
    });
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
