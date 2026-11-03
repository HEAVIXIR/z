import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import {
  generateRecommendations,
  getRecommendations,
  dismissRecommendation,
  recordRecommendationClick,
  RECOMMENDATION_REASONS,
  DEFAULT_LIMIT,
} from "@/lib/recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/recommendations — user-facing recommendation feed.

   GET   — returns the current user's active recommendations.
           Auth required. Auto-refreshes the feed on each GET.
   POST  — { listingId, reason, action: "dismiss"|"click" }
           Records a dismiss or click on a recommendation.
           Auth required.
   ============================================================ */

const REASON_LABEL_FA: Record<string, string> = {
  SIMILAR_TO_VIEWED: "مشابه آگهی‌های دیده‌شده",
  SAME_CATEGORY: "همان دسته‌بندی",
  SAME_BRAND: "همان برند",
  PRICE_DROP: "کاهش قیمت",
  NEW_IN_WATCHLIST_CATEGORY: "جدید در دسته‌های تحت پیگیری",
  TRENDING: "پربازدیدترین‌ها",
};

function serialize(listing: any) {
  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    shortDesc: listing.shortDesc,
    description: listing.description,
    price: listing.price ? listing.price.toString() : null,
    priceType: listing.priceType,
    listingType: listing.listingType,
    condition: listing.condition,
    province: listing.province,
    city: listing.city,
    year: listing.year,
    workingHours: listing.workingHours,
    featured: listing.featured,
    verified: listing.verified,
    viewCount: listing.viewCount,
    brand: listing.brand,
    category: listing.category,
    image: listing.images?.[0]?.url ?? null,
    // Recommendation metadata
    reason: listing.reason,
    reasonLabel: REASON_LABEL_FA[listing.reason] ?? listing.reason,
    score: listing.score,
    recommendationId: listing.recommendationId,
  };
}

/* GET /api/recommendations?limit=12&refresh=1 */
export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(
      50,
      Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_LIMIT),
    );
    const refresh = (url.searchParams.get("refresh") ?? "1") !== "0";

    // Generate (refresh) recommendations on each GET — generateRecommendations
    // is idempotent (upsert) so this is safe.
    if (refresh) {
      await generateRecommendations(userId, limit);
    }

    const listings = await getRecommendations(userId, limit, { refresh: false });

    return NextResponse.json({
      success: true,
      count: listings.length,
      data: listings.map(serialize),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/recommendations
   Body: { listingId, reason, action: "dismiss"|"click" } */
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const listingId = String(body.listingId ?? "");
    const reason = String(body.reason ?? "");
    const action = String(body.action ?? "").toLowerCase();

    if (!listingId || !reason) {
      return NextResponse.json(
        { error: "listingId and reason are required" },
        { status: 400 },
      );
    }
    if (!RECOMMENDATION_REASONS.includes(reason as any)) {
      return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
    }
    if (action !== "dismiss" && action !== "click") {
      return NextResponse.json(
        { error: 'action must be "dismiss" or "click"' },
        { status: 400 },
      );
    }

    // Verify the recommendation belongs to the user.
    const rec = await db.userRecommendation.findUnique({
      where: {
        userId_listingId_reason: { userId, listingId, reason },
      },
    });
    if (!rec) {
      return NextResponse.json(
        { error: "Recommendation not found" },
        { status: 404 },
      );
    }

    if (action === "dismiss") {
      await dismissRecommendation(userId, listingId, reason);
    } else {
      await recordRecommendationClick(userId, listingId, reason);
    }

    return NextResponse.json({ success: true, action });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
