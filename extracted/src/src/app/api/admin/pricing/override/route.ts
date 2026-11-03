import { NextResponse } from "next/server";
import { isAuthenticated, ADMIN_CREDENTIALS } from "@/lib/auth";
import { createOverride } from "@/lib/price-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/admin/pricing/override
   Admin only. Creates a PriceOverride (with audit log) per spec §13.

   Body: { listingId, overridePrice, reason }
*/
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, any>;
    const listingId = String(body.listingId ?? "").trim();
    const overridePrice = Number(body.overridePrice);
    const reason = String(body.reason ?? "").trim();

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }
    if (!Number.isFinite(overridePrice) || overridePrice <= 0) {
      return NextResponse.json(
        { error: "overridePrice must be a positive number" },
        { status: 400 },
      );
    }
    if (reason.length < 3) {
      return NextResponse.json(
        { error: "reason is required (min 3 chars)" },
        { status: 400 },
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;

    const created = await createOverride({
      listingId,
      overridePrice,
      reason,
      adminId: ADMIN_CREDENTIALS.username,
      ip,
      userAgent,
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
