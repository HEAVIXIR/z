import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/auth/me
   Returns the currently-logged-in user's profile (id, firstName,
   lastName, email, mobile, role, status, emailVerified,
   mobileVerified). Returns 401 if no valid user session exists.
   This endpoint only inspects the USER session cookie, NOT the
   admin cookie — admin users who log in via username/password
   have no User record and should not use this endpoint.
*/
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "_not_authenticated" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobile: user.mobile,
        companyName: user.companyName,
        userType: user.userType,
        role: user.role || "BUYER",
        status: user.status,
        emailVerified: user.emailVerified,
        mobileVerified: user.mobileVerified,
        verificationDeadline: user.verificationDeadline?.toISOString() ?? null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
