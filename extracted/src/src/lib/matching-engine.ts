import { db } from "@/lib/db";

/* ============================================================
   HEAVIX — Matching Engine (Phase 7D)
   Per HEAVIX Master Execution Plan V3.0 Phase 7D.
   
   Scores BuyRequest ↔ Listing compatibility using:
   - Category compatibility (0.30)
   - Brand compatibility (0.25)
   - Price range fit (0.25)
   - Location compatibility (0.10)
   - Condition compatibility (0.10)
   
   Returns scored matches with human-readable reasons.
   ============================================================ */

export interface MatchResult {
  listingId: string;
  listingTitle: string;
  score: number; // 0..100
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  listingPrice: string | null;
  listingBrand: string | null;
  listingCity: string | null;
}

export interface MatchingOptions {
  limit?: number;
  minScore?: number;
}

/**
 * Match a BuyRequest against all PUBLISHED listings.
 * Returns scored results sorted by score descending.
 */
export async function matchRequestToListings(
  requestId: string,
  options: MatchingOptions = {},
): Promise<MatchResult[]> {
  const { limit = 10, minScore = 10 } = options;

  // Load the BuyRequest
  const request = await db.buyRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.status !== "ACTIVE") {
    return [];
  }

  // Load all published listings with relations
  const listings = await db.listing.findMany({
    where: { status: "PUBLISHED" },
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
    take: 200, // safety cap
  });

  const results: MatchResult[] = [];

  for (const listing of listings) {
    const reasons: string[] = [];
    let score = 0;

    // 1. Category match (0.30 = 30 points)
    if (request.category && listing.category?.name) {
      if (request.category === listing.category.name) {
        score += 30;
        reasons.push("category_match");
      } else if (listing.category.name.includes(request.category) || request.category.includes(listing.category.name)) {
        score += 15;
        reasons.push("category_partial");
      }
    }

    // 2. Brand match (0.25 = 25 points)
    if (request.brandPref && listing.brand?.name) {
      if (request.brandPref === listing.brand.name) {
        score += 25;
        reasons.push("brand_match");
      } else if (
        listing.brand.name.includes(request.brandPref) ||
        request.brandPref.includes(listing.brand.name)
      ) {
        score += 12;
        reasons.push("brand_partial");
      }
    }

    // 3. Price range fit (0.25 = 25 points)
    if (request.budgetMin && request.budgetMax && listing.price) {
      const price = Number(listing.price);
      const min = Number(request.budgetMin);
      const max = Number(request.budgetMax);
      if (price >= min && price <= max) {
        score += 25;
        reasons.push("price_in_range");
      } else if (price >= min * 0.9 && price <= max * 1.1) {
        score += 12;
        reasons.push("price_near_range");
      }
    }

    // 4. Location match (city / province) (0.10 = 10 points)
    if (request.city && listing.city) {
      if (request.city === listing.city) {
        score += 10;
        reasons.push("city_match");
      } else if (request.province && listing.province && request.province === listing.province) {
        score += 5;
        reasons.push("province_match");
      }
    } else if (request.province && listing.province && request.province === listing.province) {
      score += 5;
      reasons.push("province_match");
    }

    // 5. Transaction type match (0.10 = 10 points)
    if (request.transaction && listing.listingType) {
      if (request.transaction === listing.listingType) {
        score += 10;
        reasons.push("transaction_match");
      }
    }

    if (score >= minScore) {
      results.push({
        listingId: listing.id,
        listingTitle: listing.title,
        score: Math.round(score),
        confidence: score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW",
        reasons,
        listingPrice: listing.price ? listing.price.toString() : null,
        listingBrand: listing.brand?.name ?? null,
        listingCity: listing.city ?? null,
      });
    }
  }

  // Sort by score descending and take top N
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Run matching for all active BuyRequests.
 */
export async function matchAllRequests(): Promise<{
  totalRequests: number;
  totalMatches: number;
  errors: string[];
}> {
  const activeRequests = await db.buyRequest.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  let totalMatches = 0;
  const errors: string[] = [];

  for (const req of activeRequests) {
    try {
      const matches = await matchRequestToListings(req.id, { limit: 10, minScore: 10 });
      totalMatches += matches.length;
    } catch (e: any) {
      errors.push(`${req.id}: ${e?.message}`);
    }
  }

  return {
    totalRequests: activeRequests.length,
    totalMatches,
    errors,
  };
}
