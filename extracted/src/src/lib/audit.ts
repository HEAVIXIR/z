import { db } from "@/lib/db";

/* ============================================================
   HEAVIX — Audit Log helper (P0-4)
   HEAVIX-SECURITY-BASELINE-V1.md §10
   HEAVIX-P0-IMPLEMENTATION-PLAN.md STEP 4

   AuditLog is APPEND-ONLY. This helper never updates or deletes
   existing rows. Audit failures MUST NOT crash the main operation
   — they are swallowed and logged to console.
   ============================================================ */

export type AuditActorType = "USER" | "ADMIN" | "SYSTEM" | "AI";

export interface LogAuditParams {
  /** UserId or admin/system identifier. Null allowed for SYSTEM events. */
  actorId?: string | null;
  /** Defaults to "USER". Use "ADMIN" for admin-cookie actions, "SYSTEM" for jobs, "AI" for AI gateway. */
  actorType?: AuditActorType;
  /** Action key in `resource.action` form, e.g. "listing.publish", "user.suspend". */
  action: string;
  /** Entity type name, e.g. "Listing", "User", "Brand". */
  entityType: string;
  /** Entity id (nullable for collection-level actions). */
  entityId?: string | null;
  /** Before-state payload (any JSON-serializable value). */
  before?: unknown;
  /** After-state payload (any JSON-serializable value). */
  after?: unknown;
  /** Request IP. */
  ip?: string | null;
  /** User-Agent header. */
  userAgent?: string | null;
  /** Correlation / request id. */
  requestId?: string | null;
  /** Human-readable reason / note. */
  reason?: string | null;
}

function safeStringify(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    try {
      return String(value);
    } catch {
      return null;
    }
  }
}

/**
 * Append an entry to the AuditLog table.
 *
 * Contract:
 *   • Append-only — never update/delete (no update/delete API surface here).
 *   • Failures are non-fatal — caught + logged to console.error.
 *   • `before` / `after` are JSON-serialized.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorType: params.actorType ?? "USER",
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        beforeJson: safeStringify(params.before),
        afterJson: safeStringify(params.after),
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
        requestId: params.requestId ?? null,
        reason: params.reason ?? null,
      },
    });
  } catch (err: any) {
    // Audit failures must NEVER crash the main operation.
    // Log to console and move on.
    console.error("[audit] failed to write audit log:", {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      actorId: params.actorId ?? null,
      error: err?.message ?? String(err),
    });
  }
}
