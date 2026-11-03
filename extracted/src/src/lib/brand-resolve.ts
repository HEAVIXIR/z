import { db } from "@/lib/db";
import { normalizeAliasValue } from "./brand-alias";

/**
 * Alias-aware brand resolution for the public site.
 *
 * 1. Try a direct slug match (fast path — indexed unique).
 * 2. If no hit, normalize the slug with `normalizeAliasValue` and look it up
 *    against BrandAlias.normalizedValue (also indexed).
 *
 * Returns the brand (with the same relation shape in both branches) or null.
 */
export async function resolveBrandBySlugOrAlias(slug: string) {
  // 1. Direct slug hit (covers the common case + ASCII slugs).
  const direct = await db.brand.findUnique({
    where: { slug },
    include: {
      aliases: true,
      industries: true,
      brandFamily: true,
      parentBrand: { select: { id: true, name: true, slug: true } },
      childBrands: { select: { id: true, name: true, slug: true } },
    },
  });
  if (direct) return direct;

  // 2. Alias hit (covers Persian display names, alt spellings, common typos).
  const norm = normalizeAliasValue(slug);
  if (!norm) return null;

  const alias = await db.brandAlias.findFirst({
    where: { normalizedValue: norm },
    include: {
      brand: {
        include: {
          aliases: true,
          industries: true,
          brandFamily: true,
          parentBrand: { select: { id: true, name: true, slug: true } },
          childBrands: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  return alias?.brand ?? null;
}
