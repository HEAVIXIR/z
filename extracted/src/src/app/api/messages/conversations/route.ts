import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/messages/conversations
   Lists the current user's conversations, newest first by
   lastMessageAt (falls back to updatedAt). For each row, returns
   the "other" participant's name + a serialised listing preview
   and an unread count for the current user.
   ============================================================ */

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db.conversation.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
        status: "ACTIVE",
      },
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
        messages: {
          where: { senderId: { not: userId }, read: false },
          select: { id: true },
        },
      },
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });

    const items = rows.map((c) => {
      const isP1 = c.participant1Id === userId;
      const other = isP1 ? c.participant2 : c.participant1;
      return {
        id: c.id,
        listingId: c.listingId,
        lastMessageAt: c.lastMessageAt,
        lastMessagePreview: c.lastMessagePreview,
        status: c.status,
        updatedAt: c.updatedAt,
        unreadCount: c.messages.length,
        otherUser: {
          id: other.id,
          firstName: other.firstName,
          lastName: other.lastName,
          companyName: other.companyName,
        },
        listing: c.listing
          ? {
              id: c.listing.id,
              slug: c.listing.slug,
              title: c.listing.title,
              image: c.listing.images?.[0]?.url ?? null,
            }
          : null,
      };
    });

    return NextResponse.json({ conversations: items });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
