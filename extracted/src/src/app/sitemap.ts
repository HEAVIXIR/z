import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";

/* ============================================================
   HEAVIX — sitemap.ts (P2-28)
   HEAVIX-P0-IMPLEMENTATION-PLAN.md P2-28
   ------------------------------------------------------------
   Next.js metadata-route sitemap. Public, cached 1 hour via
   `revalidate = 3600`. Includes:
     • static pages (/, /listings, /brands, /store)
     • all active categories
     • all active brands
     • all PUBLISHED listings
     • all published articles
   Uses sitemapPriority from SEOMetadata when available.
   ============================================================ */

export const revalidate = 3600; // 1 hour
export const runtime = "nodejs";

const STATIC_PATHS: { url: string; priority: number; changeFreq: string }[] = [
  { url: "/", priority: 1.0, changeFreq: "daily" },
  { url: "/listings", priority: 0.9, changeFreq: "daily" },
  { url: "/brands", priority: 0.8, changeFreq: "weekly" },
  { url: "/store", priority: 0.7, changeFreq: "weekly" },
  { url: "/knowledge", priority: 0.6, changeFreq: "weekly" },
  { url: "/categories", priority: 0.6, changeFreq: "weekly" },
];

type SitemapRow = {
  entityType: string;
  entityId: string;
  sitemapPriority: number | null;
  sitemapChangeFreq: string | null;
  robotsIndex: boolean | null;
};

async function getSEOOverridesByType(
  entityType: string,
  entityIds: string[],
): Promise<Map<string, SitemapRow>> {
  const out = new Map<string, SitemapRow>();
  if (entityIds.length === 0) return out;
  try {
    const rows = await db.sEOMetadata.findMany({
      where: { entityType, entityId: { in: entityIds } },
      select: {
        entityId: true,
        sitemapPriority: true,
        sitemapChangeFreq: true,
        robotsIndex: true,
      },
    });
    for (const r of rows) {
      out.set(r.entityId, {
        entityType,
        entityId: r.entityId,
        sitemapPriority: r.sitemapPriority,
        sitemapChangeFreq: r.sitemapChangeFreq,
        robotsIndex: r.robotsIndex,
      });
    }
  } catch {
    /* ignore — fall back to defaults */
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://havix.ir";

  // Fetch all public entities in parallel.
  const [categories, brands, listings, articles] = await Promise.all([
    db.category
      .findMany({
        where: { active: true },
        select: { id: true, slug: true, updatedAt: true },
      })
      .catch(() => []),
    db.brand
      .findMany({
        where: { active: true },
        select: { id: true, slug: true, updatedAt: true },
      })
      .catch(() => []),
    db.listing
      .findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, slug: true, updatedAt: true },
      })
      .catch(() => []),
    db.article
      .findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, slug: true, updatedAt: true, publishedAt: true },
      })
      .catch(() => []),
  ]);

  // Fetch SEO overrides in parallel.
  const [catSEO, brandSEO, listingSEO, articleSEO] = await Promise.all([
    getSEOOverridesByType("Category", categories.map((c) => c.id)),
    getSEOOverridesByType("Brand", brands.map((b) => b.id)),
    getSEOOverridesByType("Listing", listings.map((l) => l.id)),
    getSEOOverridesByType("Article", articles.map((a) => a.id)),
  ]);

  const out: MetadataRoute.Sitemap = [];

  // Static pages
  for (const p of STATIC_PATHS) {
    out.push({
      url: absoluteUrl(p.url),
      lastModified: new Date(),
      changeFrequency: p.changeFreq as any,
      priority: p.priority,
    });
  }

  // Categories
  for (const c of categories) {
    const seo = catSEO.get(c.id);
    if (seo?.robotsIndex === false) continue; // honor robots noindex
    out.push({
      url: `${base}/categories/${c.slug}`,
      lastModified: c.updatedAt ?? new Date(),
      changeFrequency: (seo?.sitemapChangeFreq ?? "weekly") as any,
      priority: seo?.sitemapPriority ?? 0.6,
    });
  }

  // Brands
  for (const b of brands) {
    const seo = brandSEO.get(b.id);
    if (seo?.robotsIndex === false) continue;
    out.push({
      url: `${base}/brands/${b.slug}`,
      lastModified: b.updatedAt ?? new Date(),
      changeFrequency: (seo?.sitemapChangeFreq ?? "weekly") as any,
      priority: seo?.sitemapPriority ?? 0.6,
    });
  }

  // Listings
  for (const l of listings) {
    const seo = listingSEO.get(l.id);
    if (seo?.robotsIndex === false) continue;
    out.push({
      url: `${base}/listings/${l.slug}`,
      lastModified: l.updatedAt ?? new Date(),
      changeFrequency: (seo?.sitemapChangeFreq ?? "weekly") as any,
      priority: seo?.sitemapPriority ?? 0.7,
    });
  }

  // Articles
  for (const a of articles) {
    const seo = articleSEO.get(a.id);
    if (seo?.robotsIndex === false) continue;
    out.push({
      url: `${base}/knowledge/${a.slug}`,
      lastModified: a.publishedAt ?? a.updatedAt ?? new Date(),
      changeFrequency: (seo?.sitemapChangeFreq ?? "monthly") as any,
      priority: seo?.sitemapPriority ?? 0.5,
    });
  }

  return out;
}
