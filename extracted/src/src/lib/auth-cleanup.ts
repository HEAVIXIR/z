import { db } from "@/lib/db";

/* ============================================================
   HEAVIX — Auth cleanup helpers (P1-19)
   ------------------------------------------------------------
   Extracted from /api/admin/cleanup-unverified/route.ts so the
   same logic can be invoked from:
     • the admin HTTP endpoint (existing, unchanged behavior)
     • the background-job handler `cleanup-unverified-users`
     • any future scheduled-task caller

   Contract: this function NEVER raises. It catches + reports
   errors in the returned `error` field so callers (especially the
   background job handler) don't crash the queue loop.
   ============================================================ */

export type CleanupMode = "delete" | "deactivate";

export interface CleanupResult {
  ok: boolean;
  mode: CleanupMode;
  affected: number;
  /** The user ids that were affected (for audit). */
  userIds: string[];
  /** Persian message safe to surface to the admin UI. */
  message: string;
  /** Populated when ok=false. */
  error?: string;
}

/**
 * Find users whose verification deadline has passed AND email is
 * still unverified, then either DELETE them or mark them BLOCKED.
 *
 * Default mode = "delete" (matches the existing admin endpoint).
 *
 * The `deactivate` mode is preferred in production environments
 * where audit history must be preserved; in dev/preview `delete`
 * is fine because cascades clean up Sessions + VerificationCodes.
 */
export async function cleanupUnverifiedUsers(
  mode: CleanupMode = "delete",
): Promise<CleanupResult> {
  try {
    const now = new Date();
    const where = {
      verificationDeadline: { lt: now },
      emailVerified: false,
    };

    const candidates = await db.user.findMany({
      where,
      select: { id: true },
    });

    if (candidates.length === 0) {
      return {
        ok: true,
        mode,
        affected: 0,
        userIds: [],
        message: "هیچ کاربر تأییدنشده‌ای بیش از مهلت نبود.",
      };
    }

    const ids = candidates.map((c) => c.id);

    if (mode === "deactivate") {
      await db.user.updateMany({
        where: { id: { in: ids } },
        data: { status: "BLOCKED", verificationDeadline: null },
      });
    } else {
      await db.user.deleteMany({
        where: { id: { in: ids } },
      });
    }

    return {
      ok: true,
      mode,
      affected: ids.length,
      userIds: ids,
      message:
        mode === "deactivate"
          ? `${ids.length} کاربر غیرفعال شدند.`
          : `${ids.length} کاربر حذف شدند.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      mode,
      affected: 0,
      userIds: [],
      message: "خطا در پاک‌سازی کاربران.",
      error: msg,
    };
  }
}

/**
 * Preview mode — list candidates WITHOUT touching them. Used by
 * the admin GET endpoint so the operator can see what *would* be
 * cleaned up before pressing the button.
 */
export async function listUnverifiedCandidates(): Promise<{
  ok: boolean;
  count: number;
  users: Array<{
    id: string;
    email: string;
    mobile: string;
    verificationDeadline: string | null;
  }>;
  error?: string;
}> {
  try {
    const now = new Date();
    const rows = await db.user.findMany({
      where: { verificationDeadline: { lt: now }, emailVerified: false },
      select: {
        id: true,
        email: true,
        mobile: true,
        verificationDeadline: true,
      },
      orderBy: { verificationDeadline: "asc" },
      take: 200,
    });
    return {
      ok: true,
      count: rows.length,
      users: rows.map((r) => ({
        id: r.id,
        email: r.email,
        mobile: r.mobile,
        verificationDeadline: r.verificationDeadline?.toISOString() ?? null,
      })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      count: 0,
      users: [],
      error: msg,
    };
  }
}
