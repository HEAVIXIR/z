import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/conversations/[id]/messages — list messages in a conversation.
   ?before=<iso> for pagination (load older messages). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conv = await db.conversation.findUnique({ where: { id } });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const before = url.searchParams.get("before");
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));

    const where: any = { conversationId: id };
    if (before) where.createdAt = { lt: new Date(before) };

    const messages = await db.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Mark unread messages from the other participant as read
    await db.message.updateMany({
      where: { conversationId: id, read: false, senderId: { not: userId } },
      data: { read: true, readAt: new Date() },
    }).catch(() => {});

    return NextResponse.json({
      messages: messages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        body: m.body,
        attachmentUrl: m.attachmentUrl,
        read: m.read,
        createdAt: m.createdAt,
        isMine: m.senderId === userId,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* POST /api/conversations/[id]/messages — send a message.
   Body: { body, attachmentUrl? } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conv = await db.conversation.findUnique({ where: { id } });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (conv.status !== "ACTIVE") {
      return NextResponse.json({ error: "Conversation is archived" }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body.body ?? "").trim().slice(0, 5000);
    const attachmentUrl = body.attachmentUrl ? String(body.attachmentUrl) : null;

    if (!text && !attachmentUrl) {
      return NextResponse.json({ error: "Message body or attachment required" }, { status: 400 });
    }

    const message = await db.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        body: text || "(فایل پیوست)",
        attachmentUrl,
        read: false,
      },
    });

    // Update conversation's lastMessageAt + preview
    await db.conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: text.slice(0, 100) || "(فایل)",
      },
    });

    await logAudit({
      actorId: userId,
      actorType: "USER",
      action: "message.send",
      entityType: "Message",
      entityId: message.id,
      after: { conversationId: id },
      ip: getClientIp(req),
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      id: message.id,
      createdAt: message.createdAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
