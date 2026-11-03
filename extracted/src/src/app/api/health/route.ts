import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERSION = "1.0";

/* GET /api/health
   --------------------------------
   Public health-check endpoint. Returns:
     {
       status:   "ok" | "error",
       timestamp: ISO string,
       db:        "connected" | "error",
       version:   "1.0",
       dbLatencyMs?: number   (when connected)
     }

   DB probe: `$queryRaw` SELECT 1 — fastest possible round-trip
   that doesn't depend on any table existing. Failures are
   caught, logged via trackError, and surfaced as db:"error"
   (with HTTP 503 so load balancers can drain). */
export async function GET() {
  const timestamp = new Date().toISOString();
  let dbStatus: "connected" | "error" = "error";
  let dbLatencyMs: number | undefined;

  try {
    const t0 = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
    dbStatus = "connected";
  } catch (err: any) {
    // Don't trackError here — health probes can be frequent and
    // we don't want to flood the audit log. Just log to console.
    console.error("[health] db probe failed:", err?.message ?? err);
  }

  const ok = dbStatus === "connected";
  return NextResponse.json(
    {
      status: ok ? "ok" : "error",
      timestamp,
      db: dbStatus,
      version: VERSION,
      ...(dbLatencyMs !== undefined ? { dbLatencyMs } : {}),
    },
    { status: ok ? 200 : 503 },
  );
}
