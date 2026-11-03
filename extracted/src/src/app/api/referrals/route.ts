import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/referrals — current user's referrals. */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const items = await db.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ referrals: items });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/referrals — create new referral.
   Body: { referredEmail?, referredMobile? }
*/
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const referredEmail = body.referredEmail ? String(body.referredEmail) : null;
    const referredMobile = body.referredMobile ? String(body.referredMobile) : null;

    if (!referredEmail && !referredMobile) {
      return NextResponse.json(
        { error: "referredEmail or referredMobile is required" },
        { status: 400 },
      );
    }

    const ref = await db.referral.create({
      data: {
        referrerId: user.id,
        referredEmail,
        referredMobile,
        status: "PENDING",
        reward: body.reward ?? null,
      },
    });
    return NextResponse.json({ ok: true, referral: ref });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
