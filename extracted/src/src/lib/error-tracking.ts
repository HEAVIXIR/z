import { logAudit } from "@/lib/audit";

/* ============================================================
   HEAVIX — Error Tracking (FIX-GAPS-2)
   ------------------------------------------------------------
   Lightweight, dependency-free error tracking. Used by API
   route catch blocks to:
     1. log the error to console (with a structured payload),
     2. append a SYSTEM AuditLog entry (actorType=SYSTEM,
        action="error") so admin-visible audit log shows
        backend failures alongside user/admin actions.

   The audit write is best-effort — failures are swallowed
   (just like logAudit) so tracking an error never crashes the
   request again.

   This is intentionally NOT a Sentry/APM replacement — it's
   the minimal observability surface that ships with the app.
   For production-grade tracing, swap `trackError`'s internals
   to forward to Sentry/OTel without changing the call sites.
   ============================================================ */

export interface ErrorContext {
  [key: string]: unknown;
}

/**
 * Track an error.
 *
 * @param error   The Error (or anything thrown). Non-Error values
 *                are coerced to a synthetic Error so we always
 *                have a `.message` + `.stack`.
 * @param context Optional structured context (endpoint, userId,
 *                requestId, …). Serialized to JSON in the audit
 *                row's `afterJson`.
 */
export function trackError(error: unknown, context?: ErrorContext): void {
  const err: Error =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : String(error ?? ""));

  const payload = {
    message: err.message,
    name: err.name,
    stack: err.stack ?? null,
    context: context ?? null,
    timestamp: new Date().toISOString(),
  };

  // 1. Console — structured so log aggregators can parse it.
  console.error("[trackError]", payload);

  // 2. AuditLog — fire-and-forget. logAudit already swallows
  //    its own failures, but we wrap in a try/catch anyway so
  //    an unrelated Prisma error during error-tracking can't
  //    re-throw out of the catch block that called trackError.
  try {
    void logAudit({
      actorType: "SYSTEM",
      action: "error",
      entityType: err.name || "Error",
      entityId: null,
      after: payload,
      reason: err.message,
    });
  } catch {
    /* swallow — see header comment */
  }
}
