import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getUnreadCount } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/notifications/unread-count — get unread notification count. */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const count = await getUnreadCount(userId);
    return NextResponse.json({ unreadCount: count });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
