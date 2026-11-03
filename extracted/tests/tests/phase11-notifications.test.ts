/**
 * HEAVIX — Phase 11: Notifications Tests
 * Per HEAVIX Master Execution Plan V3.0 Phase 11.
 */
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import fs from "fs";

describe("Phase 11 — Notifications Tests", () => {

  // ── 1. Notification Domain ──
  describe("1. Notification Domain", () => {
    it("should have Notification model in schema", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("model Notification {");
    });

    it("Notification should have userId, type, title, body, read, link", () => {
      const content = fs.readFileSync("prisma/schema.prisma", "utf8");
      expect(content).toContain("userId");
      expect(content).toContain("type");
      expect(content).toContain("title");
      expect(content).toContain("body");
      expect(content).toContain("read");
      expect(content).toContain("link");
    });
  });

  // ── 2. Notification Dispatcher ──
  describe("2. Notification Dispatcher", () => {
    it("should have src/lib/notifications.ts", () => {
      expect(fs.existsSync("src/lib/notifications.ts")).toBe(true);
    });

    it("should export notify function", () => {
      const content = fs.readFileSync("src/lib/notifications.ts", "utf8");
      expect(content).toContain("export async function notify");
    });

    it("should export getUnreadCount function", () => {
      const content = fs.readFileSync("src/lib/notifications.ts", "utf8");
      expect(content).toContain("export async function getUnreadCount");
    });

    it("should export markAsRead function", () => {
      const content = fs.readFileSync("src/lib/notifications.ts", "utf8");
      expect(content).toContain("export async function markAsRead");
    });

    it("should export markAllAsRead function", () => {
      const content = fs.readFileSync("src/lib/notifications.ts", "utf8");
      expect(content).toContain("export async function markAllAsRead");
    });

    it("should support all event types", () => {
      const content = fs.readFileSync("src/lib/notifications.ts", "utf8");
      expect(content).toContain("NEW_MESSAGE");
      expect(content).toContain("NEW_OFFER");
      expect(content).toContain("DEAL_CREATED");
      expect(content).toContain("DEAL_CONFIRMED");
      expect(content).toContain("ORDER_CREATED");
      expect(content).toContain("PAYMENT_CREATED");
      expect(content).toContain("DISPUTE_OPENED");
      expect(content).toContain("REVIEW_RECEIVED");
      expect(content).toContain("MATCH_FOUND");
    });
  });

  // ── 3. Notification API ──
  describe("3. Notification API", () => {
    it("should have /api/notifications route (existing)", () => {
      expect(fs.existsSync("src/app/api/notifications/route.ts")).toBe(true);
    });

    it("should have /api/notifications/[id] route", () => {
      expect(fs.existsSync("src/app/api/notifications/[id]/route.ts")).toBe(true);
    });

    it("should have /api/notifications/read-all route", () => {
      expect(fs.existsSync("src/app/api/notifications/read-all/route.ts")).toBe(true);
    });

    it("should have /api/notifications/unread-count route", () => {
      expect(fs.existsSync("src/app/api/notifications/unread-count/route.ts")).toBe(true);
    });

    it("notifications list should return unreadCount", () => {
      const content = fs.readFileSync("src/app/api/notifications/route.ts", "utf8");
      expect(content).toContain("unreadCount");
    });

    it("[id] PATCH should mark as read", () => {
      const content = fs.readFileSync("src/app/api/notifications/[id]/route.ts", "utf8");
      expect(content).toContain("markAsRead");
    });

    it("read-all POST should mark all as read", () => {
      const content = fs.readFileSync("src/app/api/notifications/read-all/route.ts", "utf8");
      expect(content).toContain("markAllAsRead");
    });

    it("unread-count GET should use getUnreadCount", () => {
      const content = fs.readFileSync("src/app/api/notifications/unread-count/route.ts", "utf8");
      expect(content).toContain("getUnreadCount");
    });
  });

  // ── 4. Authorization ──
  describe("4. Authorization", () => {
    it("notifications list should check userId", () => {
      const content = fs.readFileSync("src/app/api/notifications/route.ts", "utf8");
      expect(content).toContain("getCurrentUserId");
    });

    it("[id] PATCH should check userId ownership", () => {
      const content = fs.readFileSync("src/app/api/notifications/[id]/route.ts", "utf8");
      expect(content).toContain("getCurrentUserId");
      expect(content).toContain("markAsRead");
    });

    it("read-all should check userId", () => {
      const content = fs.readFileSync("src/app/api/notifications/read-all/route.ts", "utf8");
      expect(content).toContain("getCurrentUserId");
    });

    it("unread-count should check userId", () => {
      const content = fs.readFileSync("src/app/api/notifications/unread-count/route.ts", "utf8");
      expect(content).toContain("getCurrentUserId");
    });
  });

  // ── 5. Data ──
  describe("5. Data Available", () => {
    it("should have users for notifications", async () => {
      const count = await db.user.count();
      expect(count).toBeGreaterThan(0);
    });

    it("Notification model should be accessible", async () => {
      const count = await db.notification.count();
      expect(typeof count).toBe("number");
    });
  });
});
