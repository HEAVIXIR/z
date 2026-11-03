import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   POST /api/messages/conversation
   Body: { listingId?, otherUserId }
   Creates or returns an existing 1-1 conversation between the
   caller and `otherUserId`, optionally tied to a listing.
   Participant1Id/Participant2Id are normalised so the
   lexicographically smaller userId is always participant1 —
   this keeps the @@unique key stable across both call directions.
   ============================================================ */

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const otherUserId = String(body.otherUserId ?? "").trim();
    const listingId = body.listingId ? String(body.listingId) : null;

    if (!otherUserId) {
      return NextResponse.json(
        { error: "otherUserId is required" },
        { status: 400 },
      );
    }
    if (otherUserId === userId) {
      return NextResponse.json(
        { error: "Cannot start a conversation with yourself" },
        { status: 400 },
      );
    }

    // Verify the other user exists.
    const other = await db.user.findUnique({
      where: { id: otherUserId },
      select: { id: true },
    });
    if (!other) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify listing exists if provided.
    if (listingId) {
      const listing = await db.listing.findUnique({
        where: { id: listingId },
        select: { id: true, sellerId: true },
      });
      if (!listing) {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }
    }

    // Normalise participant ordering.
    const [p1Id, p2Id] =
      userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];

    // Find-or-create. We do an explicit findFirst because the @@unique
    // constraint treats NULL listingId as distinct in SQLite — a direct
    // upsert would not dedupe general conversations reliably.
    let conv = await db.conversation.findFirst({
      where: {
        participant1Id: p1Id,
        participant2Id: p2Id,
        listingId: listingId ?? null,
      },
    });

    if (!conv) {
      conv = await db.conversation.create({
        data: {
          participant1Id: p1Id,
          participant2Id: p2Id,
          listingId: listingId ?? null,
          status: "ACTIVE",
        },
      });
    }

    return NextResponse.json({
      id: conv.id,
      listingId: conv.listingId,
      status: conv.status,
      createdAt: conv.createdAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
