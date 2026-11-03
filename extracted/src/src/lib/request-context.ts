/* ============================================================
   HEAVIX — Request context helpers (P0-6)
   ------------------------------------------------------------
   Small utilities used by rate-limited API routes to extract a
   stable per-client identity. Lives here so all endpoints share
   the same definition of "IP" (and don't drift).
   ============================================================ */

/**
 * Best-effort client-IP extraction.
 *
 * Reads the canonical proxy headers (`x-forwarded-for`,
 * `x-real-ip`, `cf-connecting-ip`) and falls back to a sentinel
 * `"unknown"` when nothing is present (e.g. local dev). The
 * right-most trusted proxy hop is NOT stripped because in this
 * sandbox Caddy sits in front of Next.js and appends the real
 * client IP — the leftmost entry of `x-forwarded-for` is the
 * real client.
 */
export function getClientIp(req: Request): string {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xReal = h.get("x-real-ip");
  if (xReal) return xReal.trim();
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "unknown";
}

/**
 * Build a rate-limit bucket key.
 *
 * Caller passes the identity (IP for unauthenticated endpoints,
 * userId for authenticated ones) plus the endpoint label. We
 * combine them with a `:` so two endpoints never share a bucket
 * even if the identity is identical.
 */
export function rateLimitKey(identity: string, label: string): string {
  // Strip any `:` from the identity so the key stays unambiguous.
  const safe = identity.replace(/:/g, "_");
  return `${safe}:${label}`;
}
