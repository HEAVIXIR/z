import { NextResponse } from "next/server";
import { validateLogin, createSession, createUserSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { LOGIN } from "@/lib/rate-limit-presets";
import { getClientIp, rateLimitKey } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/auth/login
   Body: { username, password }   → admin login
   Body: { mobile, password }     → user login (mobile + password)
   Body: { email, password }      → user login (email + password)

   Rate-limited: LOGIN preset (10 / 15min / IP) per HEAVIX-SECURITY-BASELINE-V1 §6.
*/
export async function POST(req: Request) {
  try {
    // ── Rate limit (P0-6) — applied before any DB/credential work ──
    const ip = getClientIp(req);
    const rl = rateLimit({
      key: rateLimitKey(ip, LOGIN.label),
      limit: LOGIN.limit,
      windowMs: LOGIN.windowMs,
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
    const { username, password, mobile, email } = body ?? {};

    if (!password) {
      return NextResponse.json(
        { error: "رمز عبور الزامی است" },
        { status: 400 },
      );
    }

    // Admin path
    if (username) {
      if (!validateLogin(String(username), String(password))) {
        return NextResponse.json(
          { error: "نام کاربری یا رمز عبور نادرست است" },
          { status: 401 },
        );
      }
      await createSession();
      return NextResponse.json({
        ok: true,
        role: "admin",
        message: "ورود مدیر موفقیت‌آمیز بود",
      });
    }

    // User path (mobile or email)
    if (!mobile && !email) {
      return NextResponse.json(
        { error: "شماره موبایل یا ایمیل الزامی است" },
        { status: 400 },
      );
    }

    const user = await db.user.findFirst({
      where: {
        OR: [
          mobile ? { mobile: String(mobile) } : {},
          email ? { email: String(email) } : {},
        ].filter((c) => Object.keys(c).length > 0),
      },
    });

    if (!user || !(await verifyPassword(String(password), user.passwordHash))) {
      // Fallback: the identifier might actually be an admin username
      // (e.g. "09121404927" looks like a mobile but is the admin username).
      // Try the admin path with the mobile/email value as username.
      const fallbackId = mobile || email;
      if (fallbackId && validateLogin(String(fallbackId), String(password))) {
        await createSession();
        return NextResponse.json({
          ok: true,
          role: "admin",
          message: "ورود مدیر موفقیت‌آمیز بود",
        });
      }
      return NextResponse.json(
        { error: "کاربر یافت نشد یا رمز نادرست است" },
        { status: 401 },
      );
    }

    if (user.status === "BLOCKED") {
      return NextResponse.json(
        { error: "حساب کاربری شما مسدود شده است" },
        { status: 403 },
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createUserSession(user.id);

    // Return the user's role (ADMIN / SELLER / BUYER) so the client can
    // route to the right dashboard. `role: "admin"` is reserved for the
    // legacy admin-cookie path above.
    return NextResponse.json({
      ok: true,
      role: user.role || "BUYER",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        email: user.email,
        userType: user.userType,
        role: user.role || "BUYER",
        status: user.status,
        emailVerified: user.emailVerified,
        mobileVerified: user.mobileVerified,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
