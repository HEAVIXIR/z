import { NextResponse } from "next/server";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { findJob, cancelJob, retryJob, deleteJob } from "@/lib/queue";
import "@/lib/jobs"; // side-effect: registers built-in handlers
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/* ============================================================
   /api/admin/jobs/[id]
   ------------------------------------------------------------
   GET    — fetch a single job record (no separate log table;
            the in-memory JobRecord itself is the source).
   PATCH  — perform an action on a job:
              body.action = "CANCEL"  → mark PENDING/RUNNING
                                        job as FAILED with
                                        error="Cancelled by admin".
              body.action = "RETRY"   → re-enqueue a new job with
                                        the same type+payload+priority
                                        (returns the new jobId).
              body.action = "PURGE"   → alias for deleteJob (single).
   DELETE — hard-delete a terminal-status job (DONE / FAILED).
            PENDING / RUNNING jobs cannot be deleted — cancel
            them first.

   NOTE: the queue uses 4 statuses — PENDING / RUNNING / DONE /
   FAILED. There is no separate CANCELLED status; a cancelled job
   is recorded as FAILED with `error="Cancelled by admin"`.
   ============================================================ */

async function authorizeAdmin(): Promise<boolean> {
  if (await isAuthenticated()) return true;
  const user = await getCurrentUser();
  if (!user) return false;
  return isAdmin(user.id);
}

export async function GET(_req: Request, { params }: Params) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const job = findJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, job });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: Params) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action =
      typeof body.action === "string" ? body.action.toUpperCase() : "";

    if (!action) {
      return NextResponse.json(
        { error: "فیلد action الزامی است (CANCEL | RETRY | PURGE)." },
        { status: 400 },
      );
    }

    // ── CANCEL ─────────────────────────────────────────────────
    if (action === "CANCEL") {
      const before = findJob(id);
      if (!before) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      const result = cancelJob(id);
      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.error ?? "Cannot cancel job",
            status: result.status,
          },
          { status: 409 },
        );
      }
      await logAudit({
        actorId: null,
        actorType: "ADMIN",
        action: "job.cancel",
        entityType: "Job",
        entityId: id,
        before: { type: before.type, status: before.status },
        after: { status: result.status, error: "Cancelled by admin" },
        reason: `لغو کار پس‌زمینه: ${before.type}`,
      });
      return NextResponse.json({ ok: true, status: result.status });
    }

    // ── RETRY ──────────────────────────────────────────────────
    if (action === "RETRY") {
      const before = findJob(id);
      if (!before) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      const newJobId = retryJob(id);
      if (!newJobId) {
        return NextResponse.json(
          { error: "فقط کارهای ناموفق یا انجام‌شده قابل تکرار هستند." },
          { status: 409 },
        );
      }
      await logAudit({
        actorId: null,
        actorType: "ADMIN",
        action: "job.retry",
        entityType: "Job",
        entityId: id,
        before: { type: before.type, status: before.status },
        after: { newJobId, type: before.type },
        reason: `تکرار کار پس‌زمینهٔ ناموفق: ${before.type}`,
      });
      return NextResponse.json({ ok: true, newJobId });
    }

    // ── PURGE (single) — alias for hard-delete ─────────────────
    if (action === "PURGE") {
      const before = findJob(id);
      if (!before) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      const ok = deleteJob(id);
      if (!ok) {
        return NextResponse.json(
          { error: "فقط کارهای پایانی (انجام‌شده / خطا) قابل حذف هستند." },
          { status: 409 },
        );
      }
      await logAudit({
        actorId: null,
        actorType: "ADMIN",
        action: "job.delete",
        entityType: "Job",
        entityId: id,
        before: { type: before.type, status: before.status },
        reason: `حذف کار پس‌زمینه: ${before.type}`,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: `action نامعتبر: ${action}` },
      { status: 400 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const before = findJob(id);
    if (!before) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const ok = deleteJob(id);
    if (!ok) {
      return NextResponse.json(
        { error: "فقط کارهای پایانی (انجام‌شده / خطا) قابل حذف هستند." },
        { status: 409 },
      );
    }
    await logAudit({
      actorId: null,
      actorType: "ADMIN",
      action: "job.delete",
      entityType: "Job",
      entityId: id,
      before: { type: before.type, status: before.status },
      reason: `حذف کار پس‌زمینه: ${before.type}`,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
