/**
 * HEAVIX — Phase 3D: Marketplace Core Tests
 * Per HEAVIX Master Execution Plan V2.0 §3 Definition of Done.
 *
 * Tests the complete Listing → Seller → Company chain.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";

describe("Phase 3D — Marketplace Core E2E Tests", () => {

  // ── 1. Listing Lifecycle ──
  describe("1. Listing Lifecycle States", () => {
    it("should have multiple lifecycle states in DB", async () => {
      const statuses = await db.listing.groupBy({ by: ["status"], _count: true });
      const statusNames = statuses.map(s => s.status);
      expect(statusNames).toContain("PUBLISHED");
      expect(statusNames).toContain("DRAFT");
      expect(statusNames).toContain("PENDING_REVIEW");
      expect(statusNames.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ── 2. Listing → Product chain ──
  describe("2. Listing → Product Relation", () => {
    it("should have listings linked to products", async () => {
      const count = await db.listing.count({ where: { productId: { not: null } } });
      expect(count).toBeGreaterThan(0);
    });

    it("should have listings linked to brands", async () => {
      const count = await db.listing.count({ where: { brandId: { not: null } } });
      expect(count).toBeGreaterThan(0);
    });

    it("should have listings linked to categories", async () => {
      const count = await db.listing.count({ where: { categoryId: { not: null } } });
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 3. Listing → Seller ──
  describe("3. Listing → Seller Relation", () => {
    it("should have listings with sellerId", async () => {
      const count = await db.listing.count({ where: { sellerId: { not: null } } });
      expect(count).toBeGreaterThan(0);
    });

    it("should have listings with sellerPhone", async () => {
      const count = await db.listing.count({ where: { sellerPhone: { not: null } } });
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 4. Listing → Company ──
  describe("4. Listing → Company Relation", () => {
    it("should have listings with companyId", async () => {
      const count = await db.listing.count({ where: { companyId: { not: null } } });
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 5. Listing → Location ──
  describe("5. Listing → Canonical Location", () => {
    it("should have listings with countryId", async () => {
      const count = await db.listing.count({ where: { countryId: { not: null } } });
      expect(count).toBeGreaterThan(0);
    });

    it("should have listings with provinceId", async () => {
      const count = await db.listing.count({ where: { provinceId: { not: null } } });
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 6. Listing → TransactionType ──
  describe("6. Listing → TransactionType", () => {
    it("should have listings with transactionTypeId", async () => {
      const count = await db.listing.count({ where: { transactionTypeId: { not: null } } });
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 7. Listing → Media ──
  describe("7. Listing → Media", () => {
    it("should have listings with images", async () => {
      const count = await db.listing.count({ where: { images: { some: {} } } });
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 8. Company Domain ──
  describe("8. Company Domain", () => {
    it("should have multiple companies", async () => {
      const count = await db.company.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it("should have verified companies", async () => {
      const count = await db.company.count({ where: { verified: true } });
      expect(count).toBeGreaterThan(0);
    });

    it('should have users linked to companies', async () => {
      const count = await db.user.count({ where: { companyId: { not: null } } });
      expect(count).toBeGreaterThan(0);
    });

    it("should have company branches", async () => {
      const count = await db.companyBranch.count();
      expect(count).toBeGreaterThan(0);
    });

    it("should have company verifications", async () => {
      const count = await db.companyVerification.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 9. Moderation ──
  describe("9. Moderation", () => {
    it("should have moderation logs", async () => {
      const count = await db.moderationLog.count();
      expect(count).toBeGreaterThan(0);
    });

    it("should have listing rejections", async () => {
      const count = await db.listingRejection.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 10. Catalog Chain (Brand → Model → Product → Listing) ──
  describe("10. Full Catalog Chain", () => {
    it("should have brands with models", async () => {
      const count = await db.brand.count({ where: { models: { some: {} } } });
      expect(count).toBeGreaterThan(0);
    });

    it("should have models with products", async () => {
      const count = await db.productModel.count({ where: { products: { some: {} } } });
      expect(count).toBeGreaterThan(0);
    });

    it("should have products with listings", async () => {
      const count = await db.product.count({ where: { listings: { some: {} } } });
      expect(count).toBeGreaterThan(0);
    });
  });
});
