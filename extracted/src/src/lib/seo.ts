import { db } from "@/lib/db";
import type { SEOMetadata } from "@prisma/client";

/* ============================================================
   HEAVIX — Advanced SEO Automation (P2-28)
   HEAVIX-P0-IMPLEMENTATION-PLAN.md P2-28
   ------------------------------------------------------------
   Generic per-entity SEO row keyed by (entityType, entityId).
   Existing BrandSEO table is preserved (additive only) — this
   is the canonical SEO layer for all public entities:
   Category | Brand | Product | Listing | Article | Page.

   Public API (server-only):
     • getSEO(entityType, entityId)
     • upsertSEO(entityType, entityId, partial)
     • generateMetaTitle(entityType, entity)
     • generateMetaDescription(entityType, entity)
     • generateStructuredData(entityType, entity)  → JSON-LD string

   Auto-generators are pure fns — no DB writes, no AI calls.
   They produce deterministic, sane defaults that the admin can
   then tweak. The admin remains the canonical authority.
   ============================================================ */

const SITE_NAME = "هویکس";
const SITE_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://havix.ir";

export async function getSEO(
  entityType: string,
  entityId: string,
): Promise<SEOMetadata | null> {
  return db.sEOMetadata.findUnique({
    where: {
      entityType_entityId: { entityType, entityId },
    },
  });
}

export async function upsertSEO(
  entityType: string,
  entityId: string,
  data: Partial<
    Omit<
      SEOMetadata,
      "id" | "entityType" | "entityId" | "createdAt" | "updatedAt"
    >
  >,
): Promise<SEOMetadata> {
  // Pull only known fields (ignore id/createdAt/updatedAt/entityType/entityId
  // coming from the caller — they're the key, not patchable).
  const patch: Record<string, unknown> = {};
  const allowed = [
    "metaTitle",
    "metaDescription",
    "keywords",
    "canonicalUrl",
    "ogImage",
    "ogTitle",
    "ogDescription",
    "structuredData",
    "robotsIndex",
    "robotsFollow",
    "sitemapPriority",
    "sitemapChangeFreq",
  ];
  for (const k of allowed) {
    if (k in data) {
      patch[k] = data[k];
    }
  }
  return db.sEOMetadata.upsert({
    where: { entityType_entityId: { entityType, entityId } },
    create: { entityType, entityId, ...patch } as any,
    update: patch as any,
  });
}

/* ============================================================
   Auto-generators — pure, deterministic, no DB.
   ============================================================ */
export function generateMetaTitle(entityType: string, entity: any): string {
  const name =
    entity?.name ??
    entity?.title ??
    entity?.canonicalName ??
    entity?.slug ??
    "صفحه";
  const suffix = ` | ${SITE_NAME}`;
  // Keep under ~60 chars for SERP truncation safety.
  const base = String(name).slice(0, 60 - suffix.length);
  if (entityType === "Brand") return `${base} — برند صنعتی${suffix}`;
  if (entityType === "Category") return `${base} — خرید و فروش${suffix}`;
  if (entityType === "Listing") return `${base}${suffix}`;
  if (entityType === "Article") return `${base}${suffix}`;
  if (entityType === "Product") return `${base} — مشخصات فنی${suffix}`;
  return `${base}${suffix}`;
}

export function generateMetaDescription(
  entityType: string,
  entity: any,
): string {
  const name =
    entity?.name ?? entity?.title ?? entity?.canonicalName ?? "این صفحه";
  const desc = (entity?.description ?? entity?.excerpt ?? "").trim();
  const base =
    desc.length > 0
      ? desc.replace(/\s+/g, " ").slice(0, 150)
      : "";

  if (entityType === "Brand") {
    return (
      base ||
      `خرید و فروش ماشین‌آلات ${name} — آگهی‌های جدید و دست‌دوم، قیمت و مشخصات در مارکت‌پلیس صنعتی ${SITE_NAME}.`
    );
  }
  if (entityType === "Category") {
    return (
      base ||
      `لیست کامل آگهی‌های ${name} — خرید، فروش و اجاره ماشین‌آلات صنعتی نو و دست‌دوم با قیمت روز در ${SITE_NAME}.`
    );
  }
  if (entityType === "Listing") {
    const price = entity?.price ? ` قیمت: ${entity.price}` : "";
    const loc = entity?.province ? ` — ${entity.province}` : "";
    return (
      (base || `آگهی ${name}`) + price + loc + ` — ${SITE_NAME}.`
    ).slice(0, 160);
  }
  if (entityType === "Article") {
    return base || `مقالهٔ ${name} در پایگاه دانش ${SITE_NAME}.`;
  }
  if (entityType === "Product") {
    return base || `مشخصات فنی و کاتالوگ ${name} در ${SITE_NAME}.`;
  }
  return base || `صفحهٔ ${name} در ${SITE_NAME}.`;
}

/* ── JSON-LD structured data ──────────────────────────────── */
export function generateStructuredData(
  entityType: string,
  entity: any,
): string {
  const base = {
    "@context": "https://schema.org",
  };

  if (entityType === "Brand") {
    return JSON.stringify({
      ...base,
      "@type": "Brand",
      name: entity?.name ?? "",
      alternateName: entity?.nameEn ?? undefined,
      url: entity?.website ?? undefined,
      logo: entity?.logoUrl
        ? {
            "@type": "ImageObject",
            url: absoluteUrl(entity.logoUrl),
          }
        : undefined,
      description: entity?.description ?? undefined,
    });
  }

  if (entityType === "Category") {
    return JSON.stringify({
      ...base,
      "@type": "CollectionPage",
      name: entity?.name ?? "",
      description: entity?.description ?? undefined,
      url: `${SITE_BASE_URL}/categories/${entity?.slug ?? ""}`,
    });
  }

  if (entityType === "Listing" || entityType === "Product") {
    const price = entity?.price ? Number(entity.price) : null;
    return JSON.stringify({
      ...base,
      "@type": "Product",
      name: entity?.title ?? entity?.canonicalName ?? entity?.name ?? "",
      description:
        entity?.description ?? entity?.shortDesc ?? undefined,
      ...(entity?.brandId || entity?.brand?.name
        ? {
            brand: {
              "@type": "Brand",
              name: entity?.brand?.name ?? entity?.brandName ?? "",
            },
          }
        : {}),
      ...(entity?.slug
        ? {
            url: `${SITE_BASE_URL}/listings/${entity.slug}`,
          }
        : {}),
      ...(price && price > 0
        ? {
            offers: {
              "@type": "Offer",
              priceCurrency: "IRR",
              price: String(price),
              availability:
                entity?.status === "SOLD"
                  ? "https://schema.org/OutOfStock"
                  : "https://schema.org/InStock",
            },
          }
        : {}),
    });
  }

  if (entityType === "Article") {
    return JSON.stringify({
      ...base,
      "@type": "Article",
      headline: entity?.title ?? "",
      description: entity?.excerpt ?? undefined,
      datePublished: entity?.publishedAt ?? entity?.createdAt ?? undefined,
      ...(entity?.coverImage
        ? { image: absoluteUrl(entity.coverImage) }
        : {}),
      author: {
        "@type": "Organization",
        name: SITE_NAME,
      },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    });
  }

  // Fallback — minimal WebPage.
  return JSON.stringify({
    ...base,
    "@type": "WebPage",
    name: entity?.name ?? entity?.title ?? SITE_NAME,
    description: entity?.description ?? undefined,
  });
}

/* ── BreadcrumbList helper for nested routes ──────────────── */
export function generateBreadcrumbJsonLd(
  items: { name: string; url: string }[],
): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: absoluteUrl(it.url),
    })),
  });
}

/* ============================================================
   Entity fetchers used by the SEO admin page to populate the
   edit form + run the auto-generators.
   ============================================================ */
export async function fetchEntity(
  entityType: string,
  entityId: string,
): Promise<any | null> {
  try {
    switch (entityType) {
      case "Brand":
        return await db.brand.findUnique({ where: { id: entityId } });
      case "Category":
        return await db.category.findUnique({ where: { id: entityId } });
      case "Listing":
        return await db.listing.findUnique({
          where: { id: entityId },
          include: { brand: { select: { name: true } } },
        });
      case "Article":
        return await db.article.findUnique({ where: { id: entityId } });
      case "Product":
        return await db.product.findUnique({
          where: { id: entityId },
        });
      case "Page":
        // Page is a virtual type — return a stub.
        return { id: entityId, name: entityId, title: entityId, description: "" };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** Search entities by name (used by the admin entity picker). */
export async function searchEntities(
  entityType: string,
  q: string,
  limit = 20,
): Promise<{ id: string; label: string; slug?: string }[]> {
  const take = Math.min(50, limit);
  try {
    switch (entityType) {
      case "Brand":
        return (await db.brand.findMany({
          where: { name: { contains: q } },
          take,
          select: { id: true, name: true, slug: true },
        })) as any;
      case "Category":
        return (await db.category.findMany({
          where: { name: { contains: q } },
          take,
          select: { id: true, name: true, slug: true },
        })) as any;
      case "Listing":
        return (await db.listing.findMany({
          where: { title: { contains: q } },
          take,
          select: { id: true, title: true, slug: true },
        })) as any;
      case "Article":
        return (await db.article.findMany({
          where: { title: { contains: q } },
          take,
          select: { id: true, title: true, slug: true },
        })) as any;
      case "Product":
        return (await db.product.findMany({
          where: { canonicalName: { contains: q } },
          take,
          select: { id: true, canonicalName: true, slug: true },
        })) as any;
      default:
        return [];
    }
  } catch {
    return [];
  }
}

/* ── helpers ──────────────────────────────────────────────── */
export function absoluteUrl(maybeRelative: string): string {
  if (!maybeRelative) return SITE_BASE_URL;
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  if (maybeRelative.startsWith("//")) return `https:${maybeRelative}`;
  if (maybeRelative.startsWith("/")) return `${SITE_BASE_URL}${maybeRelative}`;
  return `${SITE_BASE_URL}/${maybeRelative}`;
}

export const SEO_ENTITY_TYPES = [
  "Category",
  "Brand",
  "Product",
  "Listing",
  "Article",
  "Page",
] as const;

export const SITEMAP_CHANGE_FREQS = [
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
] as const;
