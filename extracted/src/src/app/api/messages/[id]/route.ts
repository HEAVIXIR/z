import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   PATCH /api/messages/[id]
   Marks a single message as read. Only the recipient (i.e. NOT
   the sender) may mark a message as read. Idempotent.
   ============================================================ */

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Ctx) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const msg = await db.message.findUnique({
      where: { id },
      select: { id: true, senderId: true, conversationId: true, read: true },
    });
    if (!msg) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only the recipient may mark a message as read.
    if (msg.senderId === userId) {
      return NextResponse.json(
        { error: "Cannot mark your own message as read" },
        { status: 400 },
      );
    }

    // Verify the caller is a participant of the conversation.
    const conv = await db.conversation.findUnique({
      where: { id: msg.conversationId },
      select: { participant1Id: true, participant2Id: true },
    });
    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!msg.read) {
      await db.message.update({
        where: { id },
        data: { read: true, readAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
