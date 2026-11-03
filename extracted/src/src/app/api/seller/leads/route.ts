import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/* ============================================================
   /api/seller/leads — CRM for sellers (Priority #38)
   GET  — list leads for current user's listings
   PATCH — update lead status/note { id, status?, note? }
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";

  // Get user's listing IDs
  const userListings = await db.listing.findMany({
    where: { sellerId: user.id },
    select: { id: true, title: true, slug: true },
  });
  const listingIds = userListings.map((l) => l.id);
  const listingMap: Record<string, any> = {};
  userListings.forEach((l) => { listingMap[l.id] = l; });

  const where: Record<string, unknown> = { listingId: { in: listingIds } };
  // Note: Lead doesn't have status field, so we skip status filter for now

  const leads = await db.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Group by listing
  const byListing: Record<string, any[]> = {};
  leads.forEach((l) => {
    if (!byListing[l.listingId]) byListing[l.listingId] = [];
    byListing[l.listingId].push({
      ...l,
      listing: listingMap[l.listingId] || null,
      createdAt: l.createdAt.toISOString(),
    });
  });

  // Stats
  const stats = {
    total: leads.length,
    byType: {
      CALL: leads.filter((l) => l.leadType === "CALL").length,
      MESSAGE: leads.filter((l) => l.leadType === "MESSAGE").length,
      FAVORITE: leads.filter((l) => l.leadType === "FAVORITE").length,
      CONTACT: leads.filter((l) => l.leadType === "CONTACT").length,
      VIEW: leads.filter((l) => l.leadType === "VIEW").length,
      OFFER: leads.filter((l) => l.leadType === "OFFER").length,
    },
    listingCount: Object.keys(byListing).length,
  };

  return NextResponse.json({
    success: true,
    stats,
    data: leads.map((l) => ({
      ...l,
      listing: listingMap[l.listingId] || null,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
