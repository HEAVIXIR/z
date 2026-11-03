/**
 * HEAVIX — Phase 7: RFQ / Wanted / Matching Tests
 * Per HEAVIX Master Execution Plan V3.0 Phase 7.
 */
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import fs from "fs";

describe("Phase 7 — RFQ / Wanted / Matching Tests", () => {

  // ── 1. Wanted Domain ──
  describe("1. Wanted Domain (BuyRequest)", () => {
    it("should have BuyRequest model with data", async () => {
      const count = await db.buyRequest.count();
      expect(count).toBeGreaterThan(0);
    });

    it("should have ACTIVE requests", async () => {
      const count = await db.buyRequest.count({ where: { status: "ACTIVE" } });
      expect(count).toBeGreaterThan(0);
    });

    it("should have requests with category + budget", async () => {
      const req = await db.buyRequest.findFirst({ where: { status: "ACTIVE" } });
      expect(req).toBeTruthy();
      expect(req!.category).toBeTruthy();
      expect(req!.budgetMin).toBeTruthy();
    });

    it("should have requests with userId", async () => {
      const count = await db.buyRequest.count({ where: { userId: { not: null } } });
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 2. RFQ Domain ──
  describe("2. RFQ Domain", () => {
    it("should have RFQ model accessible", async () => {
      const count = await db.rFQ.count();
      expect(typeof count).toBe("number");
    });

    it("should have RFQQuote model accessible", async () => {
      const count = await db.rFQQuote.count();
      expect(typeof count).toBe("number");
    });
  });

  // ── 3. Matching Engine ──
  describe("3. Matching Engine", () => {
    it("should have matching-engine.ts file", () => {
      expect(fs.existsSync("src/lib/matching-engine.ts")).toBe(true);
    });

    it("should export matchRequestToListings function", () => {
      const content = fs.readFileSync("src/lib/matching-engine.ts", "utf8");
      expect(content).toContain("export async function matchRequestToListings");
    });

    it("should export matchAllRequests function", () => {
      const content = fs.readFileSync("src/lib/matching-engine.ts", "utf8");
      expect(content).toContain("export async function matchAllRequests");
    });

    it("should have scoring system with confidence levels", () => {
      const content = fs.readFileSync("src/lib/matching-engine.ts", "utf8");
      expect(content).toContain("HIGH");
      expect(content).toContain("MEDIUM");
      expect(content).toContain("LOW");
    });

    it("should have category + brand + price + location scoring", () => {
      const content = fs.readFileSync("src/lib/matching-engine.ts", "utf8");
      expect(content).toContain("category");
      expect(content).toContain("brand");
      expect(content).toContain("price");
      expect(content).toContain("city");
    });
  });

  // ── 4. Wanted API ──
  describe("4. Wanted API", () => {
    it("should have /api/wanted route", () => {
      expect(fs.existsSync("src/app/api/wanted/route.ts")).toBe(true);
    });

    it("should have /api/wanted/[id] route", () => {
      expect(fs.existsSync("src/app/api/wanted/[id]/route.ts")).toBe(true);
    });

    it("should have /api/wanted/[id]/matches route", () => {
      expect(fs.existsSync("src/app/api/wanted/[id]/matches/route.ts")).toBe(true);
    });

    it("should have /api/wanted/[id]/responses route", () => {
      expect(fs.existsSync("src/app/api/wanted/[id]/responses/route.ts")).toBe(true);
    });
  });

  // ── 5. Existing Admin ──
  describe("5. Existing Admin", () => {
    it("should have /admin/requests page", () => {
      expect(fs.existsSync("src/app/admin/requests/page.tsx")).toBe(true);
    });

    it("should have /admin/rfq page", () => {
      expect(fs.existsSync("src/app/admin/rfq/page.tsx")).toBe(true);
    });

    it("should have /api/admin/matching/run route", () => {
      expect(fs.existsSync("src/app/api/admin/matching/run/route.ts")).toBe(true);
    });
  });

  // ── 6. Matching Data ──
  describe("6. Matching Data Available", () => {
    it("should have published listings to match against", async () => {
      const count = await db.listing.count({ where: { status: "PUBLISHED" } });
      expect(count).toBeGreaterThan(0);
    });

    it("should have listings with prices for budget matching", async () => {
      const count = await db.listing.count({
        where: { status: "PUBLISHED", price: { not: null } },
      });
      expect(count).toBeGreaterThan(0);
    });

    it("should have listings with brands for brand matching", async () => {
      const count = await db.listing.count({
        where: { status: "PUBLISHED", brandId: { not: null } },
      });
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 7. Lifecycle ──
  describe("7. Wanted Lifecycle", () => {
    it("should support ACTIVE status", async () => {
      const count = await db.buyRequest.count({ where: { status: "ACTIVE" } });
      expect(count).toBeGreaterThan(0);
    });

    it("should support CANCELLED status (via DELETE API)", () => {
      const content = fs.readFileSync("src/app/api/wanted/[id]/route.ts", "utf8");
      expect(content).toContain("CANCELLED");
    });
  });
});
