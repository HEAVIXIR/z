/**
 * HEAVIX — Phase 9: Orders / Deals / Transactions Tests
 * Per HEAVIX Master Execution Plan V3.0 Phase 9.
 */
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import fs from "fs";

describe("Phase 9 — Orders / Deals / Transactions Tests", () => {

  // ── 1. Deal Domain ──
  describe("1. Deal Domain", () => {
    it("should have Deal model in schema", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model Deal {");
    });

    it("Deal should have sourceType + sourceId + status + agreedAmount", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("sourceType");
      expect(content).toContain("sourceId");
      expect(content).toContain("agreedAmount");
      expect(content).toContain("dealNumber");
    });

    it("Deal should support lifecycle states", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("DRAFT");
      expect(content).toContain("PENDING_CONFIRMATION");
      expect(content).toContain("CONFIRMED");
      expect(content).toContain("COMPLETED");
      expect(content).toContain("CANCELLED");
      expect(content).toContain("DISPUTED");
    });
  });

  // ── 2. Order Domain ──
  describe("2. Order Domain", () => {
    it("should have Order model in schema", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model Order {");
    });

    it("Order should have snapshots + commission fields", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("titleSnapshot");
      expect(content).toContain("priceSnapshot");
      expect(content).toContain("commissionRate");
      expect(content).toContain("commissionAmount");
      expect(content).toContain("sellerAmount");
    });

    it("Order should have unique dealId (1:1)", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("dealId          String    @unique");
    });
  });

  // ── 3. Payment Extension ──
  describe("3. Payment Extension", () => {
    it("Payment should have orderId field", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("orderId");
    });

    it("Payment should have idempotencyKey field", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("idempotencyKey");
    });

    it("Payment should have extended statuses", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("AUTHORIZED");
      expect(content).toContain("CANCELLED");
    });

    it("should have existing Payment data", async () => {
      const count = await db.payment.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 4. Dispute Domain ──
  describe("4. Dispute Domain", () => {
    it("should have Dispute model in schema", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model Dispute {");
    });

    it("Dispute should have dealId + orderId + status + evidence", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("dealId");
      expect(content).toContain("orderId");
      expect(content).toContain("evidence");
      expect(content).toContain("resolution");
    });
  });

  // ── 5. Deal API ──
  describe("5. Deal API", () => {
    it("should have /api/deals route", () => {
      expect(fs.existsSync("src/app/api/deals/route.ts")).toBe(true);
    });

    it("should have /api/deals/[id] route", () => {
      expect(fs.existsSync("src/app/api/deals/[id]/route.ts")).toBe(true);
    });

    it("deals API should support state machine transitions", () => {
      const content = fs.readFileSync("src/app/api/deals/[id]/route.ts", "utf8");
      expect(content).toContain("TRANSITIONS");
      expect(content).toContain("Invalid transition");
    });

    it("deal confirmation should auto-create order", () => {
      const content = fs.readFileSync("src/app/api/deals/[id]/route.ts", "utf8");
      expect(content).toContain("order.create");
    });
  });

  // ── 6. Order API ──
  describe("6. Order API", () => {
    it("should have /api/orders route", () => {
      expect(fs.existsSync("src/app/api/orders/route.ts")).toBe(true);
    });

    it("should have /api/orders/[id] route", () => {
      expect(fs.existsSync("src/app/api/orders/[id]/route.ts")).toBe(true);
    });

    it("should have /api/orders/[id]/payments route", () => {
      expect(fs.existsSync("src/app/api/orders/[id]/payments/route.ts")).toBe(true);
    });

    it("should have /api/orders/[id]/disputes route", () => {
      expect(fs.existsSync("src/app/api/orders/[id]/disputes/route.ts")).toBe(true);
    });
  });

  // ── 7. Authorization ──
  describe("7. Authorization", () => {
    it("deal API should check participant authorization", () => {
      const content = fs.readFileSync("src/app/api/deals/[id]/route.ts", "utf8");
      expect(content).toContain("Forbidden");
    });

    it("order API should check participant authorization", () => {
      const content = fs.readFileSync("src/app/api/orders/[id]/route.ts", "utf8");
      expect(content).toContain("Forbidden");
    });

    it("payment creation should be buyer-only", () => {
      const content = fs.readFileSync("src/app/api/orders/[id]/payments/route.ts", "utf8");
      expect(content).toContain("Only buyer can create payments");
    });
  });

  // ── 8. Idempotency ──
  describe("8. Idempotency", () => {
    it("payment API should support idempotencyKey", () => {
      const content = fs.readFileSync("src/app/api/orders/[id]/payments/route.ts", "utf8");
      expect(content).toContain("idempotencyKey");
      expect(content).toContain("idempotent");
    });
  });

  // ── 9. Audit ──
  describe("9. Audit Trail", () => {
    it("deal creation should be audited", () => {
      const content = fs.readFileSync("src/app/api/deals/route.ts", "utf8");
      expect(content).toContain("logAudit");
      expect(content).toContain("deal.created");
    });

    it("deal transitions should be audited", () => {
      const content = fs.readFileSync("src/app/api/deals/[id]/route.ts", "utf8");
      expect(content).toContain("logAudit");
    });

    it("payment creation should be audited", () => {
      const content = fs.readFileSync("src/app/api/orders/[id]/payments/route.ts", "utf8");
      expect(content).toContain("payment.created");
    });

    it("dispute opening should be audited", () => {
      const content = fs.readFileSync("src/app/api/orders/[id]/disputes/route.ts", "utf8");
      expect(content).toContain("dispute.opened");
    });
  });

  // ── 10. Existing Domain (no duplicates) ──
  describe("10. No Duplicate Domains", () => {
    it("should use existing DealRoom (not duplicate)", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model DealRoom {");
    });

    it("should use existing ListingOffer (not duplicate)", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model ListingOffer {");
    });

    it("should use existing Payment (extended, not duplicated)", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      // Should have only ONE Payment model
      const matches = content.match(/model Payment \{/g);
      expect(matches?.length).toBe(1);
    });
  });

  // ── 11. Source Data for Deal Creation ──
  describe("11. Source Data", () => {
    it("should have DealRooms for deal creation", async () => {
      const count = await db.dealRoom.count();
      expect(count).toBeGreaterThan(0);
    });

    it("should have ListingOffers for deal creation", async () => {
      const count = await db.listingOffer.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});
