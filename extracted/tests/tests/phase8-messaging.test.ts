/**
 * HEAVIX — Phase 8: Messaging & Negotiation Tests
 * Per HEAVIX Master Execution Plan V3.0 Phase 8.
 */
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import fs from "fs";

describe("Phase 8 — Messaging & Negotiation Tests", () => {

  // ── 1. Conversation Domain ──
  describe("1. Conversation Domain", () => {
    it("should have Conversation model in schema", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model Conversation");
    });

    it("should have Message model in schema", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model Message");
    });

    it("Conversation should have participant1Id + participant2Id + listingId", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("participant1Id");
      expect(content).toContain("participant2Id");
      expect(content).toContain("listingId");
    });

    it("Message should have body + attachmentUrl + read + readAt", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("body");
      expect(content).toContain("attachmentUrl");
      expect(content).toContain("read");
      expect(content).toContain("readAt");
    });
  });

  // ── 2. DealRoom (existing) ──
  describe("2. DealRoom Domain (existing)", () => {
    it("should have DealRoom model", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model DealRoom");
    });

    it("should have DealMessage model", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model DealMessage");
    });

    it("should have DealDocument model", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model DealDocument");
    });
  });

  // ── 3. Offer / Quote (existing) ──
  describe("3. Offer / Quote Domain", () => {
    it("should have ListingOffer model", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model ListingOffer");
    });

    it("should have RFQQuote model", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model RFQQuote");
    });

    it("ListingOffer should have offerAmount + status + counterAmount", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("offerAmount");
      expect(content).toContain("counterAmount");
    });
  });

  // ── 4. Messaging API ──
  describe("4. Messaging API", () => {
    it("should have /api/conversations route", () => {
      expect(fs.existsSync("src/app/api/conversations/route.ts")).toBe(true);
    });

    it("should have /api/conversations/[id] route", () => {
      expect(fs.existsSync("src/app/api/conversations/[id]/route.ts")).toBe(true);
    });

    it("should have /api/conversations/[id]/messages route", () => {
      expect(fs.existsSync("src/app/api/conversations/[id]/messages/route.ts")).toBe(true);
    });

    it("conversations API should support GET (list) + POST (create)", () => {
      const content = fs.readFileSync("src/app/api/conversations/route.ts", "utf8");
      expect(content).toContain("export async function GET");
      expect(content).toContain("export async function POST");
    });

    it("messages API should support GET (list) + POST (send)", () => {
      const content = fs.readFileSync("src/app/api/conversations/[id]/messages/route.ts", "utf8");
      expect(content).toContain("export async function GET");
      expect(content).toContain("export async function POST");
    });
  });

  // ── 5. Authorization ──
  describe("5. Authorization", () => {
    it("conversations API should check userId", () => {
      const content = fs.readFileSync("src/app/api/conversations/route.ts", "utf8");
      expect(content).toContain("getCurrentUserId");
    });

    it("conversation [id] should verify participant", () => {
      const content = fs.readFileSync("src/app/api/conversations/[id]/route.ts", "utf8");
      expect(content).toContain("Forbidden");
    });

    it("messages API should verify participant", () => {
      const content = fs.readFileSync("src/app/api/conversations/[id]/messages/route.ts", "utf8");
      expect(content).toContain("Forbidden");
    });
  });

  // ── 6. Audit ──
  describe("6. Audit Trail", () => {
    it("conversation create should be audited", () => {
      const content = fs.readFileSync("src/app/api/conversations/route.ts", "utf8");
      expect(content).toContain("logAudit");
      expect(content).toContain("conversation.create");
    });

    it("message send should be audited", () => {
      const content = fs.readFileSync("src/app/api/conversations/[id]/messages/route.ts", "utf8");
      expect(content).toContain("logAudit");
      expect(content).toContain("message.send");
    });
  });

  // ── 7. Existing DealRoom API ──
  describe("7. Existing DealRoom API", () => {
    it("should have /api/deal-rooms route", () => {
      expect(fs.existsSync("src/app/api/deal-rooms/route.ts")).toBe(true);
    });

    it("should have /api/deal-rooms/[id] route", () => {
      expect(fs.existsSync("src/app/api/deal-rooms/[id]/route.ts")).toBe(true);
    });
  });

  // ── 8. Data ──
  describe("8. Data Available", () => {
    it("should have users for conversations", async () => {
      const count = await db.user.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it("should have listings for conversation context", async () => {
      const count = await db.listing.count({ where: { status: "PUBLISHED" } });
      expect(count).toBeGreaterThan(0);
    });
  });
});
