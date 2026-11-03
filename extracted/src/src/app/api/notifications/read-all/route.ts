import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { markAllAsRead } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/notifications/read-all — mark all notifications as read. */
export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const count = await markAllAsRead(userId);
    return NextResponse.json({ ok: true, markedRead: count });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
