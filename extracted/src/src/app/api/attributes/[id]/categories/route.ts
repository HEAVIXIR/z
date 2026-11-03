import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

/* ============================================================
   POST /api/attributes/[id]/categories — ADMIN link attribute
   to a category with link-level overrides.

   Body:
   {
     categoryId: string,
     required?: boolean,
     filterable?: boolean,
     searchable?: boolean,
     sortable?: boolean,
     displayOrder?: number
   }

   If the link already exists (categoryId+attributeId unique),
   returns 409. Use PATCH on the link instead.

   Returns: { ok: true, link }
   ============================================================ */
export async function POST(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (!body.categoryId) {
      return NextResponse.json(
        { error: "categoryId is required" },
        { status: 400 },
      );
    }

    const [attribute, category] = await Promise.all([
      db.attributeDefinition.findUnique({ where: { id }, select: { id: true } }),
      db.category.findUnique({
        where: { id: String(body.categoryId) },
        select: { id: true },
      }),
    ]);
    if (!attribute) {
      return NextResponse.json({ error: "Attribute not found" }, { status: 404 });
    }
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const existing = await db.categoryAttribute.findUnique({
      where: {
        categoryId_attributeId: {
          categoryId: category.id,
          attributeId: id,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Link already exists", link: existing },
        { status: 409 },
      );
    }

    const link = await db.categoryAttribute.create({
      data: {
        categoryId: category.id,
        attributeId: id,
        required: body.required === true,
        filterable: body.filterable === true,
        searchable: body.searchable === true,
        sortable: body.sortable === true,
        displayOrder: Number(body.displayOrder) || 0,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({ ok: true, link });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ============================================================
   DELETE /api/attributes/[id]/categories?categoryId=... — ADMIN
   unlink an attribute from a category.

   Returns: { ok: true }
   ============================================================ */
export async function DELETE(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const categoryId = (url.searchParams.get("categoryId") ?? "").trim();
    const linkId = (url.searchParams.get("linkId") ?? "").trim();

    if (categoryId) {
      await db.categoryAttribute.deleteMany({
        where: { attributeId: id, categoryId },
      });
    } else if (linkId) {
      await db.categoryAttribute.deleteMany({
        where: { id: linkId, attributeId: id },
      });
    } else {
      return NextResponse.json(
        { error: "categoryId or linkId query param is required" },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
