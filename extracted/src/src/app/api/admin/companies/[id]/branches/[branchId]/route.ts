import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string; branchId: string }>;
}

/* PATCH /api/admin/companies/[id]/branches/[branchId] — update branch.
   Body: { name?, address?, cityId?, phone?, isHeadquarters?, active? }
*/
export async function PATCH(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, branchId } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = await db.companyBranch.findUnique({ where: { id: branchId } });
    if (!existing || existing.companyId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.cityId) {
      const city = await db.city.findUnique({ where: { id: String(body.cityId) }, select: { id: true } });
      if (!city) return NextResponse.json({ error: "city not found" }, { status: 400 });
    }

    // If promoting to headquarters, demote existing HQ
    if (body.isHeadquarters && !existing.isHeadquarters) {
      await db.companyBranch.updateMany({
        where: { companyId: id, isHeadquarters: true },
        data: { isHeadquarters: false },
      });
    }

    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.address !== undefined) data.address = body.address;
    if (body.cityId !== undefined) data.cityId = body.cityId || null;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.isHeadquarters !== undefined) data.isHeadquarters = !!body.isHeadquarters;
    if (body.active !== undefined) data.active = !!body.active;

    const branch = await db.companyBranch.update({
      where: { id: branchId },
      data,
    });

    await logAudit({
      actorType: "ADMIN",
      action: "company.branch.update",
      entityType: "CompanyBranch",
      entityId: branchId,
      before: existing,
      after: data,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: "Branch updated via admin UI",
    });

    return NextResponse.json({
      ok: true,
      branch: {
        ...branch,
        createdAt: branch.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/admin/companies/[id]/branches/[branchId] — remove branch. */
export async function DELETE(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, branchId } = await params;
    const existing = await db.companyBranch.findUnique({ where: { id: branchId } });
    if (!existing || existing.companyId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.companyBranch.delete({ where: { id: branchId } });

    await logAudit({
      actorType: "ADMIN",
      action: "company.branch.delete",
      entityType: "CompanyBranch",
      entityId: branchId,
      before: existing,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: "Branch deleted",
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
