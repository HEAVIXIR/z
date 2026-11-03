import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["VERIFIED", "REJECTED", "UNDER_REVIEW", "EXPIRED", "REVOKED"];

/* PATCH /api/admin/verifications/[id] — moderate a verification.
 * Body: { status, notes?, expiresAt?, revokeReason? }
 *
 * When status = VERIFIED:
 *   - Sets reviewedAt = now, reviewedBy = admin
 *   - Sets expiresAt if provided
 *   - Updates Company.verified = true
 *
 * When status = REVOKED:
 *   - Sets revokedAt = now, revokedBy = admin
 *   - Updates Company.verified = false
 *
 * When status = REJECTED:
 *   - Sets reviewedAt = now, reviewedBy = admin
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const status = String(body.status ?? "");

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await db.companyVerification.findUnique({
      where: { id },
      include: { company: { select: { id: true, verified: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: any = {
      status,
      notes: body.notes ?? existing.notes,
      reviewedAt: new Date(),
      reviewedBy: "admin",
    };

    if (status === "VERIFIED" && body.expiresAt) {
      updateData.expiresAt = new Date(body.expiresAt);
    }

    if (status === "REVOKED") {
      updateData.revokedAt = new Date();
      updateData.revokedBy = "admin";
      updateData.revokeReason = body.revokeReason || "Revoked by admin";
    }

    const updated = await db.companyVerification.update({
      where: { id },
      data: updateData,
    });

    // Update Company.verified flag
    if (status === "VERIFIED") {
      await db.company.update({
        where: { id: existing.companyId },
        data: { verified: true },
      });
    } else if (status === "REVOKED" || status === "REJECTED" || status === "EXPIRED") {
      // Only unverify if no other VERIFIED verification exists
      const otherVerifs = await db.companyVerification.count({
        where: { companyId: existing.companyId, status: "VERIFIED", id: { not: id } },
      });
      if (otherVerifs === 0) {
        await db.company.update({
          where: { id: existing.companyId },
          data: { verified: false },
        });
      }
    }

    await logAudit({
      actorType: "ADMIN",
      action: "verification.moderate",
      entityType: "CompanyVerification",
      entityId: id,
      before: { status: existing.status },
      after: { status, expiresAt: updateData.expiresAt },
      ip: getClientIp(req),
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: updated.id, status: updated.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
