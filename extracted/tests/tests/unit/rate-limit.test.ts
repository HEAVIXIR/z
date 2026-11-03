import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  rateLimit,
  resetRateLimit,
  retryAfterSeconds,
} from "@/lib/rate-limit";

/* ============================================================
   Unit tests for src/lib/rate-limit.ts (P0-6, P1-20)
   HEAVIX-SECURITY-BASELINE-V1.md §6  (Rate Limit / Abuse)
   HEAVIX-P0-IMPLEMENTATION-PLAN.md   STEP 5 (Rate Limit / Abuse)
   ------------------------------------------------------------
   Verifies:
     • Allows up to `limit` requests, then blocks the next one.
     • `remaining` counts down correctly.
     • After the window elapses, the bucket resets (using fake timers).
     • retryAfterSeconds returns ≥1 (RFC 6585 §4).
     • resetRateLimit clears a specific bucket.
     • Different keys have independent buckets.
   ============================================================ */

// Unique key prefix per test file so we never collide with other
// test files that might import rate-limit in the same process.
const KEY_PREFIX = `test:rate-limit:${Math.random().toString(36).slice(2)}:`;

describe("rateLimit basic enforcement", () => {
  it("allows up to `limit` requests and then blocks the next", () => {
    const key = `${KEY_PREFIX}basic`;
    resetRateLimit(key);

    const limit = 5;
    const windowMs = 10_000;

    // First `limit` requests must be allowed.
    for (let i = 0; i < limit; i += 1) {
      const r = rateLimit({ key, limit, windowMs });
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(limit - (i + 1));
    }

    // The (limit + 1)-th request must be blocked.
    const blocked = rateLimit({ key, limit, windowMs });
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("returns correct remaining count", () => {
    const key = `${KEY_PREFIX}remaining`;
    resetRateLimit(key);

    const limit = 3;
    const windowMs = 10_000;

    const r1 = rateLimit({ key, limit, windowMs });
    expect(r1.remaining).toBe(2); // 3 - 1
    const r2 = rateLimit({ key, limit, windowMs });
    expect(r2.remaining).toBe(1); // 3 - 2
    const r3 = rateLimit({ key, limit, windowMs });
    expect(r3.remaining).toBe(0); // 3 - 3
    const r4 = rateLimit({ key, limit, windowMs });
    expect(r4.ok).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it("uses independent buckets for different keys", () => {
    const keyA = `${KEY_PREFIX}indep-a`;
    const keyB = `${KEY_PREFIX}indep-b`;
    resetRateLimit(keyA);
    resetRateLimit(keyB);

    const limit = 2;
    const windowMs = 10_000;

    // Exhaust bucket A.
    rateLimit({ key: keyA, limit, windowMs });
    rateLimit({ key: keyA, limit, windowMs });
    expect(rateLimit({ key: keyA, limit, windowMs }).ok).toBe(false);

    // Bucket B must still be allowed.
    expect(rateLimit({ key: keyB, limit, windowMs }).ok).toBe(true);
  });
});

describe("rateLimit window reset", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resets after the window elapses (fake timers)", () => {
    const key = `${KEY_PREFIX}reset`;
    resetRateLimit(key);

    const limit = 2;
    const windowMs = 5_000;

    // Exhaust the bucket at t=0.
    expect(rateLimit({ key, limit, windowMs }).ok).toBe(true);
    expect(rateLimit({ key, limit, windowMs }).ok).toBe(true);
    expect(rateLimit({ key, limit, windowMs }).ok).toBe(false);

    // Advance time past the window.
    vi.advanceTimersByTime(windowMs + 1);

    // The bucket must reset — first request after window must be allowed.
    const after = rateLimit({ key, limit, windowMs });
    expect(after.ok).toBe(true);
    expect(after.remaining).toBe(1); // 2 - 1
  });

  it("does NOT reset before the window elapses", () => {
    const key = `${KEY_PREFIX}no-reset`;
    resetRateLimit(key);

    const limit = 1;
    const windowMs = 5_000;

    expect(rateLimit({ key, limit, windowMs }).ok).toBe(true);
    expect(rateLimit({ key, limit, windowMs }).ok).toBe(false);

    // Just before the window elapses.
    vi.advanceTimersByTime(windowMs - 1);
    expect(rateLimit({ key, limit, windowMs }).ok).toBe(false);
  });
});

describe("rateLimit resetRateLimit helper", () => {
  it("clears a specific bucket so subsequent requests are allowed again", () => {
    const key = `${KEY_PREFIX}manual-reset`;
    resetRateLimit(key);

    const limit = 1;
    const windowMs = 10_000;

    expect(rateLimit({ key, limit, windowMs }).ok).toBe(true);
    expect(rateLimit({ key, limit, windowMs }).ok).toBe(false);

    // Manually reset → next request should pass.
    resetRateLimit(key);
    expect(rateLimit({ key, limit, windowMs }).ok).toBe(true);
  });
});

describe("retryAfterSeconds", () => {
  it("returns at least 1 second (RFC 6585 §4)", () => {
    const now = Date.now();
    // resetAt === now → 0 ms left → must still return ≥ 1.
    expect(retryAfterSeconds(now)).toBeGreaterThanOrEqual(1);
  });

  it("returns the ceil of seconds remaining", () => {
    const now = Date.now();
    // 2500 ms in the future → ceil(2.5) = 3.
    expect(retryAfterSeconds(now + 2500)).toBe(3);
  });
});
