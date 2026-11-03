import { NextResponse } from "next/server";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import {
  enqueue,
  getQueueStats,
  listRegisteredTypes,
  listRecentJobs,
  getJobStatus,
} from "@/lib/queue";
import "@/lib/jobs"; // side-effect: registers built-in handlers
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/jobs — admin background-job control (P1-19).
   HEAVIX-AUDIT-2026-09-20.md §10

   GET  — returns queue stats + list of registered job types +
          the most-recent job records (for the admin dashboard).
   POST — enqueues a job { type, payload? }. Admin only.
   ============================================================ */

async function authorizeAdmin(): Promise<boolean> {
  if (await isAuthenticated()) return true;
  const user = await getCurrentUser();
  if (!user) return false;
  return isAdmin(user.id);
}

export async function GET(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const jobStatusFor = (url.searchParams.get("jobId") ?? "").trim();
    const recentLimit = Math.min(
      200,
      Math.max(1, Number(url.searchParams.get("recentLimit")) || 50),
    );

    // If a specific jobId was requested, return just that status
    // (used by the admin UI to poll a job it just enqueued).
    if (jobStatusFor) {
      const status = getJobStatus(jobStatusFor);
      if (!status) {
        return NextResponse.json(
          { error: "Job not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, jobId: jobStatusFor, ...status });
    }

    const stats = getQueueStats();
    const types = listRegisteredTypes();
    const recent = listRecentJobs(recentLimit);

    return NextResponse.json({
      ok: true,
      stats,
      types,
      recent,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.type !== "string" || !body.type.trim()) {
      return NextResponse.json(
        { error: "بدنه درخواست نامعتبر است؛ فیلد type الزامی است." },
        { status: 400 },
      );
    }
    const type = body.type.trim();
    const payload = body.payload ?? null;
    const priority =
      typeof body.priority === "number" ? body.priority : undefined;

    const jobId = enqueue({ type, payload, priority });

    await logAudit({
      actorId: null,
      actorType: "ADMIN",
      action: "job.enqueue",
      entityType: "Job",
      entityId: jobId,
      after: { type, payload, priority: priority ?? 0 },
      reason: `در صف قرار دادن کار پس‌زمینه: ${type}`,
    });

    return NextResponse.json({ ok: true, jobId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
