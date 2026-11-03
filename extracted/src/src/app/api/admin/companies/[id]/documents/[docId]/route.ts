import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_DOC_STATUSES = ["PENDING", "VERIFIED", "REJECTED"];

interface Args {
  params: Promise<{ id: string; docId: string }>;
}

/* PATCH /api/admin/companies/[id]/documents/[docId] — verify/reject document.
   Body: { status, verifiedBy? }
*/
export async function PATCH(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, docId } = await params;
    const body = await req.json().catch(() => ({}));

    const status = ALLOWED_DOC_STATUSES.includes(String(body.status))
      ? String(body.status)
      : null;
    if (!status) {
      return NextResponse.json({ error: "status نامعتبر است" }, { status: 400 });
    }

    const existing = await db.companyDocument.findUnique({
      where: { id: docId },
    });
    if (!existing || existing.companyId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const verifiedBy = body.verifiedBy ?? "admin";
    const verifiedAt = status === "VERIFIED" || status === "REJECTED" ? new Date() : null;

    const doc = await db.companyDocument.update({
      where: { id: docId },
      data: { status, verifiedBy, verifiedAt },
    });

    await logAudit({
      actorType: "ADMIN",
      action: "company.document.review",
      entityType: "CompanyDocument",
      entityId: docId,
      before: { status: existing.status },
      after: { status, verifiedBy },
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: `Document ${docId} marked ${status}`,
    });

    return NextResponse.json({
      ok: true,
      document: {
        ...doc,
        verifiedAt: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
        createdAt: doc.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/admin/companies/[id]/documents/[docId] — remove document. */
export async function DELETE(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, docId } = await params;
    const existing = await db.companyDocument.findUnique({ where: { id: docId } });
    if (!existing || existing.companyId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.companyDocument.delete({ where: { id: docId } });

    await logAudit({
      actorType: "ADMIN",
      action: "company.document.delete",
      entityType: "CompanyDocument",
      entityId: docId,
      before: existing,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: "Document deleted",
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
