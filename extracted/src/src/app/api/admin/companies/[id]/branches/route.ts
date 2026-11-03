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

/* GET /api/admin/companies/[id]/branches — list branches. */
export async function GET(_req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const branches = await db.companyBranch.findMany({
      where: { companyId: id },
      orderBy: [{ isHeadquarters: "desc" }, { createdAt: "desc" }],
      include: { city: { select: { id: true, name: true, province: { select: { name: true } } } } },
    });
    return NextResponse.json({
      branches: branches.map((b) => ({
        ...b,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/companies/[id]/branches — create branch.
   Body: { name, address?, cityId?, phone?, isHeadquarters?, active? }
*/
export async function POST(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "نام شعبه الزامی است" }, { status: 400 });
    }

    const company = await db.company.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Validate cityId if provided
    if (body.cityId) {
      const city = await db.city.findUnique({ where: { id: String(body.cityId) }, select: { id: true } });
      if (!city) return NextResponse.json({ error: "city not found" }, { status: 400 });
    }

    // If isHeadquarters, demote existing headquarters
    if (body.isHeadquarters) {
      await db.companyBranch.updateMany({
        where: { companyId: id, isHeadquarters: true },
        data: { isHeadquarters: false },
      });
    }

    const branch = await db.companyBranch.create({
      data: {
        companyId: id,
        name: String(body.name).trim(),
        address: body.address ?? null,
        cityId: body.cityId || null,
        phone: body.phone ?? null,
        isHeadquarters: !!body.isHeadquarters,
        active: body.active !== false,
      },
    });

    await logAudit({
      actorType: "ADMIN",
      action: "company.branch.create",
      entityType: "CompanyBranch",
      entityId: branch.id,
      after: { companyId: id, name: branch.name, isHeadquarters: branch.isHeadquarters },
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: `Branch created for company "${company.name}"`,
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
