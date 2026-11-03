import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/taxonomy/tree — public 3-level category tree with listing counts. */
export async function GET() {
  try {
    const all = await db.category.findMany({
      where: { active: true, level: { lte: 2 } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { listings: true } },
      },
    });
    const map = new Map<string, any>();
    all.forEach((c) =>
      map.set(c.id, {
        id: c.id,
        name: c.name,
        nameEn: c.nameEn,
        slug: c.slug,
        icon: c.icon,
        imageUrl: c.imageUrl,
        level: c.level,
        listingsCount: c._count.listings,
        children: [] as any[],
      }),
    );
    const roots: any[] = [];
    all.forEach((c) => {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(node);
      } else if (c.level === 0) {
        roots.push(node);
      }
    });
    return NextResponse.json({ tree: roots });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
