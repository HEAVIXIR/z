import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/taxonomy/category-attributes?categoryId=X
 *
 * Returns the full attribute schema for a given category, including:
 * - The attribute definition (key, name, type, unit, options)
 * - The category-level override (required, filterable, searchable, displayOrder)
 * - Inherited attributes from parent categories (if any)
 *
 * This is the API that powers the Dynamic Listing Form (Phase 1.6):
 *   1. User selects a category
 *   2. Frontend calls this endpoint
 *   3. Receives the list of attributes to render as form fields
 *   4. Each attribute has its type, validation, and display metadata
 *
 * Per HEAVIX Operational Execution Plan V1.0 §1.6.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const categoryId = url.searchParams.get("categoryId")?.trim();

    if (!categoryId) {
      return NextResponse.json(
        { error: "categoryId is required" },
        { status: 400 },
      );
    }

    // Verify category exists
    const category = await db.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, slug: true, parentId: true },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // Get direct category attributes
    const directAttrs = await db.categoryAttribute.findMany({
      where: { categoryId },
      include: {
        attribute: {
          include: {
            options: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    // Get inherited attributes from parent categories (walk up the tree)
    const inheritedAttrs: any[] = [];
    let parentId = category.parentId;
    const visited = new Set<string>([categoryId]);

    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parentAttrs = await db.categoryAttribute.findMany({
        where: { categoryId: parentId },
        include: {
          attribute: {
            include: {
              options: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
        orderBy: { displayOrder: "asc" },
      });

      // Only add attributes that aren't already defined at the child level
      for (const pa of parentAttrs) {
        if (!directAttrs.find(da => da.attributeId === pa.attributeId)) {
          inheritedAttrs.push({ ...pa, inherited: true });
        }
      }

      // Move up
      const parent = await db.category.findUnique({
        where: { id: parentId },
        select: { parentId: true },
      });
      parentId = parent?.parentId ?? null;
    }

    // Merge: direct attributes first, then inherited
    const allAttrs = [
      ...directAttrs.map(a => ({ ...a, inherited: false })),
      ...inheritedAttrs,
    ];

    // Format response
    const attributes = allAttrs.map(ca => ({
      id: ca.attribute.id,
      key: ca.attribute.key,
      name: ca.attribute.name,
      labelFa: ca.attribute.labelFa || ca.attribute.name,
      labelEn: ca.attribute.labelEn || ca.attribute.nameEn,
      type: ca.attribute.type,
      unit: ca.attribute.unit,
      // Category-level overrides (fall back to definition defaults)
      required: ca.required ?? ca.attribute.required,
      filterable: ca.filterable ?? ca.attribute.filterable,
      searchable: ca.searchable ?? ca.attribute.searchable,
      sortable: ca.sortable ?? ca.attribute.sortable,
      displayOrder: ca.displayOrder,
      // Definition-level metadata
      visibleOnCard: ca.attribute.visibleOnCard,
      visibleOnDetail: ca.attribute.visibleOnDetail,
      seoRelevant: ca.attribute.seoRelevant,
      aiRelevant: ca.attribute.aiRelevant,
      // Options for SELECT / MULTI_SELECT types
      options: ca.attribute.options.map((opt: any) => ({
        id: opt.id,
        label: opt.label,
        value: opt.value,
      })),
      // Source info
      inherited: ca.inherited,
      categoryAttributeId: ca.id,
    }));

    return NextResponse.json({
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      attributes,
      count: attributes.length,
    });
  } catch (err: any) {
    console.error("[taxonomy/category-attributes] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
