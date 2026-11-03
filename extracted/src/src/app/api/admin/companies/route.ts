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

/* GET /api/admin/companies — admin list with verification status +
   document/branch counts. Query:
     ?q=&status=&verified=&premium=&limit=
*/
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || undefined;
    const status = url.searchParams.get("status")?.trim() || undefined;
    const verified = url.searchParams.get("verified");
    const premium = url.searchParams.get("premium");
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 200, 1), 500);

    const where: any = {};
    if (status && ALLOWED_STATUSES.includes(status)) where.status = status;
    if (verified === "true") where.verified = true;
    if (verified === "false") where.verified = false;
    if (premium === "true") where.premium = true;
    if (premium === "false") where.premium = false;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { slug: { contains: q } },
        { description: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { city: { contains: q } },
        { province: { contains: q } },
      ];
    }

    const companies = await db.company.findMany({
      where,
      orderBy: [{ verified: "desc" }, { premium: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        _count: {
          select: {
            listings: { where: { status: "PUBLISHED" } },
            documents: true,
            branches: true,
            verifications: true,
          },
        },
        verifications: {
          orderBy: { submittedAt: "desc" },
          take: 1,
          select: { id: true, status: true, submittedAt: true, reviewedAt: true },
        },
      },
    });

    return NextResponse.json({
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        logoUrl: c.logoUrl,
        phone: c.phone,
        email: c.email,
        city: c.city,
        province: c.province,
        verified: c.verified,
        premium: c.premium,
        status: c.status,
        viewCount: c.viewCount,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        listingsCount: c._count.listings,
        documentsCount: c._count.documents,
        branchesCount: c._count.branches,
        verificationsCount: c._count.verifications,
        latestVerification: c.verifications[0]
          ? {
              id: c.verifications[0].id,
              status: c.verifications[0].status,
              submittedAt: c.verifications[0].submittedAt.toISOString(),
              reviewedAt: c.verifications[0].reviewedAt
                ? c.verifications[0].reviewedAt.toISOString()
                : null,
            }
          : null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/companies — create company. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));

    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "نام شرکت الزامی است" }, { status: 400 });
    }

    const status = ALLOWED_STATUSES.includes(String(body.status))
      ? String(body.status)
      : "ACTIVE";

    const slug = await uniqueSlug(db.company, body.slug || body.name);

    const company = await db.company.create({
      data: {
        name: String(body.name).trim(),
        slug,
        description: body.description ?? null,
        logoUrl: body.logoUrl ?? null,
        coverImage: body.coverImage ?? null,
        website: body.website ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        province: body.province ?? null,
        verified: !!body.verified,
        premium: !!body.premium,
        status,
        metaTitle: body.metaTitle ?? null,
        metaDescription: body.metaDescription ?? null,
      },
      include: {
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

    await logAudit({
      actorType: "ADMIN",
      action: "company.create",
      entityType: "Company",
      entityId: company.id,
      after: { name: company.name, slug: company.slug, status: company.status },
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: "Company created via admin UI",
    });

    return NextResponse.json({ ok: true, company });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export const _slugify = slugify;
