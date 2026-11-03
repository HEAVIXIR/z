import { db } from "@/lib/db";

/* ============================================================
   REVIEW-01 — rating aggregate helper.

   Company.avgRating/reviewCount and User.avgRating/reviewCount are
   denormalized caches recomputed from PUBLISHED reviews only, every
   time a review is created, moderated, or removed. Never trust a
   stale cached value for anything security-sensitive — it's a
   display aggregate, not a source of truth (the Review rows are).
   ============================================================ */

export async function recomputeCompanyRating(companyId: string) {
  const agg = await db.review.aggregate({
    where: { companyId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await db.company.update({
    where: { id: companyId },
    data: {
      avgRating: agg._avg.rating ?? null,
      reviewCount: agg._count.rating,
    },
  });
}

export async function recomputeSellerRating(sellerId: string) {
  const agg = await db.review.aggregate({
    where: { sellerId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await db.user.update({
    where: { id: sellerId },
    data: {
      avgRating: agg._avg.rating ?? null,
      reviewCount: agg._count.rating,
    },
  });
}

/** Call after any Review create/update/delete that could change its status. */
export async function recomputeRatingFor(review: { companyId?: string | null; sellerId?: string | null }) {
  if (review.companyId) await recomputeCompanyRating(review.companyId);
  if (review.sellerId) await recomputeSellerRating(review.sellerId);
}

export function serializeReview(r: any) {
  return {
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    verifiedDeal: r.verifiedDeal,
    sellerResponse: r.sellerResponse ?? null,
    sellerRespondedAt: r.sellerRespondedAt ?? null,
    createdAt: r.createdAt,
    author: r.author
      ? { id: r.author.id, name: `${r.author.firstName} ${r.author.lastName}`.trim() }
      : null,
    listing: r.listing ? { id: r.listing.id, slug: r.listing.slug, title: r.listing.title } : null,
  };
}
