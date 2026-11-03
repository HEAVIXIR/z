import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { recomputeRatingFor } from "@/lib/reviews";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["PUBLISHED", "REJECTED", "HIDDEN"];

/* PATCH /api/admin/reviews/[id] — moderate a review.
   Body: { status: "PUBLISHED" | "REJECTED" | "HIDDEN", adminNotes? } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = String(body.status ?? "");
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });
    }

    const existing = await db.review.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "نظر یافت نشد" }, { status: 404 });
    }

    const updated = await db.review.update({
      where: { id },
      data: {
        status,
        adminNotes: body.adminNotes ? String(body.adminNotes).slice(0, 500) : existing.adminNotes,
        moderatedAt: new Date(),
      },
    });

    await recomputeRatingFor(updated);

    await logAudit({
      actorType: "ADMIN",
      action: "review.moderate",
      entityType: "Review",
      entityId: id,
      before: { status: existing.status },
      after: { status },
      ip: getClientIp(req),
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: updated.id, status: updated.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
