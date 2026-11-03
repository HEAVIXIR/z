import { registerHandler } from "@/lib/queue";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { cleanupUnverifiedUsers } from "@/lib/auth-cleanup";
import { getAIBudget } from "@/lib/ai-policy";
import { matchSavedSearches } from "@/lib/alert-matcher";

/* ============================================================
   HEAVIX — Built-in background job handlers (P1-19)
   HEAVIX-AUDIT-2026-09-20.md §10
   HEAVIX-P0-IMPLEMENTATION-PLAN.md STEP 19
   ------------------------------------------------------------
   Registers handlers for the canonical background-job types:

     • cleanup-unverified-users  — purge past-deadline unverified users
     • audit-log-cleanup         — prune audit logs older than 90 days
     • ai-budget-reset           — periodic safety check for budget windows
     • listing-expiry            — mark PUBLISHED listings as EXPIRED
     • image-thumbnail           — placeholder for future image processing

   Each handler:
     • Receives an optional `payload` (any) from the caller.
     • MUST NOT throw — exceptions are caught by the queue and the
       job is marked FAILED. Handlers are encouraged to swallow
       non-fatal errors and report them via `logAudit`.
     • Writes an AuditLog entry on completion (actorType="SYSTEM")
       so admins can see what the background worker has been doing.

   The module is idempotent: re-importing it re-registers the same
   handlers (last-write-wins), which is fine for Next.js HMR.
   ============================================================ */

let registered = false;

/**
 * Register all built-in handlers. Safe to call multiple times —
 * the queue's `registerHandler` is idempotent.
 */
export function registerBuiltInJobHandlers(): void {
  if (registered) return;
  registered = true;

  /* ── 1. cleanup-unverified-users ─────────────────────────── */
  registerHandler("cleanup-unverified-users", async (payload: any) => {
    const mode: "delete" | "deactivate" =
      payload?.mode === "deactivate" ? "deactivate" : "delete";
    const result = await cleanupUnverifiedUsers(mode);
    await logAudit({
      actorId: null,
      actorType: "SYSTEM",
      action: "user.cleanup_unverified",
      entityType: "User",
      entityId: null,
      after: { mode: result.mode, affected: result.affected, userIds: result.userIds },
      reason: result.ok ? result.message : `FAILED: ${result.error ?? "unknown"}`,
    });
    if (!result.ok) {
      // Re-throw so the queue marks this job FAILED.
      throw new Error(result.error ?? "cleanup-unverified-users failed");
    }
  });

  /* ── 2. audit-log-cleanup ────────────────────────────────── */
  // AuditLog is append-only by policy (HEAVIX-SECURITY-BASELINE
  // §10) — but the spec also calls for a 90-day retention sweep
  // so the table does not grow unboundedly. The retention window
  // is configurable via payload.days (default 90).
  registerHandler("audit-log-cleanup", async (payload: any) => {
    const days =
      typeof payload?.days === "number" && payload.days > 0
        ? Math.min(3650, Math.floor(payload.days))
        : 90;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      // SQLite + Prisma: deleteMany returns the count.
      const result = await db.auditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      await logAudit({
        actorId: null,
        actorType: "SYSTEM",
        action: "audit.cleanup",
        entityType: "AuditLog",
        entityId: null,
        after: { deleted: result.count, retentionDays: days, cutoff: cutoff.toISOString() },
        reason: `پاک‌سازی لاگ‌های ممیزی قدیمی‌تر از ${days} روز`,
      });
    } catch (err) {
      await logAudit({
        actorId: null,
        actorType: "SYSTEM",
        action: "audit.cleanup",
        entityType: "AuditLog",
        entityId: null,
        reason: `FAILED: ${err instanceof Error ? err.message : String(err)}`,
      });
      throw err;
    }
  });

  /* ── 3. ai-budget-reset ──────────────────────────────────── */
  // `getAIBudget()` already auto-resets the daily/monthly windows
  // on read. This job is a periodic safety check that runs the
  // reset even if no AI gateway traffic has triggered a read in
  // the last 24h. Useful for idle dev/preview deployments.
  registerHandler("ai-budget-reset", async () => {
    try {
      const budget = await getAIBudget();
      await logAudit({
        actorId: null,
        actorType: "SYSTEM",
        action: "ai.budget_reset",
        entityType: "AIBudget",
        entityId: "main",
        after: {
          dailySpendUsd: budget.dailySpendUsd,
          monthlySpendUsd: budget.monthlySpendUsd,
          dailyResetAt: budget.dailyResetAt,
          monthlyResetAt: budget.monthlyResetAt,
        },
        reason: "بررسی دوره‌ای پنجره‌های بودجه هوش مصنوعی",
      });
    } catch (err) {
      await logAudit({
        actorId: null,
        actorType: "SYSTEM",
        action: "ai.budget_reset",
        entityType: "AIBudget",
        entityId: "main",
        reason: `FAILED: ${err instanceof Error ? err.message : String(err)}`,
      });
      throw err;
    }
  });

  /* ── 4. listing-expiry ───────────────────────────────────── */
  // Listings where expiresAt < now AND status=PUBLISHED should be
  // marked EXPIRED. This is the lifecycle transition described in
  // HEAVIX-DATA-GOVERNANCE-V1 §(lifecycle) — DRAFT → PENDING_REVIEW
  // → ACTIVE → INACTIVE → ARCHIVED — applied to the Listing.status
  // string column ("PUBLISHED" / "EXPIRED" / "SOLD" / "DRAFT" ...).
  registerHandler("listing-expiry", async () => {
    try {
      const now = new Date();
      const result = await db.listing.updateMany({
        where: {
          status: "PUBLISHED",
          expiresAt: { lt: now },
        },
        data: { status: "EXPIRED" },
      });
      await logAudit({
        actorId: null,
        actorType: "SYSTEM",
        action: "listing.expire",
        entityType: "Listing",
        entityId: null,
        after: { expired: result.count, cutoff: now.toISOString() },
        reason: "علامت‌گذاری آگهی‌های منقضی‌شده به‌عنوان EXPIRED",
      });
    } catch (err) {
      await logAudit({
        actorId: null,
        actorType: "SYSTEM",
        action: "listing.expire",
        entityType: "Listing",
        entityId: null,
        reason: `FAILED: ${err instanceof Error ? err.message : String(err)}`,
      });
      throw err;
    }
  });

  /* ── 5. image-thumbnail (placeholder) ────────────────────── */
  // Future: generate WebP/AVIF thumbnails via sharp for newly
  // uploaded ListingImage rows. For now we just log so the queue
  // has a complete set of registered types and the admin UI can
  // demonstrate the "اجرا" button.
  registerHandler("image-thumbnail", async (payload: any) => {
    const listingId = payload?.listingId ?? null;
    const imageId = payload?.imageId ?? null;
    console.info(
      `[jobs] image-thumbnail placeholder — listingId=${listingId} imageId=${imageId} ` +
        `(sharp thumbnail pipeline is a P2 task per HEAVIX-P0-IMPLEMENTATION-PLAN)`,
    );
    await logAudit({
      actorId: null,
      actorType: "SYSTEM",
      action: "media.thumbnail_placeholder",
      entityType: "ListingImage",
      entityId: imageId ?? null,
      after: { listingId, imageId, note: "placeholder — sharp pipeline pending (P2)" },
      reason: "صورت‌حساب تصویر پس‌زمینه‌ای (نسخه placeholder)",
    });
  });

  /* ── 6. saved-search-matcher (P1-5) ──────────────────────── */
  // Re-runs every active SavedSearch against the current PUBLISHED
  // listing pool and creates one Notification per user for any new
  // matches. This is the canonical "alert" pass — the public
  // /admin/jobs dashboard exposes an "اجرا" button for it.
  //
  // `matchSavedSearches()` itself writes its own SYSTEM audit log
  // entry on completion, so the wrapper here just runs it and
  // re-throws on failure so the queue marks the job FAILED.
  registerHandler("saved-search-matcher", async () => {
    const result = await matchSavedSearches();
    // Surface the result in the job's audit log entry (the matcher
    // helper already logged a SYSTEM entry; this one is for the
    // job-runner context so the queue's recent-jobs panel can show
    // a meaningful payload).
    await logAudit({
      actorId: null,
      actorType: "SYSTEM",
      action: "job.saved_search_matcher",
      entityType: "SavedSearch",
      entityId: null,
      after: result,
      reason: `اجرای کار پس‌زمینهٔ تطبیق هشدارها — ${result.scanned} جستجوی ذخیره‌شده اسکن شد، ${result.matched} مطابقت، ${result.notified} اعلان.`,
    });
  });
}

/**
 * Idempotent module init — registers handlers on first import.
 * Subsequent imports are no-ops (guarded by `registered`).
 *
 * Next.js HMR may re-import this module; that is safe because
 * `registerHandler` itself is last-write-wins.
 */
registerBuiltInJobHandlers();
