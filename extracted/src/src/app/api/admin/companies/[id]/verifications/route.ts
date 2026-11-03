import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

/* POST /api/admin/companies/[id]/verifications — submit verification
   request. Creates a new CompanyVerification row in PENDING status.

   Body: { notes? }
*/
export async function POST(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const company = await db.company.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ver = await db.companyVerification.create({
      data: {
        companyId: id,
        status: "PENDING",
        notes: body.notes ?? null,
      },
    });

    await logAudit({
      actorType: "ADMIN",
      action: "company.verification.submit",
      entityType: "CompanyVerification",
      entityId: ver.id,
      after: { companyId: id, status: ver.status, notes: ver.notes },
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: `Verification submitted for company "${company.name}"`,
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

/* GET /api/admin/companies/[id]/verifications — list verifications. */
export async function GET(_req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const vers = await db.companyVerification.findMany({
      where: { companyId: id },
      orderBy: { submittedAt: "desc" },
    });
    return NextResponse.json({
      verifications: vers.map((v) => ({
        ...v,
        submittedAt: v.submittedAt.toISOString(),
        reviewedAt: v.reviewedAt ? v.reviewedAt.toISOString() : null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
