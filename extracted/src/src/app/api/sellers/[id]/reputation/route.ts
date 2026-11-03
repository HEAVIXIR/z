import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/sellers/[id]/reputation — comprehensive reputation profile.
 *
 * Returns:
 * - Review stats (count, avgRating, rating distribution)
 * - Transaction stats (deals, completed, cancelled, disputed)
 * - Response metrics (offers, quotes)
 * - Verification signals (phone, email, company)
 * - Listing stats (total, published, verified)
 *
 * Per HEAVIX Master Execution Plan V3.0 Phase 10.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        mobileVerified: true,
        status: true,
        avgRating: true,
        reviewCount: true,
        company: { select: { id: true, name: true, verified: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    // Review stats
    const reviews = await db.review.findMany({
      where: { sellerId: id, status: "PUBLISHED" },
      select: { rating: true, verifiedDeal: true, createdAt: true },
    });

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let verifiedDealCount = 0;
    for (const r of reviews) {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
      if (r.verifiedDeal) verifiedDealCount++;
    }

    // Deal stats
    const dealsAsSeller = await db.deal.count({ where: { sellerId: id } }).catch(() => 0);
    const completedDeals = await db.deal.count({ where: { sellerId: id, status: "COMPLETED" } }).catch(() => 0);
    const cancelledDeals = await db.deal.count({ where: { sellerId: id, status: "CANCELLED" } }).catch(() => 0);
    const disputedDeals = await db.deal.count({ where: { sellerId: id, status: "DISPUTED" } }).catch(() => 0);

    // Listing stats
    const totalListings = await db.listing.count({ where: { sellerId: id } });
    const publishedListings = await db.listing.count({ where: { sellerId: id, status: "PUBLISHED" } });
    const verifiedListings = await db.listing.count({ where: { sellerId: id, verified: true } });

    // Offer stats (response metrics)
    const offersReceived = await db.listingOffer.count({
      where: { listing: { sellerId: id } },
    }).catch(() => 0);

    // Build reputation signals
    const signals: any[] = [
      { type: "PHONE", label: "تأیید تلفن", status: user.mobileVerified ? "VERIFIED" : "UNVERIFIED" },
      { type: "EMAIL", label: "تأیید ایمیل", status: user.emailVerified ? "VERIFIED" : "UNVERIFIED" },
    ];

    if (user.company) {
      signals.push({
        type: "COMPANY",
        label: "شرکت",
        status: user.company.verified ? "VERIFIED" : "UNVERIFIED",
        detail: user.company.name,
      });
    }

    if (publishedListings > 0) {
      signals.push({
        type: "LISTINGS",
        label: "آگهی‌های فعال",
        status: "INFO",
        detail: publishedListings + " آگهی",
      });
    }

    if (verifiedListings > 0) {
      signals.push({
        type: "VERIFIED_LISTINGS",
        label: "آگهی‌های تأییدشده",
        status: "VERIFIED",
        detail: verifiedListings + " آگهی",
      });
    }

    if (completedDeals > 0) {
      signals.push({
        type: "COMPLETED_DEALS",
        label: "معاملات موفق",
        status: "VERIFIED",
        detail: completedDeals + " معامله",
      });
    }

    return NextResponse.json({
      seller: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        status: user.status,
      },
      reputation: {
        avgRating: user.avgRating,
        reviewCount: user.reviewCount,
        ratingDistribution,
        verifiedDealReviews: verifiedDealCount,
      },
      transactions: {
        totalDeals: dealsAsSeller,
        completedDeals,
        cancelledDeals,
        disputedDeals,
        disputeRate: dealsAsSeller > 0 ? (disputedDeals / dealsAsSeller) : 0,
        cancellationRate: dealsAsSeller > 0 ? (cancelledDeals / dealsAsSeller) : 0,
      },
      listings: {
        total: totalListings,
        published: publishedListings,
        verified: verifiedListings,
      },
      engagement: {
        offersReceived,
      },
      signals,
    });
  } catch (err: any) {
    console.error("[reputation] error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
