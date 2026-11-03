/* ============================================================
   HEAVIX — Rate Limit Presets (P0-6)
   ------------------------------------------------------------
   Centralised per-endpoint rate-limit policies.
   Tuned to protect auth/upload/AI endpoints from brute-force and
   resource-exhaustion abuse while leaving legitimate use unaffected.

   Every preset documents:
     • limit    — max requests per window per key
     • windowMs — window length in ms
     • scope    — what the key represents (IP or userId)

   Keys are constructed by callers as `${identity}:${endpoint}` so
   that a single identity cannot trivially bypass by hitting a
   different (but related) endpoint.
   ============================================================ */

export interface RateLimitPreset {
  /** Max requests allowed within `windowMs`. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** What the per-bucket identity represents. */
  scope: "ip" | "user";
  /** Human-readable endpoint label, for logging/metrics. */
  label: string;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/* ── Authentication ─────────────────────────────────────────── */

/** POST /api/auth/login — 10 per 15 min per IP. */
export const LOGIN: RateLimitPreset = {
  limit: 10,
  windowMs: 15 * MINUTE,
  scope: "ip",
  label: "login",
};

/** POST /api/auth/register — 5 per hour per IP. */
export const REGISTER: RateLimitPreset = {
  limit: 5,
  windowMs: HOUR,
  scope: "ip",
  label: "register",
};

/** POST /api/auth/verify-email — 10 per hour per IP. */
export const VERIFY: RateLimitPreset = {
  limit: 10,
  windowMs: HOUR,
  scope: "ip",
  label: "verify-email",
};

/** POST /api/auth/resend-verification — 3 per hour per IP. */
export const RESEND: RateLimitPreset = {
  limit: 3,
  windowMs: HOUR,
  scope: "ip",
  label: "resend-verification",
};

/* ── Resource-consuming endpoints ───────────────────────────── */

/** POST /api/upload — 20 per hour per user (falls back to IP for anon). */
export const UPLOAD: RateLimitPreset = {
  limit: 20,
  windowMs: HOUR,
  scope: "user",
  label: "upload",
};

/** POST /api/ai-gateway — 30 per hour per user (falls back to IP). */
export const AI: RateLimitPreset = {
  limit: 30,
  windowMs: HOUR,
  scope: "user",
  label: "ai-gateway",
};

/** Messaging endpoints (offers / messages / contact-seller) — 30/h/user. */
export const MESSAGING: RateLimitPreset = {
  limit: 30,
  windowMs: HOUR,
  scope: "user",
  label: "messaging",
};

/**
 * Convenience map for runtime lookup by name (useful if a future
 * dispatcher selects presets dynamically).
 */
export const RATE_LIMIT_PRESETS = {
  LOGIN,
  REGISTER,
  VERIFY,
  RESEND,
  UPLOAD,
  AI,
  MESSAGING,
} as const;

export type RateLimitPresetName = keyof typeof RATE_LIMIT_PRESETS;
