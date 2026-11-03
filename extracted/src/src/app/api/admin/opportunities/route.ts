import { NextResponse } from "next/server";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { getOpportunities, runOpportunityScan, updateOpportunityStatus } from "@/lib/opportunity-engine";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/opportunities — Opportunity Engine (P2-27)
   HEAVIX-P0-IMPLEMENTATION-PLAN.md P2-27
   ------------------------------------------------------------
   GET   — list opportunities with filters (?type=&status=&limit=).
   POST  — { action: "scan" } run a scan (admin only).
   PATCH — { id, status } update opportunity status
           (SEEN / ACTED_ON / DISMISSED).
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
    const type = url.searchParams.get("type")?.trim() || undefined;
    const status = url.searchParams.get("status")?.trim() || undefined;
    const limit = Number(url.searchParams.get("limit")) || 100;
    const items = await getOpportunities({ type, status, limit });
    return NextResponse.json({ ok: true, items });
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
    const action = body?.action;
    if (action !== "scan") {
      return NextResponse.json(
        { error: "action نامعتبر است (تنها «scan» پشتیبانی می‌شود)." },
        { status: 400 },
      );
    }

    await logAudit({
      actorId: null,
      actorType: "ADMIN",
      action: "opportunity.scan_triggered",
      entityType: "Opportunity",
      entityId: null,
      after: { action },
      reason: "اجرا از سوی ادمین: اسکن فرصت‌ها",
    });

    const result = await runOpportunityScan();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.id !== "string" || typeof body.status !== "string") {
      return NextResponse.json(
        { error: "id و status الزامی هستند." },
        { status: 400 },
      );
    }
    const validStatuses = ["NEW", "SEEN", "ACTED_ON", "DISMISSED"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `status باید یکی از ${validStatuses.join("، ")} باشد.` },
        { status: 400 },
      );
    }
    const updated = await updateOpportunityStatus(body.id, body.status);
    if (!updated) {
      return NextResponse.json(
        { error: "فرصت یافت نشد." },
        { status: 404 },
      );
    }

    await logAudit({
      actorId: null,
      actorType: "ADMIN",
      action: "opportunity.status_change",
      entityType: "Opportunity",
      entityId: updated.id,
      before: { status: "UNKNOWN" },
      after: { status: updated.status },
      reason: `تغییر وضعیت فرصت به ${updated.status}`,
    });

    return NextResponse.json({ ok: true, opportunity: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
