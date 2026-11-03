/* ============================================================
   HEAVIX — Rate Limiting (P0-6 / HEAVIX-SECURITY-BASELINE-V1 §6)
   ------------------------------------------------------------
   In-memory, fixed-window rate limiter for dev/preview.

   Production note: this is intentionally in-process and per-instance.
   For a multi-instance production deployment the same `rateLimit()`
   contract should be backed by Redis (or another shared store) so the
   limit is enforced cluster-wide. The function signature below is the
   stable public contract that callers depend on — swapping the
   backing store must not change it.

   Contract:
     rateLimit({ key, limit, windowMs }) => {
       ok: boolean,        // true if the request is allowed
       remaining: number,  // requests left in the current window
       resetAt: number,    // epoch-ms when the window resets
     }
   ============================================================ */

export interface RateLimitParams {
  /** Bucket key, e.g. `ip:login` or `userId:upload`. */
  key: string;
  /** Maximum requests allowed within `windowMs`. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

interface Bucket {
  /** Number of requests counted in the current window. */
  count: number;
  /** Epoch-ms when the current window resets. */
  resetAt: number;
}

// ── Module-level state ─────────────────────────────────────────
// A single global Map keeps memory bounded across all callers in the
// same process. Entries are evicted by the periodic sweeper below.
const buckets = new Map<string, Bucket>();

// Sweeper interval: 60s. The sweeper removes expired buckets so the
// Map does not grow unboundedly for ephemeral keys (e.g. unique IPs
// hitting /login from a botnet). Node's setInterval keeps the event
// loop alive — we .unref() so this never blocks process shutdown.
const SWEEP_INTERVAL_MS = 60_000;
let sweeperTimer: ReturnType<typeof setInterval> | null = null;

function ensureSweeper(): void {
  if (sweeperTimer) return;
  try {
    sweeperTimer = setInterval(() => {
      const now = Date.now();
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }, SWEEP_INTERVAL_MS);
    sweeperTimer.unref?.();
  } catch {
    /* no-op — in some runtimes unref is unavailable */
  }
}

/**
 * Check (and increment) the rate-limit bucket for `params.key`.
 *
 * Always increments on a successful call — i.e. the caller does not
 * need to call again to "consume" the quota. If `ok === false` the
 * request must be rejected with HTTP 429.
 */
export function rateLimit(params: RateLimitParams): RateLimitResult {
  const { key, limit, windowMs } = params;
  const now = Date.now();

  ensureSweeper();

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    // Start a fresh window.
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const ok = bucket.count <= limit;

  return {
    ok,
    remaining,
    resetAt: bucket.resetAt,
  };
}

/**
 * Reset a specific bucket (e.g. after a successful login, to release
 * pressure on the LOGIN bucket for that IP). Optional utility — most
 * callers do not need this.
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * Compute the `Retry-After` header value (whole seconds) for a 429
 * response. Always at least 1 to comply with RFC 6585 §4.
 */
export function retryAfterSeconds(resetAt: number): number {
  const ms = Math.max(0, resetAt - Date.now());
  return Math.max(1, Math.ceil(ms / 1000));
}
