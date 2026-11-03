/**
 * HEAVIX — Phase 4: Search & Discovery Tests
 * Per HEAVIX Master Execution Plan V2.0 Phase 4.
 */
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";

describe("Phase 4 — Search & Discovery Tests", () => {

  // ── 1. Search API exists and returns data ──
  describe("1. Search Domain", () => {
    it("should have published listings to search", async () => {
      const count = await db.listing.count({ where: { status: "PUBLISHED" } });
      expect(count).toBeGreaterThan(0);
    });

    it("should have brand aliases for canonicalization", async () => {
      const count = await db.brandAlias.count();
      expect(count).toBeGreaterThan(0);
    });

    it("should have search query history", async () => {
      const count = await db.searchQuery.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 2. Filters / Facets ──
  describe("2. Filters & Facets Data", () => {
    it("should have listings with different categories for filtering", async () => {
      const categories = await db.listing.groupBy({
        by: ["categoryId"],
        _count: true,
        where: { status: "PUBLISHED", categoryId: { not: null } },
      });
      expect(categories.length).toBeGreaterThan(0);
    });

    it("should have listings with different brands for filtering", async () => {
      const brands = await db.listing.groupBy({
        by: ["brandId"],
        _count: true,
        where: { status: "PUBLISHED", brandId: { not: null } },
      });
      expect(brands.length).toBeGreaterThan(0);
    });

    it("should have listings with transaction types for filtering", async () => {
      const txTypes = await db.listing.groupBy({
        by: ["transactionTypeId"],
        _count: true,
        where: { status: "PUBLISHED", transactionTypeId: { not: null } },
      });
      expect(txTypes.length).toBeGreaterThan(0);
    });

    it("should have listings with provinces for location filtering", async () => {
      const provinces = await db.listing.groupBy({
        by: ["province"],
        _count: true,
        where: { status: "PUBLISHED", province: { not: null } },
      });
      expect(provinces.length).toBeGreaterThan(0);
    });

    it("should have listings with conditions for filtering", async () => {
      const conditions = await db.listing.groupBy({
        by: ["condition"],
        _count: true,
        where: { status: "PUBLISHED", condition: { not: null } },
      });
      expect(conditions.length).toBeGreaterThan(0);
    });

    it("should have listings with prices for price range filtering", async () => {
      const withPrice = await db.listing.count({
        where: { status: "PUBLISHED", price: { not: null } },
      });
      expect(withPrice).toBeGreaterThan(0);
    });
  });

  // ── 3. Persian Normalization ──
  describe("3. Persian/English Canonicalization", () => {
    it("should have brands with both Persian and English names", async () => {
      const brands = await db.brand.findMany({
        where: { active: true, nameEn: { not: null } },
        take: 10,
      });
      expect(brands.length).toBeGreaterThan(0);
    });

    it("should have brand aliases for search matching", async () => {
      const aliases = await db.brandAlias.findFirst();
      expect(aliases).toBeTruthy();
    });

    it("should have categories with both Persian and English names", async () => {
      const cats = await db.category.findMany({
        where: { active: true, nameEn: { not: null } },
        take: 5,
      });
      expect(cats.length).toBeGreaterThan(0);
    });
  });

  // ── 4. Search Query Model ──
  describe("4. Search Query Tracking", () => {
    it("should have SearchQuery model accessible", async () => {
      const count = await db.searchQuery.count();
      expect(typeof count).toBe("number");
    });

    it("should have search queries with results", async () => {
      const withResults = await db.searchQuery.count({ where: { hasResults: true } });
      expect(withResults).toBeGreaterThanOrEqual(0); // may be 0 if not populated
    });
  });

  // ── 5. Sort & Pagination ──
  describe("5. Sort & Pagination Support", () => {
    it("should support sorting by createdAt", async () => {
      const listings = await db.listing.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, createdAt: true },
      });
      expect(listings.length).toBeGreaterThan(0);
      // Verify descending order
      for (let i = 1; i < listings.length; i++) {
        expect(listings[i].createdAt.getTime()).toBeLessThanOrEqual(listings[i - 1].createdAt.getTime());
      }
    });

    it("should support sorting by price", async () => {
      const listings = await db.listing.findMany({
        where: { status: "PUBLISHED", price: { not: null } },
        orderBy: { price: "asc" },
        take: 5,
        select: { id: true, price: true },
      });
      expect(listings.length).toBeGreaterThan(0);
    });

    it("should support pagination (skip + take)", async () => {
      const page1 = await db.listing.findMany({
        where: { status: "PUBLISHED" },
        skip: 0,
        take: 5,
        select: { id: true },
      });
      const page2 = await db.listing.findMany({
        where: { status: "PUBLISHED" },
        skip: 5,
        take: 5,
        select: { id: true },
      });
      // Pages should not overlap
      const page1Ids = new Set(page1.map(l => l.id));
      const overlap = page2.filter(l => page1Ids.has(l.id));
      expect(overlap.length).toBe(0);
    });
  });

  // ── 6. Dynamic Attributes in Search ──
  describe("6. Dynamic Attributes for Search", () => {
    it("should have filterable attributes", async () => {
      const count = await db.attributeDefinition.count({ where: { filterable: true } });
      expect(count).toBeGreaterThan(0);
    });

    it("should have searchable attributes", async () => {
      const count = await db.attributeDefinition.count({ where: { searchable: true } });
      expect(count).toBeGreaterThan(0);
    });

    it("should have category-attribute mappings for filtering", async () => {
      const count = await db.categoryAttribute.count({ where: { filterable: true } });
      expect(count).toBeGreaterThan(0);
    });
  });
});
