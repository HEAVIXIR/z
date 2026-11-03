import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { VERIFY } from "@/lib/rate-limit-presets";
import { getClientIp, rateLimitKey } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/auth/verify-email  (FIX 7)
   Body: { userId, code }
   - Verifies the latest EMAIL-type VerificationCode for the user
   - On success: marks code used and sets emailVerified = true.
   - If this is the FIRST verification and mobile is already
     verified (or the user passes the legacy mobile code path),
     also activate the account (status ACTIVE).
   - Mobile verification is handled separately (existing flow);
     this route is scoped to EMAIL codes only.

   Rate-limited: VERIFY preset (10 / hour / IP) per HEAVIX-SECURITY-BASELINE-V1 §6.
*/
export async function POST(req: Request) {
  try {
    // ── Rate limit (P0-6) ──
    const ip = getClientIp(req);
    const rl = rateLimit({
      key: rateLimitKey(ip, VERIFY.label),
      limit: VERIFY.limit,
      windowMs: VERIFY.windowMs,
    });
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: "درخواست بیش از حد. بعداً تلاش کنید.",
          retryAfter: retryAfterSeconds(rl.resetAt),
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds(rl.resetAt)) },
        },
      );
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId ?? "").trim();
    const code = String(body.code ?? "").trim();

    if (!userId || !code) {
      return NextResponse.json({ error: "userId و code الزامی است" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true, message: "ایمیل قبلاً تأیید شده است" });
    }

    const rec = await db.verificationCode.findFirst({
      where: { userId: user.id, code, type: "EMAIL" },
      orderBy: { createdAt: "desc" },
    });
    if (!rec) {
      return NextResponse.json({ error: "کد تأیید نامعتبر است" }, { status: 400 });
    }
    if (rec.used) {
      return NextResponse.json({ error: "کد تأیید قبلاً استفاده شده است" }, { status: 400 });
    }
    if (rec.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "کد منقضی شده است" }, { status: 400 });
    }

    // Activate account fully only when both verifications are done.
    // If mobileVerified is already true, flip status → ACTIVE.
    // Otherwise keep PENDING until mobile is verified too.
    const nowActive = user.mobileVerified;
    await db.$transaction([
      db.verificationCode.update({ where: { id: rec.id }, data: { used: true } }),
      db.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          status: nowActive ? "ACTIVE" : user.status,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message: nowActive
        ? "ایمیل تأیید شد و حساب فعال شد"
        : "ایمیل تأیید شد. لطفاً موبایل خود را نیز تأیید کنید.",
      activated: nowActive,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
