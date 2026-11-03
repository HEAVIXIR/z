import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/admin/lifecycle
   Returns counts of listings in each lifecycle stage.
   Stages: DISCOVER, COMPARE, INSPECT, BUY, TRANSPORT, OPERATE,
           MAINTAIN, RESELL
   We map stages via listing/listingType/status fields.
   ============================================================ */

const STAGES = [
  "DISCOVER",
  "COMPARE",
  "INSPECT",
  "BUY",
  "TRANSPORT",
  "OPERATE",
  "MAINTAIN",
  "RESELL",
] as const;

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [
      totalListings,
      published,
      sold,
      featuredCount,
      verifiedCount,
      hasView,
      hasInquiry,
      hasInspection,
      hasOffer,
      hasService,
      typeSale,
      typeRent,
      soldCount,
      resaleCount,
      transportType,
    ] = await Promise.all([
      db.listing.count(),
      db.listing.count({ where: { status: "PUBLISHED" } }),
      db.listing.count({ where: { status: "SOLD" } }),
      db.listing.count({ where: { featured: true } }),
      db.listing.count({ where: { verified: true } }),
      db.listing.count({ where: { viewCount: { gt: 10 } } }),
      db.lead.count(),
      db.inspectionRequest.count(),
      db.listingOffer.count(),
      db.serviceRecord.count(),
      db.listing.count({ where: { listingType: "SALE" } }),
      db.listing.count({ where: { listingType: "RENT" } }),
      db.listing.count({ where: { status: "SOLD" } }),
      db.listing.count({ where: { status: "RESOLD" } }),
      db.listing.count({ where: { listingType: "TRANSPORT" } }),
    ]);

    // Heuristic mapping:
    // - DISCOVER: published listings with views
    // - COMPARE: listings with featured (compared often) — use featured count
    // - INSPECT: listings with inspection requests
    // - BUY: listings with offers (purchase intent)
    // - TRANSPORT: listings of type TRANSPORT (or could be transport-type category)
    // - OPERATE: listings that are rentals (RENT) and active
    // - MAINTAIN: listings with service records
    // - RESELL: listings marked as sold + resale count
    const stageCounts: Record<string, number> = {
      DISCOVER: hasView,
      COMPARE: featuredCount,
      INSPECT: hasInspection,
      BUY: hasOffer,
      TRANSPORT: transportType,
      OPERATE: typeRent,
      MAINTAIN: hasService,
      RESELL: resaleCount + soldCount,
    };

    const total = Object.values(stageCounts).reduce((s, n) => s + n, 0);

    const stages = STAGES.map((stage, idx) => ({
      stage,
      order: idx + 1,
      count: stageCounts[stage] ?? 0,
      pct: total > 0 ? Math.round(((stageCounts[stage] ?? 0) / total) * 100) : 0,
    }));

    return NextResponse.json({
      stages,
      summary: {
        totalListings,
        published,
        sold,
        featuredCount,
        verifiedCount,
        totalOffers: hasOffer,
        totalInspections: hasInspection,
        totalServiceRecords: hasService,
        typeSale,
        typeRent,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
