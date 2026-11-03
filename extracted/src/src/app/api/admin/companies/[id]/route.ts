import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["ACTIVE", "PENDING", "SUSPENDED", "ARCHIVED"];

interface Args {
  params: Promise<{ id: string }>;
}

/* GET /api/admin/companies/[id] — full detail with documents + branches
   + verifications (timeline) + recent listings. */
export async function GET(_req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const company = await db.company.findUnique({
      where: { id },
      include: {
        documents: { orderBy: { createdAt: "desc" } },
        branches: {
          orderBy: [{ isHeadquarters: "desc" }, { createdAt: "desc" }],
          include: { city: { select: { id: true, name: true, province: { select: { name: true } } } } },
        },
        verifications: { orderBy: { submittedAt: "desc" } },
        listings: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true, slug: true, title: true, price: true, status: true,
            province: true, city: true, publishedAt: true, featured: true,
          },
        },
        _count: {
          select: {
            listings: true,
            documents: true,
            branches: true,
            verifications: true,
          },
        },
      },
    });
    if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      company: {
        ...company,
        listingsCount: company._count.listings,
        documentsCount: company._count.documents,
        branchesCount: company._count.branches,
        verificationsCount: company._count.verifications,
        _count: undefined,
        listings: company.listings.map((l) => ({
          ...l,
          price: l.price ? l.price.toString() : null,
        })),
        verifications: company.verifications.map((v) => ({
          ...v,
          submittedAt: v.submittedAt.toISOString(),
          reviewedAt: v.reviewedAt ? v.reviewedAt.toISOString() : null,
        })),
        documents: company.documents.map((d) => ({
          ...d,
          verifiedAt: d.verifiedAt ? d.verifiedAt.toISOString() : null,
          createdAt: d.createdAt.toISOString(),
        })),
        branches: company.branches.map((b) => ({
          ...b,
          createdAt: b.createdAt.toISOString(),
        })),
        createdAt: company.createdAt.toISOString(),
        updatedAt: company.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/admin/companies/[id] — update company + verify status. */
export async function PATCH(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const existing = await db.company.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: any = {};
    const allowed = [
      "name", "description", "logoUrl", "coverImage", "website",
      "phone", "email", "address", "city", "province",
      "metaTitle", "metaDescription",
    ];
    for (const k of allowed) {
      if (k in body) {
        data[k] = body[k] === undefined ? null : body[k];
      }
    }
    if ("verified" in body) data.verified = !!body.verified;
    if ("premium" in body) data.premium = !!body.premium;
    if ("status" in body && ALLOWED_STATUSES.includes(String(body.status))) {
      data.status = String(body.status);
    }
    if (body.slug && body.slug !== existing.slug) {
      data.slug = await uniqueSlug(db.company, body.slug);
    }

    const company = await db.company.update({
      where: { id },
      data,
      include: {
        _count: { select: { listings: true, documents: true, branches: true, verifications: true } },
      },
    });

    await logAudit({
      actorType: "ADMIN",
      action: "company.update",
      entityType: "Company",
      entityId: id,
      before: existing,
      after: data,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: "Company updated via admin UI",
    });

    return NextResponse.json({ ok: true, company });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/admin/companies/[id] — admin delete (cascade). */
export async function DELETE(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.company.findUnique({ where: { id }, select: { id: true, name: true, slug: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.company.delete({ where: { id } });

    await logAudit({
      actorType: "ADMIN",
      action: "company.delete",
      entityType: "Company",
      entityId: id,
      before: existing,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: "Company deleted via admin UI",
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export const _slugify = slugify;
