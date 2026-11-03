import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/attributes — PUBLIC

   Returns all AttributeDefinitions with their options and
   category links.

   Query params (all optional, combinable):
   - ?category=SLUG  →  only attrs linked to that category
                       (link-level overrides merged INTO the
                       attribute shape: required, filterable,
                       searchable, sortable, displayOrder)
   - ?filterable=true  → only attrs where filterable is true
                         (or link.filterable=true when ?category
                         is also passed)
   - ?aiRelevant=true  → only attrs where aiRelevant=true
   - ?searchable=true  → only attrs where searchable=true

   Public.
   ============================================================ */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const categorySlug = (url.searchParams.get("category") ?? "").trim();
    const filterable = url.searchParams.get("filterable") === "true";
    const aiRelevant = url.searchParams.get("aiRelevant") === "true";
    const searchable = url.searchParams.get("searchable") === "true";

    // ── Branch A: category-scoped query (uses CategoryAttribute) ──
    if (categorySlug) {
      const category = await db.category.findUnique({
        where: { slug: categorySlug },
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

      // Merge link-level overrides into the attribute shape
      let rows = links.map((l) => ({
        id: l.attribute.id,
        key: l.attribute.key,
        name: l.attribute.name,
        nameEn: l.attribute.nameEn,
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
        // attribute-level flags (informational)
        visibleOnCard: l.attribute.visibleOnCard,
        visibleOnDetail: l.attribute.visibleOnDetail,
        seoRelevant: l.attribute.seoRelevant,
        aiRelevant: l.attribute.aiRelevant,
        sortOrder: l.attribute.sortOrder,
        options: l.attribute.options.map((o) => ({
          id: o.id,
          value: o.value,
          label: o.label,
          sortOrder: o.sortOrder,
        })),
      }));

      if (filterable) rows = rows.filter((r) => r.filterable);
      if (searchable) rows = rows.filter((r) => r.searchable);
      if (aiRelevant) rows = rows.filter((r) => r.aiRelevant);

      return NextResponse.json({ attributes: rows });
    }

    // ── Branch B: global query (no category filter) ──
    const where: any = {};
    if (filterable) where.filterable = true;
    if (searchable) where.searchable = true;
    if (aiRelevant) where.aiRelevant = true;

    const attrs = await db.attributeDefinition.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        options: {
          orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    const rows = attrs.map((a) => ({
      id: a.id,
      key: a.key,
      name: a.name,
      nameEn: a.nameEn,
      labelFa: a.labelFa ?? a.name,
      labelEn: a.labelEn ?? a.nameEn ?? null,
      type: a.type,
      unit: a.unit,
      required: a.required,
      filterable: a.filterable,
      searchable: a.searchable,
      sortable: a.sortable,
      visibleOnCard: a.visibleOnCard,
      visibleOnDetail: a.visibleOnDetail,
      seoRelevant: a.seoRelevant,
      aiRelevant: a.aiRelevant,
      sortOrder: a.sortOrder,
      options: a.options.map((o) => ({
        id: o.id,
        value: o.value,
        label: o.label,
        sortOrder: o.sortOrder,
      })),
      categories: a.categories.map((l) => ({
        id: l.id,
        categoryId: l.categoryId,
        category: l.category,
        required: l.required,
        filterable: l.filterable,
        searchable: l.searchable,
        sortable: l.sortable,
        displayOrder: l.displayOrder,
      })),
    }));

    return NextResponse.json({ attributes: rows });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ============================================================
   POST /api/attributes — ADMIN create new AttributeDefinition.

   Body:
   {
     key, labelFa, labelEn, type, unit?,
     required?, filterable?, searchable?, sortable?,
     visibleOnCard?, visibleOnDetail?, seoRelevant?, aiRelevant?,
     sortOrder?,
     options?: [{ value, label?, sortOrder? }]
   }

   Returns: { ok: true, attribute }
   ============================================================ */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));

    if (!body.type || !body.labelFa) {
      return NextResponse.json(
        { error: "type and labelFa are required" },
        { status: 400 },
      );
    }

    // key uniqueness check (if provided)
    if (body.key) {
      const dup = await db.attributeDefinition.findUnique({
        where: { key: String(body.key) },
      });
      if (dup) {
        return NextResponse.json(
          { error: "key already exists" },
          { status: 409 },
        );
      }
    }

    const optionsData = Array.isArray(body.options)
      ? body.options
          .filter((o: any) => o && String(o.value ?? "").trim() !== "")
          .map((o: any, idx: number) => ({
            value: String(o.value),
            label: o.label ? String(o.label) : null,
            sortOrder: Number(o.sortOrder) || idx,
          }))
      : [];

    const attribute = await db.attributeDefinition.create({
      data: {
        key: body.key ? String(body.key) : null,
        name: String(body.labelFa), // legacy compat
        nameEn: body.labelEn ? String(body.labelEn) : null,
        labelFa: String(body.labelFa),
        labelEn: body.labelEn ? String(body.labelEn) : null,
        type: String(body.type),
        unit: body.unit ? String(body.unit) : null,
        required: body.required === true,
        filterable: body.filterable === true,
        searchable: body.searchable === true,
        sortable: body.sortable === true,
        visibleOnCard: body.visibleOnCard === true,
        visibleOnDetail: body.visibleOnDetail !== false, // default true
        seoRelevant: body.seoRelevant === true,
        aiRelevant: body.aiRelevant === true,
        sortOrder: Number(body.sortOrder) || 0,
        options: optionsData.length
          ? { create: optionsData }
          : undefined,
      },
      include: {
        options: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] },
        categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
      },
    });

    return NextResponse.json({ ok: true, attribute });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
