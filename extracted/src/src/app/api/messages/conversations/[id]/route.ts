import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET  /api/messages/conversations/[id]
        Returns the conversation (verified participant only) with
        messages ordered oldest → newest. Also marks inbound
        (sent by the other party) unread messages as read for the
        caller, so opening the thread clears the unread badge.
   POST /api/messages/conversations/[id]
        Body: { body } — sends a new message as the caller.
        Updates Conversation.lastMessageAt / lastMessagePreview.
   ============================================================ */

type Ctx = { params: Promise<{ id: string }> };

async function getOwnedConversation(id: string, userId: string) {
  const conv = await db.conversation.findUnique({
    where: { id },
    select: { id: true, participant1Id: true, participant2Id: true, listingId: true },
  });
  if (!conv) return null;
  if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
    return "FORBIDDEN" as const;
  }
  return conv;
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const owned = await getOwnedConversation(id, userId);
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (owned === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const conv = await db.conversation.findUnique({
      where: { id },
      include: {
        participant1: {
          select: { id: true, firstName: true, lastName: true, companyName: true },
        },
        participant2: {
          select: { id: true, firstName: true, lastName: true, companyName: true },
        },
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            images: { take: 1, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
          },
        },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Mark inbound unread messages as read for the caller (fire-and-forget).
    db.message
      .updateMany({
        where: {
          conversationId: id,
          senderId: { not: userId },
          read: false,
        },
        data: { read: true, readAt: new Date() },
      })
      .catch(() => {});

    const isP1 = conv.participant1Id === userId;
    const other = isP1 ? conv.participant2 : conv.participant1;

    return NextResponse.json({
      conversation: {
        id: conv.id,
        listingId: conv.listingId,
        status: conv.status,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        otherUser: {
          id: other.id,
          firstName: other.firstName,
          lastName: other.lastName,
          companyName: other.companyName,
        },
        listing: conv.listing
          ? {
              id: conv.listing.id,
              slug: conv.listing.slug,
              title: conv.listing.title,
              image: conv.listing.images?.[0]?.url ?? null,
            }
          : null,
      },
      messages: conv.messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        body: m.body,
        attachmentUrl: m.attachmentUrl,
        read: m.read,
        readAt: m.readAt,
        createdAt: m.createdAt,
        mine: m.senderId === userId,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const owned = await getOwnedConversation(id, userId);
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (owned === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body.body ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }
    if (text.length > 4000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const msg = await db.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        body: text,
        attachmentUrl: body.attachmentUrl ? String(body.attachmentUrl) : null,
      },
    });

    const preview = text.length > 120 ? text.slice(0, 120) + "…" : text;
    await db.conversation.update({
      where: { id },
      data: { lastMessageAt: msg.createdAt, lastMessagePreview: preview },
    });

    return NextResponse.json({
      id: msg.id,
      senderId: msg.senderId,
      body: msg.body,
      attachmentUrl: msg.attachmentUrl,
      read: msg.read,
      readAt: msg.readAt,
      createdAt: msg.createdAt,
      mine: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
