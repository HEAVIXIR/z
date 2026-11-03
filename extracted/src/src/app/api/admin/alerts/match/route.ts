import { NextResponse } from "next/server";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { matchSavedSearches } from "@/lib/alert-matcher";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   POST /api/admin/alerts/match — run the alert matcher (P1-5).
   ------------------------------------------------------------
   Triggers `matchSavedSearches()` synchronously — every active
   SavedSearch is re-run against the current PUBLISHED listing
   pool and one Notification per user is created for any new
   matches found. Returns aggregate counts.

   Admin-only. Uses the dual-path authorization pattern (legacy
   admin-cookie OR user session with ADMIN role).
   ============================================================ */

async function authorizeAdmin(): Promise<boolean> {
  if (await isAuthenticated()) return true;
  const user = await getCurrentUser();
  if (!user) return false;
  return isAdmin(user.id);
}

export async function POST() {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await matchSavedSearches();

    const user = await getCurrentUser().catch(() => null);
    await logAudit({
      actorId: user?.id ?? null,
      actorType: "ADMIN",
      action: "alert.match_run",
      entityType: "SavedSearch",
      entityId: null,
      after: result,
      reason: `اجرای دستی تطبیق هشدارها — ${result.scanned} جستجوی ذخیره‌شده اسکن شد (${result.matched} مطابقت، ${result.notified} اعلان).`,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
