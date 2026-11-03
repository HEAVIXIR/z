import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/follows — list current user follows. */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const items = await db.follow.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ follows: items });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/follows — follow. Body: { followType, targetId } */
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const followType = String(body.followType ?? "").trim();
    const targetId = String(body.targetId ?? "").trim();
    if (!followType || !targetId) {
      return NextResponse.json(
        { error: "followType and targetId are required" },
        { status: 400 },
      );
    }
    const existing = await db.follow.findUnique({
      where: {
        userId_followType_targetId: { userId, followType, targetId },
      },
    });
    if (existing) {
      return NextResponse.json({ ok: true, already: true, id: existing.id });
    }
    const f = await db.follow.create({ data: { userId, followType, targetId } });
    return NextResponse.json({ ok: true, id: f.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/follows?followType=...&targetId=... */
export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const followType = url.searchParams.get("followType");
    const targetId = url.searchParams.get("targetId");
    if (!followType || !targetId) {
      return NextResponse.json(
        { error: "followType and targetId are required" },
        { status: 400 },
      );
    }
    await db.follow.deleteMany({
      where: { userId, followType, targetId },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
