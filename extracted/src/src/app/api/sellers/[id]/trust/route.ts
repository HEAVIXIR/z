import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/sellers/[id]/trust — public seller trust profile.
 * Returns verification signals + listing stats + response metrics.
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
        company: {
          select: { id: true, name: true, slug: true, verified: true, avgRating: true, reviewCount: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    // Listing stats
    const listingStats = await db.listing.groupBy({
      by: ["status"],
      _count: true,
      where: { sellerId: id },
    });

    const totalListings = listingStats.reduce((sum, s) => sum + s._count, 0);
    const publishedListings = listingStats.find(s => s.status === "PUBLISHED")?._count || 0;
    const verifiedListings = await db.listing.count({ where: { sellerId: id, verified: true } });

    // Build trust signals
    const trustSignals: any[] = [
      { type: "PHONE", label: "شماره تماس", status: user.mobileVerified ? "VERIFIED" : "UNVERIFIED" },
      { type: "EMAIL", label: "ایمیل", status: user.emailVerified ? "VERIFIED" : "UNVERIFIED" },
    ];

    if (user.company) {
      trustSignals.push({
        type: "COMPANY",
        label: "شرکت",
        status: user.company.verified ? "VERIFIED" : "UNVERIFIED",
        detail: user.company.name,
      });

      // Add company verification details
      const companyVerifs = await db.companyVerification.findMany({
        where: { companyId: user.company.id, status: "VERIFIED" },
        select: { verificationType: true, expiresAt: true },
      });

      const typeLabels: Record<string, string> = {
        PHONE: "تلفن شرکت",
        EMAIL: "ایمیل شرکت",
        BUSINESS: "کسب‌وکار",
        DOCUMENT: "مدارک",
        INSPECTION: "بازرسی",
      };

      for (const v of companyVerifs) {
        trustSignals.push({
          type: v.verificationType,
          label: typeLabels[v.verificationType] || v.verificationType,
          status: "VERIFIED",
          expiresAt: v.expiresAt,
        });
      }
    }

    return NextResponse.json({
      seller: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        status: user.status,
      },
      trustSignals,
      stats: {
        totalListings,
        publishedListings,
        verifiedListings,
        avgRating: user.avgRating,
        reviewCount: user.reviewCount,
      },
      company: user.company ? {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
        verified: user.company.verified,
        avgRating: user.company.avgRating,
        reviewCount: user.company.reviewCount,
      } : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
