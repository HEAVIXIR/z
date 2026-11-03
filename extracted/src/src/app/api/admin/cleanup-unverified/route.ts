import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/admin/cleanup-unverified  (FIX 7)
   Admin-only endpoint. Deletes (or, if `deactivate=true` query
   param is passed, deactivates) users where:
       verificationDeadline < now  AND  emailVerified = false

   Admin access is granted by EITHER:
     • the legacy admin cookie (isAuthenticated), OR
     • a user session with role === "ADMIN"
   This mirrors the access rule in /admin/layout.tsx.
*/
export async function POST(req: Request) {
  try {
    // ── Auth gate ──
    let adminOk = await isAuthenticated();
    if (!adminOk) {
      const user = await getCurrentUser();
      const role = (user?.role || "BUYER").toUpperCase();
      if (role !== "ADMIN" && role !== "SUPERADMIN") {
        return NextResponse.json(
          { error: "دسترسی فقط برای مدیران مجاز است" },
          { status: 403 },
        );
      }
      adminOk = true;
    }
    if (!adminOk) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    // ── Parse mode: delete (default) or deactivate ──
    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") ?? "delete").toLowerCase();
    const deactivate = mode === "deactivate";

    const now = new Date();
    const where = {
      verificationDeadline: { lt: now },
      emailVerified: false,
    };

    // Fetch candidates first (so we can report counts + IDs)
    const candidates = await db.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, mobile: true, verificationDeadline: true },
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        mode: deactivate ? "deactivate" : "delete",
        affected: 0,
        message: "هیچ کاربر تأییدنشده‌ای بیش از مهلت نبود.",
      });
    }

    if (deactivate) {
      // Mark BLOCKED and clear the deadline so they aren't picked up
      // again on the next run. Records preserved for audit.
      await db.user.updateMany({
        where: { id: { in: candidates.map((c) => c.id) } },
        data: { status: "BLOCKED", verificationDeadline: null },
      });
    } else {
      // Hard delete — cascades to sessions + verificationCodes per schema.
      await db.user.deleteMany({
        where: { id: { in: candidates.map((c) => c.id) } },
      });
    }

    return NextResponse.json({
      ok: true,
      mode: deactivate ? "deactivate" : "delete",
      affected: candidates.length,
      users: candidates.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        mobile: c.mobile,
        verificationDeadline: c.verificationDeadline?.toISOString() ?? null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* GET — preview: list candidates without touching them. */
export async function GET() {
  try {
    let adminOk = await isAuthenticated();
    if (!adminOk) {
      const user = await getCurrentUser();
      const role = (user?.role || "BUYER").toUpperCase();
      if (role !== "ADMIN" && role !== "SUPERADMIN") {
        return NextResponse.json(
          { error: "دسترسی فقط برای مدیران مجاز است" },
          { status: 403 },
        );
      }
      adminOk = true;
    }
    if (!adminOk) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const now = new Date();
    const candidates = await db.user.findMany({
      where: { verificationDeadline: { lt: now }, emailVerified: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        verificationDeadline: true,
        createdAt: true,
      },
      orderBy: { verificationDeadline: "asc" },
      take: 200,
    });

    return NextResponse.json({
      ok: true,
      count: candidates.length,
      users: candidates.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        mobile: c.mobile,
        verificationDeadline: c.verificationDeadline?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
