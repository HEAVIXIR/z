import { NextResponse } from "next/server";
import { destroySession, destroyUserSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/auth/logout — destroy both admin and user sessions. */
export async function POST() {
  try {
    await destroySession();
    await destroyUserSession();
    return NextResponse.json({ ok: true, message: "خروج موفقیت‌آمیز بود" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
