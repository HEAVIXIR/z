import { NextResponse } from "next/server";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { getClientIp, rateLimitKey } from "@/lib/request-context";
import { trackEvent, ANALYTICS_EVENT_TYPES } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   POST /api/analytics/track — PUBLIC analytics ingest endpoint.
   ------------------------------------------------------------
   Body: {
     eventType: string,            // must be one of ANALYTICS_EVENT_TYPES
     userId?, listingId?, categoryId?, brandId?,
     query?, page?, referrer?, metadata?
   }

   Rate-limited: 100 requests / minute / IP (in-memory fixed window).
   On 429 the response carries `Retry-After` (RFC 6585 §4).

   Always returns 204 No Content (or a 429/400) — fire-and-forget
   from the caller's perspective. The persist itself is detached
   inside `trackEvent`, so even a slow DB write does not extend
   this response's latency.
   ============================================================ */

export async function POST(req: Request) {
  try {
    // ── Rate limit (100 / min / IP) ──
    const ip = getClientIp(req);
    const rl = rateLimit({
      key: rateLimitKey(ip, "analytics-track"),
      limit: 100,
      windowMs: 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: retryAfterSeconds(rl.resetAt) },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds(rl.resetAt)),
            "X-RateLimit-Remaining": String(rl.remaining),
            "X-RateLimit-Reset": String(rl.resetAt),
          },
        },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const eventType = String((body as any).eventType ?? "").trim().toUpperCase();
    if (!eventType) {
      return NextResponse.json({ error: "eventType is required" }, { status: 400 });
    }
    if (!(ANALYTICS_EVENT_TYPES as readonly string[]).includes(eventType)) {
      return NextResponse.json(
        { error: `eventType must be one of: ${ANALYTICS_EVENT_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    const userAgent = req.headers.get("user-agent") ?? null;

    // Fire-and-forget persist. Never throws, never blocks.
    trackEvent({
      eventType,
      userId: pickStr((body as any).userId),
      listingId: pickStr((body as any).listingId),
      categoryId: pickStr((body as any).categoryId),
      brandId: pickStr((body as any).brandId),
      query: pickStr((body as any).query),
      page: pickStr((body as any).page),
      referrer: pickStr((body as any).referrer) ?? (req.headers.get("referer") ?? null),
      ip,
      userAgent,
      metadata:
        (body as any).metadata && typeof (body as any).metadata === "object"
          ? (body as any).metadata
          : null,
    });

    return new NextResponse(null, {
      status: 204,
      headers: {
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(rl.resetAt),
      },
    });
  } catch (err: any) {
    // Even on unexpected error, do not propagate to the caller —
    // analytics must NEVER break user flows. Just log + 500.
    console.warn("[analytics/track] error:", err?.message ?? err);
    return NextResponse.json(
      { error: "Analytics ingest failed" },
      { status: 500 },
    );
  }
}

function pickStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s.slice(0, 500) : null;
}
