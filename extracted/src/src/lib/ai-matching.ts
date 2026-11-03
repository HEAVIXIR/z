import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/* ============================================================
   HEAVIX — AI Matching: BuyRequest ↔ Listing (FIX-GAPS-1)
   ------------------------------------------------------------
   matchRequestToListings(requestId)
     • Load the BuyRequest (title, description, category, brandPref,
       budgetMin/Max, city, province).
     • Load all PUBLISHED listings (with brand + category relations).
     • Score each candidate 0..1 using a small transparent rubric:
         - category match   (0.40)  BuyRequest.category == Listing.category.name
                                    (case-insensitive trim; both null = 0)
         - price range fit  (0.30)  listing.price ∈ [budgetMin, budgetMax]
                                    full 0.30 inside; linear taper to 0
                                    within ±25% outside the band; 0 if no
                                    budget on the request or price on listing.
         - brand match      (0.20)  BuyRequest.brandPref == Listing.brand.name
                                    (case-insensitive trim; +0.10 partial
                                    contains for Persian noise resilience,
                                    capped at 0.20)
         - location match   (0.10)  BuyRequest.city == Listing.city (0.10)
                                    else province == province (0.05)
     • Return top 10 matches by score (>= 0.10), each with a Persian
       human-readable `reason` summarizing which signals fired.

   matchAllRequests()
     • Run matching for every ACTIVE BuyRequest.
     • Per-request failures are caught — one bad request never aborts
       the batch. Returns aggregate counts.
     • Writes a single batched AuditLog entry (action="matching.run",
       actorType="SYSTEM") with the by-request breakdown.

   z-ai-web-dev-sdk is NOT used here — the rubric is deterministic
   (it's "AI matching" in the product sense: automated relevance
   scoring, not an LLM call). This keeps the function fast, free,
   and reproducible, and honors HBR-1.0 law 8 (AI Untrusted): the
   admin reviews the suggestions before acting on them.
   ============================================================ */

export type RequestMatch = {
  listingId: string;
  score: number; // 0..1
  reason: string;
};

export type MatchResult = {
  requestId: string;
  requestTitle: string;
  matches: RequestMatch[];
};

const TOP_N = 10;
const MIN_SCORE = 0.1;

function norm(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .trim()
    .toLowerCase()
    // Persian normalisation: ي→ی, ك→ک, strip ZWNJ
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, "");
}

function bigToNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Score one listing against one request. Returns { score, reason }.
 * Pure function — no DB access, safe to unit-test.
 */
function scoreListing(
  req: {
    category: string | null;
    brandPref: string | null;
    budgetMin: bigint | null;
    budgetMax: bigint | null;
    city: string | null;
    province: string | null;
  },
  listing: {
    id: string;
    price: bigint | null;
    brandName: string | null;
    categoryName: string | null;
    city: string | null;
    province: string | null;
  },
): { score: number; reason: string } {
  const reasons: string[] = [];
  let score = 0;

  // ── Category (0.40) ──────────────────────────────────────────
  const reqCat = norm(req.category);
  const listCat = norm(listing.categoryName);
  if (reqCat && listCat && reqCat === listCat) {
    score += 0.4;
    reasons.push("دسته یکسان");
  } else if (reqCat && listCat && (reqCat.includes(listCat) || listCat.includes(reqCat))) {
    score += 0.25;
    reasons.push("دسته مشابه");
  }

  // ── Price range fit (0.30) ───────────────────────────────────
  const min = bigToNumber(req.budgetMin);
  const max = bigToNumber(req.budgetMax);
  const price = bigToNumber(listing.price);
  if (min !== null && max !== null && price !== null && max >= min && max > 0) {
    if (price >= min && price <= max) {
      score += 0.3;
      reasons.push("قیمت در محدوده بودجه");
    } else if (price < min) {
      // Below band — taper 0.3 → 0 across the lower 25% window.
      const window = Math.max(min * 0.25, 1);
      const ratio = Math.max(0, (min - price) / window);
      score += 0.3 * (1 - ratio);
      if (ratio < 1) reasons.push("قیمت پایین‌تر از بودجه");
    } else {
      // Above band — taper 0.3 → 0 across the upper 25% window.
      const window = Math.max(max * 0.25, 1);
      const ratio = Math.max(0, (price - max) / window);
      score += 0.3 * (1 - ratio);
      if (ratio < 1) reasons.push("قیمت نزدیک به سقف بودجه");
    }
  }

  // ── Brand (0.20) ─────────────────────────────────────────────
  const reqBrand = norm(req.brandPref);
  const listBrand = norm(listing.brandName);
  if (reqBrand && listBrand) {
    if (reqBrand === listBrand) {
      score += 0.2;
      reasons.push("برند یکسان");
    } else if (reqBrand.includes(listBrand) || listBrand.includes(reqBrand)) {
      // Partial — e.g. "کاترپیلار" vs "کاترپیلار ایران"
      score += 0.1;
      reasons.push("برند مشابه");
    }
  }

  // ── Location (0.10) ──────────────────────────────────────────
  const reqCity = norm(req.city);
  const reqProv = norm(req.province);
  const listCity = norm(listing.city);
  const listProv = norm(listing.province);
  if (reqCity && listCity && reqCity === listCity) {
    score += 0.1;
    reasons.push("شهر یکسان");
  } else if (reqProv && listProv && reqProv === listProv) {
    score += 0.05;
    reasons.push("استان یکسان");
  }

  // Cap & round.
  if (score > 1) score = 1;
  score = Math.round(score * 100) / 100;

  return { score, reason: reasons.length ? reasons.join("، ") : "تطبیق ضعیف" };
}

/**
 * Match a single BuyRequest against all PUBLISHED listings.
 * Returns the top-N matches with score >= MIN_SCORE.
 */
export async function matchRequestToListings(
  requestId: string,
): Promise<{ matches: RequestMatch[] }> {
  const req = await db.buyRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      title: true,
      category: true,
      brandPref: true,
      budgetMin: true,
      budgetMax: true,
      city: true,
      province: true,
      status: true,
    },
  });

  if (!req) {
    return { matches: [] };
  }

  // Load PUBLISHED listings with their brand + category names.
  const listings = await db.listing.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      price: true,
      city: true,
      province: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
    take: 2000, // safety cap
  });

  const scored = listings
    .map((l) => {
      const { score, reason } = scoreListing(
        {
          category: req.category,
          brandPref: req.brandPref,
          budgetMin: req.budgetMin,
          budgetMax: req.budgetMax,
          city: req.city,
          province: req.province,
        },
        {
          id: l.id,
          price: l.price,
          brandName: l.brand?.name ?? null,
          categoryName: l.category?.name ?? null,
          city: l.city,
          province: l.province,
        },
      );
      return { listingId: l.id, score, reason };
    })
    .filter((m) => m.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);

  return { matches: scored };
}

/**
 * Run matching for every ACTIVE BuyRequest. Per-request failures are
 * caught — one bad request never aborts the batch.
 *
 * Returns aggregate counts and writes a single batched AuditLog entry.
 */
export async function matchAllRequests(): Promise<{
  totalRequests: number;
  totalMatches: number;
}> {
  const requests = await db.buyRequest.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, title: true },
    take: 500, // safety cap
  });

  let totalMatches = 0;
  const perRequest: { id: string; title: string; matches: number }[] = [];

  for (const r of requests) {
    try {
      const { matches } = await matchRequestToListings(r.id);
      totalMatches += matches.length;
      perRequest.push({ id: r.id, title: r.title, matches: matches.length });
    } catch (err) {
      console.error(`[ai-matching] request ${r.id} failed:`, err);
      perRequest.push({ id: r.id, title: r.title, matches: 0 });
    }
  }

  // Single batched audit entry — actorType="SYSTEM" (this is an
  // automated matching run, not an AI LLM call).
  try {
    await logAudit({
      actorId: null,
      actorType: "SYSTEM",
      action: "matching.run",
      entityType: "BuyRequest",
      entityId: null,
      after: {
        totalRequests: requests.length,
        totalMatches,
        perRequest: perRequest.slice(0, 50),
      },
      reason: `اجرای موتور تطبیق هوشمند روی ${requests.length} درخواست فعال`,
    });
  } catch (err) {
    console.error("[ai-matching] audit log failed:", err);
  }

  return { totalRequests: requests.length, totalMatches };
}

/**
 * Fetch full match detail (listing fields + score + reason) for a
 * single request. Used by /api/requests/[id]/matches and the admin
 * "تطبیق هوشمند" preview.
 */
export async function getMatchesForRequest(requestId: string): Promise<{
  request: { id: string; title: string; status: string } | null;
  matches: {
    listingId: string;
    score: number;
    reason: string;
    title: string;
    slug: string;
    price: string | null;
    city: string | null;
    province: string | null;
    brandName: string | null;
    categoryName: string | null;
    primaryImage: string | null;
  }[];
}> {
  const req = await db.buyRequest.findUnique({
    where: { id: requestId },
    select: { id: true, title: true, status: true },
  });
  if (!req) {
    return { request: null, matches: [] };
  }

  const { matches } = await matchRequestToListings(requestId);
  if (matches.length === 0) {
    return { request: req, matches: [] };
  }

  // Hydrate listing detail in one round-trip.
  const listingIds = matches.map((m) => m.listingId);
  const listings = await db.listing.findMany({
    where: { id: { in: listingIds } },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      city: true,
      province: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  });

  // Preserve match-score order.
  const byId = new Map(listings.map((l) => [l.id, l]));
  const hydrated = matches
    .map((m) => {
      const l = byId.get(m.listingId);
      if (!l) return null;
      return {
        listingId: l.id,
        score: m.score,
        reason: m.reason,
        title: l.title,
        slug: l.slug,
        price: l.price ? l.price.toString() : null,
        city: l.city,
        province: l.province,
        brandName: l.brand?.name ?? null,
        categoryName: l.category?.name ?? null,
        primaryImage: l.images[0]?.url ?? null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return { request: req, matches: hydrated };
}
