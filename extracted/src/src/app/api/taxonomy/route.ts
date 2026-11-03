import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/taxonomy — unified public Taxonomy V1.2 endpoint.

   Returns the full taxonomy structure for the frontend:
   {
     catalogRoots:       [{ id, name, slug, icon, children: [...] }]  // layer=CATALOG
     marketplaceRoots:   [...]   // layer=MARKETPLACE
     serviceRoots:       [...]   // layer=SERVICE
     transactionTypes:   [...]   // from TransactionType
     serviceTypes:       [...]   // from ServiceType
     applicationIndustries: [...] // 16 industries
   }

   Public, cached in-memory for 5 minutes (TTL).
   Roots include their direct children (level 1) for navigation dropdowns.

   V1.2: For the `machinery` CATALOG root ONLY, each L1 child also carries
   its own `children` array (the L2 families — e.g. بیل مکانیکی, لودر, بولدوزر
   under راهسازی). Other roots remain flat (1 level deep) to keep the
   response small. Required by the public mega-menu per HEAVIX-REQUIREMENTS §1.
   ============================================================ */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CachedShape = {
  data: Awaited<ReturnType<typeof buildPayload>>;
  expiresAt: number;
};

let cache: CachedShape | null = null;

async function buildPayload() {
  const [
    categories,
    transactionTypes,
    serviceTypes,
    applicationIndustries,
  ] = await Promise.all([
    db.category.findMany({
      where: { active: true, level: { lte: 2 } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        icon: true,
        imageUrl: true,
        layer: true,
        level: true,
        parentId: true,
        sortOrder: true,
      },
    }),
    db.transactionType.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
      select: {
        id: true,
        key: true,
        nameFa: true,
        nameEn: true,
        description: true,
        icon: true,
        sortOrder: true,
      },
    }),
    db.serviceType.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
      select: {
        id: true,
        key: true,
        nameFa: true,
        nameEn: true,
        description: true,
        icon: true,
        sortOrder: true,
      },
    }),
    db.applicationIndustry.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
      select: {
        id: true,
        key: true,
        nameFa: true,
        nameEn: true,
        icon: true,
        sortOrder: true,
      },
    }),
  ]);

  // Build children map. Fetching levels 0,1,2 lets us attach L2 grandchildren
  // to the machinery root's L1 children in the response (see byLayer below).
  // Other roots stay flat (1 level deep) to keep the payload small.
  type CatNode = {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    icon: string | null;
    imageUrl: string | null;
    layer: string;
    level: number;
    sortOrder: number;
    children: CatNode[];
  };

  const nodes = new Map<string, CatNode>();
  categories.forEach((c) =>
    nodes.set(c.id, {
      id: c.id,
      name: c.name,
      nameEn: c.nameEn,
      slug: c.slug,
      icon: c.icon,
      imageUrl: c.imageUrl,
      layer: c.layer,
      level: c.level,
      sortOrder: c.sortOrder,
      children: [],
    }),
  );

  const roots: CatNode[] = [];
  categories.forEach((c) => {
    const node = nodes.get(c.id)!;
    if (c.parentId && nodes.has(c.parentId)) {
      // Push the full node (which carries its own children) so we can later
      // surface L2 grandchildren for the machinery root.
      nodes.get(c.parentId)!.children.push(node);
    } else if (c.level === 0) {
      roots.push(node);
    }
  });

  // Build a flat child payload. When `withGrandchildren` is true, the L2
  // grandchildren are attached under each child (used for machinery only).
  const toChild = (n: CatNode, withGrandchildren: boolean) => {
    const base: {
      id: string;
      name: string;
      nameEn: string | null;
      slug: string;
      icon: string | null;
      children?: Array<{
        id: string;
        name: string;
        nameEn: string | null;
        slug: string;
        icon: string | null;
      }>;
    } = {
      id: n.id,
      name: n.name,
      nameEn: n.nameEn,
      slug: n.slug,
      icon: n.icon,
    };
    if (withGrandchildren && n.children.length > 0) {
      base.children = n.children.map((gc) => ({
        id: gc.id,
        name: gc.name,
        nameEn: gc.nameEn,
        slug: gc.slug,
        icon: gc.icon,
      }));
    }
    return base;
  };

  const byLayer = (layer: string) =>
    roots
      .filter((r) => r.layer === layer)
      .map((r) => {
        // V1.2: only the machinery root exposes L2 grandchildren.
        const isMachinery = r.slug === "machinery";
        return {
          id: r.id,
          name: r.name,
          nameEn: r.nameEn,
          slug: r.slug,
          icon: r.icon,
          imageUrl: r.imageUrl,
          sortOrder: r.sortOrder,
          children: r.children.map((ch) => toChild(ch, isMachinery)),
        };
      });

  return {
    catalogRoots: byLayer("CATALOG"),
    marketplaceRoots: byLayer("MARKETPLACE"),
    serviceRoots: byLayer("SERVICE"),
    transactionTypes: transactionTypes.map((t) => ({
      id: t.id,
      key: t.key,
      nameFa: t.nameFa,
      nameEn: t.nameEn,
      description: t.description,
      icon: t.icon,
      sortOrder: t.sortOrder,
    })),
    serviceTypes: serviceTypes.map((t) => ({
      id: t.id,
      key: t.key,
      nameFa: t.nameFa,
      nameEn: t.nameEn,
      description: t.description,
      icon: t.icon,
      sortOrder: t.sortOrder,
    })),
    applicationIndustries: applicationIndustries.map((i) => ({
      id: i.id,
      key: i.key,
      nameFa: i.nameFa,
      nameEn: i.nameEn,
      icon: i.icon,
      sortOrder: i.sortOrder,
    })),
    // Convenience: FALLBACK layer (categories that don't fit a specific layer)
    fallbackRoots: byLayer("FALLBACK"),
  };
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && cache.expiresAt > now) {
      return NextResponse.json(cache.data);
    }
    const data = await buildPayload();
    cache = { data, expiresAt: now + CACHE_TTL_MS };
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
