import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

const ALLOWED_STATUSES = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "INACTIVE", "ARCHIVED"];
const ALLOWED_SOURCES = ["MANUAL", "AI_SUGGESTED", "IMPORTED"];

/* GET /api/admin/products/[id] — admin detail. */
export async function GET(_req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      include: {
        brand: { select: { id: true, name: true, nameEn: true, slug: true } },
        category: { select: { id: true, name: true, slug: true, domain: true, layer: true } },
        model: { select: { id: true, name: true, nameEn: true, slug: true } },
        machines: { orderBy: { createdAt: "desc" }, take: 50 },
        parts: { orderBy: { createdAt: "desc" }, take: 50 },
        attachments: { orderBy: { createdAt: "desc" }, take: 50 },
        listings: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true, slug: true, title: true, price: true, status: true,
            province: true, city: true, publishedAt: true,
          },
        },
        _count: {
          select: { listings: true, machines: true, parts: true, attachments: true },
        },
      },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      product: {
        ...product,
        listingsCount: product._count.listings,
        machinesCount: product._count.machines,
        partsCount: product._count.parts,
        attachmentsCount: product._count.attachments,
        _count: undefined,
        listings: product.listings.map((l) => ({
          ...l,
          price: l.price ? l.price.toString() : null,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/admin/products/[id] — admin update. */
export async function PATCH(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: any = {};
    const allowed = [
      "canonicalName", "description", "brandId", "modelId", "categoryId",
      "sortOrder", "verifiedBy",
    ];
    for (const k of allowed) {
      if (k in body) {
        if (k === "sortOrder") data[k] = Number(body[k]) || 0;
        else if (k === "brandId" || k === "modelId") {
          data[k] = body[k] === null || body[k] === "" ? null : String(body[k]);
        } else if (k === "categoryId") {
          data[k] = body[k] === null || body[k] === "" ? null : String(body[k]);
        } else {
          data[k] = body[k] === undefined ? null : body[k];
        }
      }
    }
    if ("status" in body && ALLOWED_STATUSES.includes(String(body.status))) {
      data.status = String(body.status);
    }
    if ("source" in body) {
      data.source =
        body.source && ALLOWED_SOURCES.includes(String(body.source))
          ? String(body.source)
          : null;
    }
    if ("confidence" in body) {
      data.confidence =
        body.confidence === null || body.confidence === ""
          ? null
          : Number(body.confidence);
    }
    if ("verifiedAt" in body) {
      data.verifiedAt = body.verifiedAt ? new Date(body.verifiedAt) : null;
    }
    if (body.slug && body.slug !== existing.slug) {
      data.slug = await uniqueSlug(db.product, body.slug);
    } else if (
      body.canonicalName &&
      body.canonicalName !== existing.canonicalName &&
      !body.slug
    ) {
      // Don't auto-change slug on rename (could break URLs); only if explicitly requested.
    }

    const product = await db.product.update({
      where: { id },
      data,
      include: {
        brand: { select: { id: true, name: true, nameEn: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        model: { select: { id: true, name: true, nameEn: true } },
      },
    });
    return NextResponse.json({ ok: true, product });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/admin/products/[id] — admin delete. */
export async function DELETE(_req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await db.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

// Re-export for tooling
export const _slugify = slugify;
