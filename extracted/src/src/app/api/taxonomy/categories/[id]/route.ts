import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { uniqueSlug } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

const VALID_LAYERS = ["CATALOG", "MARKETPLACE", "SERVICE", "FALLBACK"];

/* GET /api/taxonomy/categories/[id] — public category detail with children.
   Used by the listing wizard's cascading picker to resolve grandchildren. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const category = await db.category.findUnique({
      where: { id },
      include: {
        children: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, nameEn: true, slug: true, icon: true, level: true },
        },
        parent: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!category) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ category });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PUT /api/taxonomy/categories/[id] — admin update.
   Now supports: layer, taxPath, appIndustries[] (replace strategy).
*/
export async function PUT(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: any = {};
    const allowed = [
      "name", "nameEn", "icon", "imageUrl", "description", "domain",
      "featured", "active", "showOnHome", "sortOrder",
    ];
    for (const k of allowed) {
      if (k in body) {
        if (k === "featured" || k === "active" || k === "showOnHome") data[k] = Boolean(body[k]);
        else if (k === "sortOrder") data[k] = Number(body[k]) || 0;
        else data[k] = body[k] === undefined ? null : body[k];
      }
    }

    // layer (validate)
    if ("layer" in body) {
      const layer = String(body.layer ?? "").toUpperCase();
      data.layer = VALID_LAYERS.includes(layer) ? layer : "CATALOG";
    }

    // taxPath (string, nullable)
    if ("taxPath" in body) {
      data.taxPath = body.taxPath == null || body.taxPath === "" ? null : String(body.taxPath);
    }

    // Re-slug if name changed and slug not provided
    if (body.name && body.name !== existing.name && !body.slug) {
      data.slug = await uniqueSlug(db.category, body.name);
    } else if (body.slug && body.slug !== existing.slug) {
      data.slug = await uniqueSlug(db.category, body.slug);
    }

    // Level sync if parent changed
    if (body.parentId !== undefined && body.parentId !== existing.parentId) {
      data.parentId = body.parentId || null;
      if (body.parentId) {
        const parent = await db.category.findUnique({ where: { id: String(body.parentId) } });
        data.level = parent ? (parent.level ?? 0) + 1 : 0;
      } else {
        data.level = 0;
      }
    }

    const category = await db.category.update({
      where: { id },
      data,
      include: {
        appIndustries: {
          include: {
            applicationIndustry: {
              select: { id: true, key: true, nameFa: true, nameEn: true, icon: true },
            },
          },
        },
      },
    });

    // Replace strategy for appIndustries[]
    if (Array.isArray(body.appIndustries)) {
      // Wipe existing links
      await db.categoryApplicationIndustry.deleteMany({
        where: { categoryId: id },
      });
      // Create new links (resolve by key or id)
      const keysOrIds = (body.appIndustries as string[]).filter(Boolean);
      if (keysOrIds.length > 0) {
        const industries = await db.applicationIndustry.findMany({
          where: {
            OR: [
              { key: { in: keysOrIds.filter((k) => !k.startsWith("c")) } },
              { id: { in: keysOrIds } },
            ],
          },
          select: { id: true },
        });
        if (industries.length > 0) {
          await db.categoryApplicationIndustry.createMany({
            data: industries.map((ai) => ({
              categoryId: id,
              applicationIndustryId: ai.id,
            })),
            skipDuplicates: true,
          });
        }
      }
      // Re-fetch with fresh relations
      const refreshed = await db.category.findUnique({
        where: { id },
        include: {
          appIndustries: {
            include: {
              applicationIndustry: {
                select: { id: true, key: true, nameFa: true, nameEn: true, icon: true },
              },
            },
          },
        },
      });
      return NextResponse.json({
        ok: true,
        category: {
          ...refreshed,
          appIndustries: refreshed?.appIndustries.map((ai) => ai.applicationIndustry) ?? [],
        },
      });
    }

    return NextResponse.json({
      ok: true,
      category: {
        ...category,
        appIndustries: category.appIndustries.map((ai) => ai.applicationIndustry),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/taxonomy/categories/[id] */
export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    // Re-parent children to null
    await db.category.updateMany({
      where: { parentId: id },
      data: { parentId: null, level: 0 },
    });
    await db.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
