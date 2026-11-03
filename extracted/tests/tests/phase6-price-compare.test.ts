/**
 * HEAVIX — Phase 6: Price Intelligence + Compare Tests
 * Per HEAVIX Master Execution Plan V3.0 Phase 6.
 */
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import fs from "fs";

describe("Phase 6 — Price Intelligence + Compare Tests", () => {

  // ── 1. Price Data Foundation ──
  describe("1. Price Data Foundation", () => {
    it("should have PriceRecord model with data", async () => {
      const count = await db.priceRecord.count();
      expect(count).toBeGreaterThan(0);
    });

    it("should have published listings with prices", async () => {
      const count = await db.listing.count({
        where: { status: "PUBLISHED", price: { not: null } },
      });
      expect(count).toBeGreaterThan(0);
    });

    it("should have PriceRecord with source attribution", async () => {
      const records = await db.priceRecord.findMany({
        select: { source: true },
        distinct: ["source"],
        take: 10,
      });
      expect(records.length).toBeGreaterThan(0);
    });
  });

  // ── 2. Price Engine ──
  describe("2. Price Engine", () => {
    it("should have price-engine.ts file", () => {
      expect(fs.existsSync("src/lib/price-engine.ts")).toBe(true);
    });

    it("should export estimatePrice function", () => {
      const content = fs.readFileSync("src/lib/price-engine.ts", "utf8");
      expect(content).toContain("export async function estimatePrice");
    });

    it("should export getPriceHistory function", () => {
      const content = fs.readFileSync("src/lib/price-engine.ts", "utf8");
      expect(content).toContain("export async function getPriceHistory");
    });

    it("should have confidence levels defined", () => {
      const content = fs.readFileSync("src/lib/price-engine.ts", "utf8");
      expect(content).toContain("HIGH");
      expect(content).toContain("MEDIUM");
      expect(content).toContain("LOW");
    });
  });

  // ── 3. Price Estimate Schema ──
  describe("3. Price Estimate Schema", () => {
    it("should have PriceEstimate model in schema", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model PriceEstimate");
    });

    it("should have PriceObservation model in schema", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model PriceObservation");
    });

    it("PriceEstimate should have confidence field", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("confidence");
    });
  });

  // ── 4. Compare Engine ──
  describe("4. Compare Engine", () => {
    it("should have compare-engine.ts file", () => {
      expect(fs.existsSync("src/lib/compare-engine.ts")).toBe(true);
    });

    it("should export createSession function", () => {
      const content = fs.readFileSync("src/lib/compare-engine.ts", "utf8");
      expect(content).toContain("export async function createSession");
    });

    it("should export getComparisonData function", () => {
      const content = fs.readFileSync("src/lib/compare-engine.ts", "utf8");
      expect(content).toContain("export async function getComparisonData");
    });

    it("should export getDifferencesOnly function", () => {
      const content = fs.readFileSync("src/lib/compare-engine.ts", "utf8");
      expect(content).toContain("export async function getDifferencesOnly");
    });

    it("should support LISTING + PRODUCT + MODEL comparison types", () => {
      const content = fs.readFileSync("src/lib/compare-engine.ts", "utf8");
      expect(content).toContain("LISTING");
      expect(content).toContain("PRODUCT");
      expect(content).toContain("MODEL");
    });
  });

  // ── 5. Compare Schema ──
  describe("5. Compare Schema", () => {
    it("should have ComparisonSession model", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model ComparisonSession");
    });

    it("should have ComparisonItem model", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model ComparisonItem");
    });
  });

  // ── 6. API Routes ──
  describe("6. API Routes", () => {
    it("should have /api/price-estimate route", () => {
      expect(fs.existsSync("src/app/api/price-estimate/route.ts")).toBe(true);
    });

    it("should have /api/price-history route", () => {
      expect(fs.existsSync("src/app/api/price-history/route.ts")).toBe(true);
    });

    it("should have /api/compare route", () => {
      expect(fs.existsSync("src/app/api/compare/route.ts")).toBe(true);
    });
  });

  // ── 7. Admin ──
  describe("7. Admin", () => {
    it("should have /admin/price-intelligence page", () => {
      expect(fs.existsSync("src/app/admin/price-intelligence/page.tsx")).toBe(true);
    });
  });

  // ── 8. Price Override ──
  describe("8. Price Override", () => {
    it("should have PriceOverride model in schema", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("PriceOverride");
    });

    it("price-engine should export createOverride function", () => {
      const content = fs.readFileSync("src/lib/price-engine.ts", "utf8");
      expect(content).toContain("export async function createOverride");
    });
  });

  // ── 9. Price Range Data ──
  describe("9. Price Range Data", () => {
    it("should have listings with varying prices for comparable analysis", async () => {
      const listings = await db.listing.findMany({
        where: { status: "PUBLISHED", price: { not: null } },
        select: { price: true, brandId: true },
        take: 20,
      });
      const uniquePrices = new Set(listings.map(l => l.price?.toString()));
      expect(uniquePrices.size).toBeGreaterThan(1);
    });

    it("should have listings from multiple brands for comparison", async () => {
      const brands = await db.listing.groupBy({
        by: ["brandId"],
        _count: true,
        where: { status: "PUBLISHED", price: { not: null } },
      });
      expect(brands.length).toBeGreaterThan(1);
    });
  });
});
