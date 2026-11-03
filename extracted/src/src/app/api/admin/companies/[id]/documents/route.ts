import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_DOC_TYPES = [
  "BUSINESS_LICENSE",
  "TAX_CERT",
  "OWNERSHIP_PROOF",
  "REPRESENTATIVE_ID",
  "BANK_STATEMENT",
  "OTHER",
];

interface Args {
  params: Promise<{ id: string }>;
}

/* POST /api/admin/companies/[id]/documents — upload document (type + url).
   Body: { type, url, status? }
*/
export async function POST(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (!body.url || !String(body.url).trim()) {
      return NextResponse.json({ error: "url الزامی است" }, { status: 400 });
    }
    const type = ALLOWED_DOC_TYPES.includes(String(body.type))
      ? String(body.type)
      : "OTHER";

    const company = await db.company.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const doc = await db.companyDocument.create({
      data: {
        companyId: id,
        type,
        url: String(body.url).trim(),
        status: "PENDING",
      },
    });

    await logAudit({
      actorType: "ADMIN",
      action: "company.document.upload",
      entityType: "CompanyDocument",
      entityId: doc.id,
      after: { companyId: id, type, url: doc.url, status: doc.status },
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: `Document uploaded for company "${company.name}"`,
    });

    return NextResponse.json({ ok: true, document: doc });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* GET /api/admin/companies/[id]/documents — list documents. */
export async function GET(_req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const docs = await db.companyDocument.findMany({
      where: { companyId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      documents: docs.map((d) => ({
        ...d,
        verifiedAt: d.verifiedAt ? d.verifiedAt.toISOString() : null,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
