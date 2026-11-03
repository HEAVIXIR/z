import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toEnDigits } from "@/lib/format";
import { sendVerificationEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { REGISTER } from "@/lib/rate-limit-presets";
import { getClientIp, rateLimitKey } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/auth/register  (P0-1 + P0-2 — registration security)
   Body: { firstName, lastName, mobile, email, password, companyName? }
   - Validates required fields
   - Mobile AND email must be unique (enforced by schema @unique)
   - P0-1: password is hashed with bcrypt (cost 10) BEFORE storage.
     The plaintext password is never persisted.
   - P0-2: the role is HARDCODED to "BUYER" — the request body has NO
     ability to set the role. Only an admin can elevate a user via the
     admin users API.
   - Creates user with status PENDING and a 7-day `verificationDeadline`
   - Creates TWO verification codes:
       • MOBILE — 5-digit, 10-min expiry  (existing flow)
       • EMAIL  — 6-digit, 10-min expiry  (new)
   - Sends the email code via `sendVerificationEmail` (sandbox: log)
   - Returns { ok, userId, devMobileCode, devEmailCode }
     The dev* codes are only returned because this is a sandbox/dev
     environment without a real SMS/email gateway — production would
     omit them and rely on actual delivery.

   Rate-limited: REGISTER preset (5 / hour / IP) per HEAVIX-SECURITY-BASELINE-V1 §6.
*/
export async function POST(req: Request) {
  try {
    // ── Rate limit (P0-6) ──
    const ip = getClientIp(req);
    const rl = rateLimit({
      key: rateLimitKey(ip, REGISTER.label),
      limit: REGISTER.limit,
      windowMs: REGISTER.windowMs,
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
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    let mobile = String(body.mobile ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const companyName = body.companyName ? String(body.companyName) : null;

    // P0-2: `role` is intentionally NOT read from the body. Public
    // registration can ONLY create BUYER accounts. Any `body.role` value
    // sent by the client is silently ignored. Only an admin can change a
    // user's role via the admin users API.

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "نام و نام خانوادگی الزامی است" }, { status: 400 });
    }
    if (!mobile || mobile.length < 10) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "ایمیل معتبر نیست" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "رمز عبور حداقل ۶ کاراکتر باشد" }, { status: 400 });
    }

    mobile = toEnDigits(mobile);

    // Mobile uniqueness
    const dupMobile = await db.user.findUnique({ where: { mobile } });
    if (dupMobile) {
      return NextResponse.json({ error: "شماره موبایل قبلاً ثبت شده است" }, { status: 409 });
    }
    // Email uniqueness (FIX 7)
    const dupEmail = await db.user.findUnique({ where: { email } });
    if (dupEmail) {
      return NextResponse.json({ error: "ایمیل قبلاً ثبت شده است" }, { status: 409 });
    }

    // 7-day verification deadline
    const verificationDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // P0-1: bcrypt-hash the password (cost factor 10, see src/lib/password.ts).
    // The plaintext password is discarded after hashing — never persisted.
    const passwordHash = await hashPassword(password);

    // Create user (PENDING, bcrypt-hashed password, role forced to BUYER).
    const user = await db.user.create({
      data: {
        firstName,
        lastName,
        mobile,
        email,
        passwordHash,
        status: "PENDING",
        role: "BUYER", // P0-2: public registration can only create BUYERs.
        mobileVerified: false,
        emailVerified: false,
        companyName,
        verificationDeadline,
      },
    });

    // MOBILE verification code — 5-digit, 10-min expiry
    const devMobileCode = String(Math.floor(10000 + Math.random() * 90000));
    const mobileExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.verificationCode.create({
      data: {
        userId: user.id,
        code: devMobileCode,
        type: "MOBILE",
        expiresAt: mobileExpiresAt,
        used: false,
      },
    });

    // EMAIL verification code — 6-digit, 10-min expiry (FIX 7)
    const devEmailCode = String(Math.floor(100000 + Math.random() * 900000));
    const emailExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.verificationCode.create({
      data: {
        userId: user.id,
        code: devEmailCode,
        type: "EMAIL",
        expiresAt: emailExpiresAt,
        used: false,
      },
    });

    // Send the email code (sandbox: logged to server console)
    try {
      await sendVerificationEmail(user.email, devEmailCode);
    } catch (e) {
      console.error("[register] sendVerificationEmail failed:", e);
      // Don't fail the registration — the user can use resend-verification.
    }

    return NextResponse.json({
      ok: true,
      userId: user.id,
      devMobileCode,
      devEmailCode,
      verificationDeadline: verificationDeadline.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
