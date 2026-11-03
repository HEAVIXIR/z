import { db } from "@/lib/db";
import type { Listing, UserRecommendation } from "@prisma/client";

/* ============================================================
   HEAVIX — Recommendation Engine (P2-24)
   ------------------------------------------------------------
   HEAVIX-P0-IMPLEMENTATION-PLAN.md P2-24 (Recommendation)
   HEAVIX-PROJECT-PRINCIPLES.md اصل ۶ — AI Untrusted.
   HEAVIX-CORRECTED-REFERENCE-V1.1.md §13.

   This module is the canonical per-user recommendation generator.
   It is *server-only* (imports Prisma). It must never mutate
   anything other than the `UserRecommendation` table — it neither
   approves listings, nor changes prices, nor exposes secrets.

   Signals (weighted, additive):
     • SIMILAR_TO_VIEWED   — listings in the same category as a
                              listing the user has favorited.
     • SAME_CATEGORY       — listings sharing a category with
                              favorited/viewed listings.
     • SAME_BRAND          — listings sharing a brand with
                              favorited/viewed listings.
     • NEW_IN_WATCHLIST_CATEGORY
                          — listings published in the last 7 days
                              in a category the user has favorited.
     • TRENDING            — listings with the highest recent view
                              count (P95-ish cutoff).

   Each generated row carries:
     • reason    — one of the codes above.
     • score     — 0..1 confidence (higher = stronger).
     • dismissed — false on creation.

   The unique constraint `@@unique([userId, listingId, reason])`
   means each (user, listing, reason) triple is upserted; calling
   `generateRecommendations` repeatedly refreshes scores without
   producing duplicates. A dismissed row keeps its `dismissed=true`
   flag (we use upsert with `update: { score }` that does NOT touch
   `dismissed`).

   `getRecommendations` returns the underlying Listing rows for the
   active (non-dismissed) recommendations, joined with their
   recommendation metadata, ordered by score desc, createdAt desc.
   ============================================================ */

export const RECOMMENDATION_REASONS = [
  "SIMILAR_TO_VIEWED",
  "SAME_CATEGORY",
  "SAME_BRAND",
  "PRICE_DROP",
  "NEW_IN_WATCHLIST_CATEGORY",
  "TRENDING",
] as const;
export type RecommendationReason = (typeof RECOMMENDATION_REASONS)[number];

export const REASON_LABEL_FA: Record<RecommendationReason, string> = {
  SIMILAR_TO_VIEWED: "مشابه آگهی‌های دیده‌شده",
  SAME_CATEGORY: "همان دسته‌بندی",
  SAME_BRAND: "همان برند",
  PRICE_DROP: "کاهش قیمت",
  NEW_IN_WATCHLIST_CATEGORY: "جدید در دسته‌های تحت پیگیری",
  TRENDING: "پربازدیدترین‌ها",
};

export const DEFAULT_LIMIT = 12;
const WATCH_WINDOW_DAYS = 30;
const NEW_WINDOW_DAYS = 7;
const TRENDING_LIMIT = 12;
const MAX_PER_REASON = 8;

/* ----------------------------------------------------------------
   generateRecommendations

   Generates (or refreshes) recommendation rows for the user.
   Returns the freshly-upserted rows. Idempotent — safe to call on
   every dashboard / homepage load (rate-limit the caller if needed).

   Strategy:
     1. Collect the user's favorited listing IDs + their
        (categoryId, brandId) signatures.
     2. For each signature, find candidate PUBLISHED listings the
        user has NOT already favorited, and upsert recommendation
        rows with the appropriate reason.
     3. Add TRENDING rows from the highest-viewCount listings
        overall (last WATCH_WINDOW_DAYS publishedAt), regardless of
        category, so even cold-start users get a feed.
     4. Add NEW_IN_WATCHLIST_CATEGORY rows for listings published in
        the last NEW_WINDOW_DAYS in a watched category.

   Existing dismissed rows are preserved (we only update `score` on
   conflict, never the `dismissed` flag).
---------------------------------------------------------------- */
export async function generateRecommendations(
  userId: string,
  limit: number = DEFAULT_LIMIT,
): Promise<UserRecommendation[]> {
  if (!userId) return [];

  // 1) User's favorite listings (the closest signal we have on
  //    SQLite without a ListingView table). Favorites give us the
  //    (categoryId, brandId) affinity vector.
  const favorites = await db.favorite.findMany({
    where: { userId },
    select: {
      listingId: true,
      listing: {
        select: {
          id: true,
          categoryId: true,
          brandId: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Build the affinity vectors.
  const watchedListingIds = new Set<string>();
  const categoryAffinity = new Map<string, number>(); // categoryId → weight
  const brandAffinity = new Map<string, number>(); // brandId → weight

  for (const f of favorites) {
    if (!f.listing) continue;
    watchedListingIds.add(f.listing.id);
    if (f.listing.categoryId) {
      categoryAffinity.set(
        f.listing.categoryId,
        (categoryAffinity.get(f.listing.categoryId) ?? 0) + 1,
      );
    }
    if (f.listing.brandId) {
      brandAffinity.set(
        f.listing.brandId,
        (brandAffinity.get(f.listing.brandId) ?? 0) + 1,
      );
    }
  }

  // Normalize affinity weights to 0..1.
  const maxCat = Math.max(1, ...categoryAffinity.values());
  const maxBrand = Math.max(1, ...brandAffinity.values());
  categoryAffinity.forEach((v, k) =>
    categoryAffinity.set(k, v / maxCat),
  );
  brandAffinity.forEach((v, k) =>
    brandAffinity.set(k, v / maxBrand),
  );

  // The set of listing IDs the user has already favorited — we
  // never recommend those.
  const excludeIds = Array.from(watchedListingIds);

  // Holds the (listingId, reason, score) triples we want to upsert.
  // Map key = `${listingId}::${reason}` for dedup.
  const candidates = new Map<string, { listingId: string; reason: RecommendationReason; score: number }>();

  /* --- 2a) SIMILAR_TO_VIEWED / SAME_CATEGORY / SAME_BRAND --- */
  if (categoryAffinity.size > 0 || brandAffinity.size > 0) {
    const watchedListings = await db.listing.findMany({
      where: {
        status: "PUBLISHED",
        id: { in: Array.from(watchedListingIds) },
      },
      select: { id: true, categoryId: true, brandId: true },
    });

    // For each watched listing, find similar listings in the same
    // category OR with the same brand.
    for (const wl of watchedListings) {
      if (!wl.categoryId && !wl.brandId) continue;

      const similar = await db.listing.findMany({
        where: {
          status: "PUBLISHED",
          id: { notIn: excludeIds },
          OR: [
            ...(wl.categoryId ? [{ categoryId: wl.categoryId }] : []),
            ...(wl.brandId ? [{ brandId: wl.brandId }] : []),
          ],
        },
        select: { id: true, categoryId: true, brandId: true },
        orderBy: { viewCount: "desc" },
        take: MAX_PER_REASON,
      });

      for (const s of similar) {
        const sameCat = wl.categoryId && s.categoryId === wl.categoryId;
        const sameBrand = wl.brandId && s.brandId === wl.brandId;
        // Score: stronger if both cat + brand match; weight by affinity.
        let score = 0.4; // base
        if (sameCat) {
          score += 0.3 * (categoryAffinity.get(s.categoryId!) ?? 0);
        }
        if (sameBrand) {
          score += 0.3 * (brandAffinity.get(s.brandId!) ?? 0);
        }
        score = Math.min(1, score);

        // Reason priority: SIMILAR_TO_VIEWED if both match,
        // SAME_CATEGORY if only cat matches, SAME_BRAND if only brand.
        const reason: RecommendationReason = sameCat && sameBrand
          ? "SIMILAR_TO_VIEWED"
          : sameCat
            ? "SAME_CATEGORY"
            : "SAME_BRAND";

        const key = `${s.id}::${reason}`;
        const prev = candidates.get(key);
        if (!prev || prev.score < score) {
          candidates.set(key, { listingId: s.id, reason, score });
        }
      }
    }
  }

  /* --- 2b) NEW_IN_WATCHLIST_CATEGORY ---
     Listings published in the last NEW_WINDOW_DAYS in a category
     the user has shown interest in. */
  if (categoryAffinity.size > 0) {
    const newCutoff = new Date(Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const freshInWatchedCats = await db.listing.findMany({
      where: {
        status: "PUBLISHED",
        id: { notIn: excludeIds },
        categoryId: { in: Array.from(categoryAffinity.keys()) },
        createdAt: { gte: newCutoff },
      },
      select: { id: true, categoryId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: MAX_PER_REASON * 2,
    });
    for (const l of freshInWatchedCats) {
      const affinity = categoryAffinity.get(l.categoryId!) ?? 0;
      // Newer + higher-affinity → higher score.
      const ageDays = (Date.now() - l.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      const recencyBoost = Math.max(0, 1 - ageDays / NEW_WINDOW_DAYS);
      const score = Math.min(1, 0.3 + affinity * 0.4 + recencyBoost * 0.3);
      const key = `${l.id}::NEW_IN_WATCHLIST_CATEGORY`;
      const prev = candidates.get(key);
      if (!prev || prev.score < score) {
        candidates.set(key, {
          listingId: l.id,
          reason: "NEW_IN_WATCHLIST_CATEGORY",
          score,
        });
      }
    }
  }

  /* --- 2c) TRENDING ---
     Highest viewCount listings published in the last WATCH_WINDOW_DAYS.
     Always added so cold-start users get a feed. */
  const trendingCutoff = new Date(
    Date.now() - WATCH_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const trending = await db.listing.findMany({
    where: {
      status: "PUBLISHED",
      id: { notIn: excludeIds },
      // Use createdAt as the trending window (older listings with
      // high viewCount aren't really "trending" anymore).
      createdAt: { gte: trendingCutoff },
    },
    select: { id: true, viewCount: true },
    orderBy: { viewCount: "desc" },
    take: TRENDING_LIMIT,
  });
  const maxViews = Math.max(1, ...trending.map((t) => t.viewCount ?? 0));
  for (const t of trending) {
    const score = Math.min(1, 0.3 + 0.7 * ((t.viewCount ?? 0) / maxViews));
    const key = `${t.id}::TRENDING`;
    const prev = candidates.get(key);
    if (!prev || prev.score < score) {
      candidates.set(key, { listingId: t.id, reason: "TRENDING", score });
    }
  }

  // If we still have no candidates (cold-start with no favorites),
  // fall back to all-time trending + newest published listings.
  if (candidates.size === 0) {
    const fallback = await db.listing.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { viewCount: "desc" }],
      take: TRENDING_LIMIT,
      select: { id: true, viewCount: true },
    });
    const fbMaxViews = Math.max(1, ...fallback.map((t) => t.viewCount ?? 0));
    for (const t of fallback) {
      const score = Math.min(1, 0.3 + 0.7 * ((t.viewCount ?? 0) / fbMaxViews));
      candidates.set(`${t.id}::TRENDING`, {
        listingId: t.id,
        reason: "TRENDING",
        score,
      });
    }
  }

  // Cap to the requested limit (after sorting by score desc).
  const sorted = Array.from(candidates.values()).sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, Math.max(1, limit));

  // Upsert into UserRecommendation. On conflict (same userId +
  // listingId + reason), only refresh `score`. We deliberately do
  // NOT touch `dismissed` — a dismissed rec stays dismissed even
  // when its score bumps up.
  await Promise.all(
    top.map((c) =>
      db.userRecommendation.upsert({
        where: {
          userId_listingId_reason: {
            userId,
            listingId: c.listingId,
            reason: c.reason,
          },
        },
        create: {
          userId,
          listingId: c.listingId,
          reason: c.reason,
          score: c.score,
          dismissed: false,
        },
        update: {
          score: c.score,
        },
      }),
    ),
  );

  // Return the active (non-dismissed) recommendations, ordered by
  // score desc, createdAt desc — same shape as `getRecommendations`
  // but without the Listing join (callers wanting the listings
  // should call `getRecommendations`).
  return db.userRecommendation.findMany({
    where: { userId, dismissed: false },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: Math.max(1, limit),
  });
}

/* ----------------------------------------------------------------
   getRecommendations

   Fetches the active (non-dismissed) recommendation rows joined
   with their Listing + Brand + primary image, ready to render in
   a card grid. If `refresh` is true, calls `generateRecommendations`
   first to ensure the feed is up-to-date.
---------------------------------------------------------------- */
export async function getRecommendations(
  userId: string,
  limit: number = DEFAULT_LIMIT,
  opts: { refresh?: boolean } = {},
): Promise<
  Array<
    Listing & {
      reason: string;
      score: number;
      recommendationId: string;
      brand: { id: string; name: string; nameEn: string | null; slug: string } | null;
      category: { id: string; name: string; slug: string; icon: string | null } | null;
      images: { id: string; url: string; isPrimary: boolean; sortOrder: number }[];
    }
  >
> {
  if (!userId) return [];
  if (opts.refresh) {
    await generateRecommendations(userId, limit);
  }
  const rows = await db.userRecommendation.findMany({
    where: { userId, dismissed: false },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: Math.max(1, limit),
    include: {
      listing: {
        include: {
          brand: { select: { id: true, name: true, nameEn: true, slug: true } },
          category: { select: { id: true, name: true, slug: true, icon: true } },
          images: {
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          },
        },
      },
    },
  });

  return rows.map((r) => ({
    ...r.listing,
    reason: r.reason,
    score: r.score,
    recommendationId: r.id,
  }));
}

/* ----------------------------------------------------------------
   dismissRecommendation

   Mark a (userId, listingId, reason) triple as dismissed. The row
   stays in the table so `generateRecommendations` won't re-suggest
   it (the upsert's `update` only touches `score`, not `dismissed`).
---------------------------------------------------------------- */
export async function dismissRecommendation(
  userId: string,
  listingId: string,
  reason: string,
): Promise<void> {
  if (!userId || !listingId || !reason) return;
  await db.userRecommendation.updateMany({
    where: { userId, listingId, reason },
    data: { dismissed: true },
  });
}

/* ----------------------------------------------------------------
   recordRecommendationClick

   Stamp `clickedAt` on the recommendation row when the user
   follows it. We keep the row (don't dismiss) — clicking is a
   positive signal, not a dismissal.
---------------------------------------------------------------- */
export async function recordRecommendationClick(
  userId: string,
  listingId: string,
  reason: string,
): Promise<void> {
  if (!userId || !listingId || !reason) return;
  await db.userRecommendation.updateMany({
    where: { userId, listingId, reason },
    data: { clickedAt: new Date() },
  });
}
