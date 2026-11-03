import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_VER_STATUSES = ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED"];

interface Args {
  params: Promise<{ id: string; verId: string }>;
}

/* PATCH /api/admin/companies/[id]/verifications/[verId] — approve/reject.
   Body: { status, reviewedBy?, notes? }

   When the verification is approved (status="VERIFIED") we also flip
   the parent Company.verified flag to true so the public badge shows
   up immediately.
*/
export async function PATCH(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, verId } = await params;
    const body = await req.json().catch(() => ({}));

    const status = ALLOWED_VER_STATUSES.includes(String(body.status))
      ? String(body.status)
      : null;
    if (!status) {
      return NextResponse.json({ error: "status نامعتبر است" }, { status: 400 });
    }

    const existing = await db.companyVerification.findUnique({ where: { id: verId } });
    if (!existing || existing.companyId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const reviewedBy = body.reviewedBy ?? "admin";
    const reviewedAt = status === "VERIFIED" || status === "REJECTED" ? new Date() : null;
    const notes = body.notes !== undefined ? String(body.notes) : existing.notes;

    const ver = await db.companyVerification.update({
      where: { id: verId },
      data: { status, reviewedBy, reviewedAt, notes },
    });

    // Approval side-effect: mark the company as verified.
    if (status === "VERIFIED") {
      await db.company.update({
        where: { id },
        data: { verified: true },
      });
    } else if (status === "REJECTED") {
      await db.company.update({
        where: { id },
        data: { verified: false },
      });
    }

    await logAudit({
      actorType: "ADMIN",
      action: "company.verification.review",
      entityType: "CompanyVerification",
      entityId: verId,
      before: { status: existing.status },
      after: { status, reviewedBy, notes },
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: `Verification ${verId} marked ${status}`,
    });

    return NextResponse.json({
      ok: true,
      verification: {
        ...ver,
        submittedAt: ver.submittedAt.toISOString(),
        reviewedAt: ver.reviewedAt ? ver.reviewedAt.toISOString() : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
