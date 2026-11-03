import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/conversations — list current user's conversations.
   ?listingId=X (filter by listing) */
export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const listingId = url.searchParams.get("listingId")?.trim();
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));

    const where: any = {
      OR: [{ participant1Id: userId }, { participant2Id: userId }],
    };
    if (listingId) where.listingId = listingId;

    const conversations = await db.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: limit,
      include: {
        listing: { select: { id: true, title: true, slug: true, images: { take: 1, orderBy: { isPrimary: "desc" } } } },
        participant1: { select: { id: true, firstName: true, lastName: true } },
        participant2: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { messages: { where: { read: false, senderId: { not: userId } } } } },
      },
    });

    return NextResponse.json({
      conversations: conversations.map(c => ({
        id: c.id,
        listing: c.listing,
        otherParticipant: c.participant1Id === userId ? c.participant2 : c.participant1,
        lastMessageAt: c.lastMessageAt,
        lastMessagePreview: c.lastMessagePreview,
        status: c.status,
        unreadCount: (c._count as any).messages,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* POST /api/conversations — start a new conversation.
   Body: { participantId, listingId? } */
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { participantId, listingId } = body;

    if (!participantId) {
      return NextResponse.json({ error: "participantId is required" }, { status: 400 });
    }
    if (participantId === userId) {
      return NextResponse.json({ error: "Cannot start conversation with yourself" }, { status: 400 });
    }

    // Check if conversation already exists
    const existing = await db.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: userId, participant2Id: participantId, listingId: listingId || null },
          { participant1Id: participantId, participant2Id: userId, listingId: listingId || null },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ ok: true, id: existing.id, existing: true });
    }

    const conversation = await db.conversation.create({
      data: {
        participant1Id: userId,
        participant2Id: participantId,
        listingId: listingId || null,
        status: "ACTIVE",
      },
    });

    await logAudit({
      actorId: userId,
      actorType: "USER",
      action: "conversation.create",
      entityType: "Conversation",
      entityId: conversation.id,
      after: { participantId, listingId },
      ip: getClientIp(req),
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: conversation.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
