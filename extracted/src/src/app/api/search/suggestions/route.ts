import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/search/suggestions?q=X
 *
 * Returns autocomplete suggestions for the search box.
 * Searches across: brands, categories, and recent popular search queries.
 *
 * Per HEAVIX Master Execution Plan V2.0 Phase 4D.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const limit = Math.min(10, Math.max(1, Number(url.searchParams.get("limit")) || 5));

    if (!q || q.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Persian normalization
    const normalized = q
      .replace(/ي/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/\u200c/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Search brands (by name + nameEn + aliases)
    const [brands, categories, recentQueries] = await Promise.all([
      db.brand.findMany({
        where: {
          active: true,
          OR: [
            { name: { contains: normalized } },
            { nameEn: { contains: normalized, mode: "insensitive" } },
            { slug: { contains: normalized.toLowerCase() } },
            { aliases: { some: { name: { contains: normalized } } } },
          ],
        },
        select: { id: true, name: true, nameEn: true, slug: true },
        take: limit,
      }),
      db.category.findMany({
        where: {
          active: true,
          OR: [
            { name: { contains: normalized } },
            { nameEn: { contains: normalized, mode: "insensitive" } },
            { slug: { contains: normalized.toLowerCase() } },
          ],
        },
        select: { id: true, name: true, slug: true },
        take: limit,
      }),
      db.searchQuery.findMany({
        where: {
          query: { contains: normalized },
          hasResults: true,
        },
        select: { query: true, resultCount: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      }).catch(() => []),
    ]);

    const suggestions = [
      ...brands.map(b => ({
        type: "brand",
        id: b.id,
        label: b.name,
        sublabel: b.nameEn || undefined,
        slug: b.slug,
      })),
      ...categories.map(c => ({
        type: "category",
        id: c.id,
        label: c.name,
        slug: c.slug,
      })),
      ...recentQueries.map(sq => ({
        type: "recent",
        label: sq.query,
        sublabel: `${sq.resultCount} نتیجه`,
      })),
    ].slice(0, limit * 2);

    return NextResponse.json({ suggestions, q: normalized });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
