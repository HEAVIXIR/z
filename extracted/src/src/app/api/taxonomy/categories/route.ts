import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { uniqueSlug } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/taxonomy/categories
   Query params (all optional, public):
     - layer=CATALOG|MARKETPLACE|SERVICE|FALLBACK  → filter by layer
     - root=true                                   → only level-0 categories
   Response: { categories: tree, flat: allRows }
   Each node includes: layer, taxPath, appIndustries[]
*/
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const layer = searchParams.get("layer");
    const rootOnly = searchParams.get("root") === "true";

    const where: any = { active: true };
    if (layer) where.layer = String(layer).toUpperCase();
    if (rootOnly) where.level = 0;

    const all = await db.category.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { listings: true, children: true } },
        appIndustries: {
          include: {
            applicationIndustry: {
              select: { id: true, key: true, nameFa: true, nameEn: true, icon: true },
            },
          },
        },
      },
    });

    // Build tree
    const map = new Map<string, any>();
    all.forEach((c) => {
      map.set(c.id, {
        ...c,
        appIndustries: c.appIndustries.map((ai) => ai.applicationIndustry),
        children: [] as any[],
      });
    });
    const roots: any[] = [];
    all.forEach((c) => {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return NextResponse.json({
      categories: roots,
      flat: all.map((c) => ({
        ...c,
        appIndustries: c.appIndustries.map((ai) => ai.applicationIndustry),
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/taxonomy/categories
   Create a new category (admin). Accepts all standard fields plus:
     - layer (CATALOG | MARKETPLACE | SERVICE | FALLBACK, default CATALOG)
     - taxPath (string, materialized path)
     - appIndustries: string[]  → array of ApplicationIndustry keys or IDs
   Returns { ok: true, category }.
*/
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const slug = body.slug ? await uniqueSlug(db.category, body.slug) : await uniqueSlug(db.category, body.name);

    // Determine level
    let level = 0;
    if (body.parentId) {
      const parent = await db.category.findUnique({ where: { id: String(body.parentId) } });
      if (parent) level = (parent.level ?? 0) + 1;
    }

    // Normalize layer
    const validLayers = ["CATALOG", "MARKETPLACE", "SERVICE", "FALLBACK"];
    const layer = body.layer && validLayers.includes(String(body.layer).toUpperCase())
      ? String(body.layer).toUpperCase()
      : "CATALOG";

    const category = await db.category.create({
      data: {
        name: String(body.name),
        nameEn: body.nameEn ?? null,
        slug,
        icon: body.icon ?? null,
        imageUrl: body.imageUrl ?? null,
        description: body.description ?? null,
        domain: body.domain ?? null,
        parentId: body.parentId ?? null,
        layer,
        taxPath: body.taxPath ?? null,
        featured: Boolean(body.featured),
        active: body.active !== false,
        showOnHome: body.showOnHome !== false,
        sortOrder: Number(body.sortOrder) || 0,
        level,
        ...(Array.isArray(body.appIndustries) && body.appIndustries.length > 0
          ? {
              appIndustries: {
                create: await Promise.all(
                  (body.appIndustries as string[])
                    .filter(Boolean)
                    .map(async (keyOrId) => {
                      const ai = await db.applicationIndustry.findFirst({
                        where: {
                          OR: [{ key: String(keyOrId) }, { id: String(keyOrId) }],
                        },
                      });
                      if (!ai) throw new Error(`ApplicationIndustry not found: ${keyOrId}`);
                      return { applicationIndustryId: ai.id };
                    }),
                ),
              },
            }
          : {}),
      },
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
