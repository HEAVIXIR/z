/**
 * HEAVIX — Phase 10: Reviews & Reputation Tests
 * Per HEAVIX Master Execution Plan V3.0 Phase 10.
 */
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import fs from "fs";

describe("Phase 10 — Reviews & Reputation Tests", () => {

  // ── 1. Review Domain ──
  describe("1. Review Domain", () => {
    it("should have Review model in schema", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model Review {");
    });

    it("Review should have authorId, sellerId, companyId, rating, body", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("authorId");
      expect(content).toContain("sellerId");
      expect(content).toContain("companyId");
      expect(content).toContain("rating");
      expect(content).toContain("body");
    });

    it("Review should have dealId + orderId for transaction linking", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("dealId");
      expect(content).toContain("orderId");
    });

    it("Review should have verifiedDeal + sellerResponse + status", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("verifiedDeal");
      expect(content).toContain("sellerResponse");
      expect(content).toContain("status");
    });
  });

  // ── 2. Reputation Fields ──
  describe("2. Reputation Fields", () => {
    it("Company should have avgRating + reviewCount", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("avgRating");
      expect(content).toContain("reviewCount");
    });

    it("User should have avgRating + reviewCount", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      // Both Company and User have these fields
      const matches = content.match(/avgRating/g);
      expect(matches?.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── 3. Review API ──
  describe("3. Review API", () => {
    it("should have /api/reviews route", () => {
      expect(fs.existsSync("src/app/api/reviews/route.ts")).toBe(true);
    });

    it("should have /api/reviews/[id] route", () => {
      expect(fs.existsSync("src/app/api/reviews/[id]/route.ts")).toBe(true);
    });

    it("reviews API should support GET (list) + POST (create)", () => {
      const content = fs.readFileSync("src/app/api/reviews/route.ts", "utf8");
      expect(content).toContain("export async function GET");
      expect(content).toContain("export async function POST");
    });

    it("review [id] should support PATCH (respond) + DELETE (withdraw)", () => {
      const content = fs.readFileSync("src/app/api/reviews/[id]/route.ts", "utf8");
      expect(content).toContain("export async function PATCH");
      expect(content).toContain("export async function DELETE");
    });
  });

  // ── 4. Admin Moderation ──
  describe("4. Admin Moderation", () => {
    it("should have /api/admin/reviews route", () => {
      expect(fs.existsSync("src/app/api/admin/reviews/route.ts")).toBe(true);
    });

    it("should have /api/admin/reviews/[id] route", () => {
      expect(fs.existsSync("src/app/api/admin/reviews/[id]/route.ts")).toBe(true);
    });

    it("admin reviews should support PATCH for moderation", () => {
      const content = fs.readFileSync("src/app/api/admin/reviews/[id]/route.ts", "utf8");
      expect(content).toContain("PUBLISHED");
      expect(content).toContain("REJECTED");
      expect(content).toContain("HIDDEN");
    });
  });

  // ── 5. Reputation API ──
  describe("5. Reputation API", () => {
    it("should have /api/sellers/[id]/reputation route", () => {
      expect(fs.existsSync("src/app/api/sellers/[id]/reputation/route.ts")).toBe(true);
    });

    it("should have /api/sellers/[id]/trust route (from Phase 5)", () => {
      expect(fs.existsSync("src/app/api/sellers/[id]/trust/route.ts")).toBe(true);
    });

    it("reputation API should return transaction stats", () => {
      const content = fs.readFileSync("src/app/api/sellers/[id]/reputation/route.ts", "utf8");
      expect(content).toContain("completedDeals");
      expect(content).toContain("disputedDeals");
      expect(content).toContain("cancellationRate");
    });

    it("reputation API should return rating distribution", () => {
      const content = fs.readFileSync("src/app/api/sellers/[id]/reputation/route.ts", "utf8");
      expect(content).toContain("ratingDistribution");
    });
  });

  // ── 6. Reviews Helper ──
  describe("6. Reviews Helper", () => {
    it("should have src/lib/reviews.ts", () => {
      expect(fs.existsSync("src/lib/reviews.ts")).toBe(true);
    });

    it("should export recomputeCompanyRating", () => {
      const content = fs.readFileSync("src/lib/reviews.ts", "utf8");
      expect(content).toContain("export async function recomputeCompanyRating");
    });

    it("should export recomputeSellerRating", () => {
      const content = fs.readFileSync("src/lib/reviews.ts", "utf8");
      expect(content).toContain("export async function recomputeSellerRating");
    });

    it("should export serializeReview", () => {
      const content = fs.readFileSync("src/lib/reviews.ts", "utf8");
      expect(content).toContain("export function serializeReview");
    });
  });

  // ── 7. Authorization ──
  describe("7. Authorization", () => {
    it("review POST should check userId", () => {
      const content = fs.readFileSync("src/app/api/reviews/route.ts", "utf8");
      expect(content).toContain("getCurrentUserId");
    });

    it("review DELETE should check author ownership", () => {
      const content = fs.readFileSync("src/app/api/reviews/[id]/route.ts", "utf8");
      expect(content).toContain("authorId");
      expect(content).toContain("403");
    });

    it("review PATCH (seller response) should check reviewed party", () => {
      const content = fs.readFileSync("src/app/api/reviews/[id]/route.ts", "utf8");
      expect(content).toContain("isReviewedSeller");
      expect(content).toContain("isReviewedCompany");
    });

    it("cannot review yourself", () => {
      const content = fs.readFileSync("src/app/api/reviews/route.ts", "utf8");
      expect(content).toContain("sellerId === userId");
    });
  });

  // ── 8. Duplicate Prevention ──
  describe("8. Duplicate Prevention", () => {
    it("should have unique constraint on dealRoomId", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("dealRoomId      String?  @unique");
    });

    it("should have unique constraint on dealId", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("dealId          String?  @unique");
    });
  });

  // ── 9. Audit ──
  describe("9. Audit Trail", () => {
    it("review creation should be audited", () => {
      const content = fs.readFileSync("src/app/api/reviews/route.ts", "utf8");
      expect(content).toContain("logAudit");
      expect(content).toContain("review.create");
    });

    it("review moderation should be audited", () => {
      const content = fs.readFileSync("src/app/api/admin/reviews/[id]/route.ts", "utf8");
      expect(content).toContain("logAudit");
      expect(content).toContain("review.moderate");
    });

    it("seller response should be audited", () => {
      const content = fs.readFileSync("src/app/api/reviews/[id]/route.ts", "utf8");
      expect(content).toContain("review.respond");
    });
  });

  // ── 10. Deal Relation ──
  describe("10. Deal Relation for Review Eligibility", () => {
    it("Deal should have Review relation", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("review          Review?");
    });
  });
});
