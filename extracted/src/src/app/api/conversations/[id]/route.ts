import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/conversations/[id] — get a single conversation with metadata. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conv = await db.conversation.findUnique({
      where: { id },
      include: {
        listing: { select: { id: true, title: true, slug: true, price: true } },
        participant1: { select: { id: true, firstName: true, lastName: true } },
        participant2: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Authorization: only participants can view
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      conversation: {
        id: conv.id,
        listing: conv.listing ? {
          ...conv.listing,
          price: conv.listing.price ? conv.listing.price.toString() : null,
        } : null,
        otherParticipant: conv.participant1Id === userId ? conv.participant2 : conv.participant1,
        status: conv.status,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* PATCH /api/conversations/[id] — archive/restore conversation. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conv = await db.conversation.findUnique({ where: { id } });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const status = body.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";

    const updated = await db.conversation.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
