import { NextResponse } from "next/server";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { matchAllRequests } from "@/lib/ai-matching";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   POST /api/admin/matching/run — run AI matching for all
   active BuyRequests. Admin-only.
   ============================================================ */

async function authorizeAdmin(): Promise<boolean> {
  if (await isAuthenticated()) return true;
  const user = await getCurrentUser();
  if (!user) return false;
  return isAdmin(user.id);
}

export async function POST(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Audit the admin trigger (the matching lib also writes its own
    // SYSTEM-level batched entry — this one records the human actor).
    try {
      await logAudit({
        actorId: null,
        actorType: "ADMIN",
        action: "matching.admin.trigger",
        entityType: "BuyRequest",
        entityId: null,
        reason: "اجرای دستی موتور تطبیق هوشمند توسط ادمین",
      });
    } catch {
      /* non-fatal */
    }

    const result = await matchAllRequests();
    return NextResponse.json({
      ok: true,
      totalRequests: result.totalRequests,
      totalMatches: result.totalMatches,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
