import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/verifications?companyId=X | ?sellerId=X | ?listingId=X
 *
 * Returns public trust/verification data for a subject.
 * Only shows VERIFIED + EXPIRED statuses (not PENDING/REJECTED — those are private).
 * Evidence URLs are NOT exposed — only the fact that evidence exists.
 *
 * Per HEAVIX Master Execution Plan V2.0 Phase 5K.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId")?.trim();
    const sellerId = url.searchParams.get("sellerId")?.trim();
    const listingId = url.searchParams.get("listingId")?.trim();

    if (!companyId && !sellerId && !listingId) {
      return NextResponse.json(
        { error: "companyId, sellerId, or listingId is required" },
        { status: 400 },
      );
    }

    const result: any = { verifications: [], trustSignals: [] };

    // Company verifications (public: only VERIFIED + EXPIRED)
    if (companyId) {
      const verifs = await db.companyVerification.findMany({
        where: {
          companyId,
          status: { in: ["VERIFIED", "EXPIRED"] },
        },
        select: {
          id: true,
          verificationType: true,
          status: true,
          reviewedAt: true,
          expiresAt: true,
          notes: true,
        },
        orderBy: { reviewedAt: "desc" },
      });

      result.verifications = verifs.map(v => ({
        id: v.id,
        type: v.verificationType,
        status: v.status,
        verifiedAt: v.reviewedAt,
        expiresAt: v.expiresAt,
        hasEvidence: true, // boolean only — never expose evidence URLs
      }));

      // Build trust signals
      const company = await db.company.findUnique({
        where: { id: companyId },
        select: { verified: true, name: true, avgRating: true, reviewCount: true },
      });

      if (company) {
        result.trustSignals = buildTrustSignals(verifs, company);
        result.subject = { type: "COMPANY", name: company.name, verified: company.verified };
      }
    }

    // Seller (User) verifications — from User model fields
    if (sellerId) {
      const user = await db.user.findUnique({
        where: { id: sellerId },
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

      if (user) {
        result.subject = {
          type: "SELLER",
          name: `${user.firstName} ${user.lastName}`.trim(),
        };

        result.trustSignals = [
          { type: "PHONE", label: "شماره تماس", status: user.mobileVerified ? "VERIFIED" : "UNVERIFIED" },
          { type: "EMAIL", label: "ایمیل", status: user.emailVerified ? "VERIFIED" : "UNVERIFIED" },
        ];

        if (user.company) {
          result.trustSignals.push({
            type: "COMPANY",
            label: "شرکت",
            status: user.company.verified ? "VERIFIED" : "UNVERIFIED",
            detail: user.company.name,
          });
        }
      }
    }

    // Listing trust — from listing.verified + seller + company
    if (listingId) {
      const listing = await db.listing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          title: true,
          verified: true,
          status: true,
          seller: {
            select: { id: true, firstName: true, lastName: true, mobileVerified: true, emailVerified: true },
          },
          company: {
            select: { id: true, name: true, verified: true },
          },
        },
      });

      if (listing) {
        result.subject = { type: "LISTING", name: listing.title };
        result.trustSignals = [
          { type: "LISTING", label: "آگهی", status: listing.verified ? "VERIFIED" : "UNVERIFIED" },
        ];

        if (listing.seller) {
          result.trustSignals.push({
            type: "SELLER_PHONE",
            label: "تماس فروشنده",
            status: listing.seller.mobileVerified ? "VERIFIED" : "UNVERIFIED",
          });
        }

        if (listing.company) {
          result.trustSignals.push({
            type: "COMPANY",
            label: "شرکت",
            status: listing.company.verified ? "VERIFIED" : "UNVERIFIED",
            detail: listing.company.name,
          });
        }
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[verifications] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

function buildTrustSignals(verifs: any[], company: any): any[] {
  const signals: any[] = [];

  // Company verified boolean
  if (company.verified) {
    signals.push({ type: "COMPANY", label: "شرکت", status: "VERIFIED" });
  }

  // Map verification types to signals
  for (const v of verifs) {
    if (v.status === "VERIFIED") {
      const labels: Record<string, string> = {
        PHONE: "تلفن",
        EMAIL: "ایمیل",
        BUSINESS: "کسب‌وکار",
        DOCUMENT: "مدارک",
        INSPECTION: "بازرسی",
      };
      signals.push({
        type: v.verificationType,
        label: labels[v.verificationType] || v.verificationType,
        status: "VERIFIED",
        expiresAt: v.expiresAt,
      });
    } else if (v.status === "EXPIRED") {
      const labels: Record<string, string> = {
        PHONE: "تلفن",
        EMAIL: "ایمیل",
        BUSINESS: "کسب‌وکار",
        DOCUMENT: "مدارک",
        INSPECTION: "بازرسی",
      };
      signals.push({
        type: v.verificationType,
        label: labels[v.verificationType] || v.verificationType,
        status: "EXPIRED",
        expiresAt: v.expiresAt,
      });
    }
  }

  // Add review signal if available
  if (company.reviewCount > 0) {
    signals.push({
      type: "REVIEWS",
      label: "نظرات",
      status: "VERIFIED",
      detail: `${company.reviewCount} نظر`,
      rating: company.avgRating,
    });
  }

  return signals;
}
