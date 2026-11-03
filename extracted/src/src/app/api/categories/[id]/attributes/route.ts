import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/categories/[id]/attributes — PUBLIC

   Returns all attributes linked to a category (via
   CategoryAttribute) with the AttributeDefinition + options +
   link-level overrides MERGED into the response. This is the
   endpoint the dynamic listing form uses.

   The link-level overrides (required, filterable, searchable,
   sortable, displayOrder) take precedence over the
   attribute-level defaults.

   Response shape:
   {
     attributes: [{
       id, key, labelFa, labelEn, type, unit,
       required, filterable, searchable, sortable,
       visibleOnCard, visibleOnDetail,
       displayOrder,
       options: [{ id, value, label }]
     }]
   }
   ============================================================ */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Accept either the category id or its slug for convenience.
    const category = await db.category.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const links = await db.categoryAttribute.findMany({
      where: { categoryId: category.id },
      orderBy: [
        { displayOrder: "asc" },
        { attribute: { sortOrder: "asc" } },
        { attribute: { name: "asc" } },
      ],
      include: {
        attribute: {
          include: {
            options: {
              orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
            },
          },
        },
      },
    });

    const attributes = links.map((l) => ({
      id: l.attribute.id,
      key: l.attribute.key,
      labelFa: l.attribute.labelFa ?? l.attribute.name,
      labelEn: l.attribute.labelEn ?? l.attribute.nameEn ?? null,
      type: l.attribute.type,
      unit: l.attribute.unit,
      // link-level overrides win
      required: l.required,
      filterable: l.filterable,
      searchable: l.searchable,
      sortable: l.sortable,
      displayOrder: l.displayOrder,
      // attribute-level display flags (no link override)
      visibleOnCard: l.attribute.visibleOnCard,
      visibleOnDetail: l.attribute.visibleOnDetail,
      options: l.attribute.options.map((o) => ({
        id: o.id,
        value: o.value,
        label: o.label,
      })),
    }));

    return NextResponse.json({ attributes });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
