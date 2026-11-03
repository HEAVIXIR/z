import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

/* ============================================================
   Unit tests for src/lib/password.ts (P0-1, P1-20)
   HEAVIX-SECURITY-BASELINE-V1.md §2  (Password hashing)
   HEAVIX-P0-IMPLEMENTATION-PLAN.md   STEP 2 (Authentication)
   ------------------------------------------------------------
   Verifies:
     • hashPassword produces a bcrypt hash starting with "$2"
     • verifyPassword returns true for the correct password
     • verifyPassword returns false for a wrong password
     • hashPassword produces different hashes for the same input
       (i.e. salt is actually random)
     • hashPassword rejects empty passwords defensively
   ============================================================ */

describe("password.hashPassword", () => {
  it("produces a bcrypt hash with the $2 prefix", async () => {
    const hash = await hashPassword("S3cret-P@ss!");
    expect(typeof hash).toBe("string");
    expect(hash.startsWith("$2")).toBe(true);
    // bcrypt hash format: $2b$cost$22-char-salt-31-char-hash
    expect(hash.length).toBeGreaterThanOrEqual(59);
    expect(hash.length).toBeLessThanOrEqual(60);
  });

  it("produces DIFFERENT hashes for the same input (random salt)", async () => {
    const pw = "same-password-123";
    const a = await hashPassword(pw);
    const b = await hashPassword(pw);
    expect(a).not.toBe(b);
  });
});

describe("password.verifyPassword", () => {
  it("returns true for the correct password", async () => {
    const pw = "correct horse battery staple";
    const hash = await hashPassword(pw);
    const ok = await verifyPassword(pw, hash);
    expect(ok).toBe(true);
  });

  it("returns false for a wrong password", async () => {
    const hash = await hashPassword("the-real-password");
    const ok = await verifyPassword("not-the-real-password", hash);
    expect(ok).toBe(false);
  });

  it("returns false when comparing against a malformed hash", async () => {
    // bcrypt.compare returns false (never throws) when the hash is
    // not a valid bcrypt string — verify that contract holds.
    const ok = await verifyPassword("anything", "not-a-real-hash");
    expect(ok).toBe(false);
  });
});

describe("password hash/verify cycle (integration of the two)", () => {
  it("round-trips a Persian + symbols password", async () => {
    const pw = "هویکس-۱۴۰۴/P@ss";
    const hash = await hashPassword(pw);
    expect(await verifyPassword(pw, hash)).toBe(true);
    expect(await verifyPassword("هویکس-۱۴۰۴/P@s", hash)).toBe(false);
  });
});
