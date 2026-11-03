import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

/* ============================================================
   GET /api/admin/growth-engine — Supply/Demand dashboard data
   Priority #63, #64: track supply + demand engines.
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalListings, totalRequests, totalSellers, totalBuyers,
    newListingsWeek, newRequestsWeek, newSellersWeek,
    newListingsMonth, newRequestsMonth,
    verifiedListings, featuredListings, pendingOffers,
    totalViews, totalLeads, acceptedOffers,
  ] = await Promise.all([
    db.listing.count({ where: { status: "PUBLISHED" } }),
    db.buyRequest.count({ where: { status: "ACTIVE" } }),
    db.user.count({ where: { status: "ACTIVE", userType: "SELLER" } }),
    db.user.count({ where: { status: "ACTIVE", userType: { not: "SELLER" } } }),
    db.listing.count({ where: { createdAt: { gte: weekAgo }, status: "PUBLISHED" } }),
    db.buyRequest.count({ where: { createdAt: { gte: weekAgo } } }),
    db.user.count({ where: { createdAt: { gte: weekAgo }, status: "ACTIVE" } }),
    db.listing.count({ where: { createdAt: { gte: monthAgo }, status: "PUBLISHED" } }),
    db.buyRequest.count({ where: { createdAt: { gte: monthAgo } } }),
    db.listing.count({ where: { status: "PUBLISHED", verified: true } }),
    db.listing.count({ where: { status: "PUBLISHED", featured: true } }),
    db.listingOffer.count({ where: { status: "PENDING" } }),
    db.listing.aggregate({ _sum: { viewCount: true } }),
    db.lead.count(),
    db.listingOffer.count({ where: { status: "ACCEPTED" } }),
  ]);

  // Funnel: Views → Leads → Offers → Accepted
  const funnel = {
    views: totalViews._sum.viewCount || 0,
    leads: totalLeads,
    offers: pendingOffers,
    accepted: acceptedOffers,
    conversionRate: totalLeads > 0 ? Math.round((acceptedOffers / totalLeads) * 100) : 0,
  };

  // Supply metrics
  const supply = {
    total: totalListings,
    newThisWeek: newListingsWeek,
    newThisMonth: newListingsMonth,
    verified: verifiedListings,
    featured: featuredListings,
    growthRate: totalListings > 0 ? Math.round((newListingsWeek / totalListings) * 100) : 0,
  };

  // Demand metrics
  const demand = {
    total: totalRequests,
    newThisWeek: newRequestsWeek,
    newThisMonth: newRequestsMonth,
    growthRate: totalRequests > 0 ? Math.round((newRequestsWeek / totalRequests) * 100) : 0,
  };

  // Seller metrics
  const sellers = {
    total: totalSellers,
    newThisWeek: newSellersWeek,
    buyerCount: totalBuyers,
    ratio: totalSellers > 0 ? Math.round(totalBuyers / totalSellers) : 0,
  };

  return NextResponse.json({
    success: true,
    supply,
    demand,
    sellers,
    funnel,
    summary: {
      totalListings,
      totalRequests,
      totalSellers,
      pendingOffers,
      supplyDemandRatio: totalRequests > 0 ? (totalListings / totalRequests).toFixed(2) : "∞",
    },
  });
}
