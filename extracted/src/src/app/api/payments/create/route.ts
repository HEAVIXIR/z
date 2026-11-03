import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { trackError } from "@/lib/error-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/payments/create
   --------------------------------
   Auth-required. Creates a PENDING Payment row for the current
   user. Body:
     {
       amount:        string|number  (IRR — required)
       type:          "SUBSCRIPTION" | "FEATURED_LISTING" | "PROMOTION" | "LEAD_FEE" | "INSPECTION_FEE"
       subscriptionId?: string
       gateway?:      "ZARINPAL" | "PAYIR" | "MANUAL"  (default "ZARINPAL")
       trackingCode?: string
       currency?:     string (default "IRR")
     }

   Returns the created payment row (amount serialized as string
   because BigInt isn't JSON-serializable). The actual gateway
   redirect / callback handling is out of scope for FIX-GAPS-2 —
   this endpoint just opens the ledger row. A real integration
   would call the gateway's `createPayment` API here and store
   the gateway-side authority code in `trackingCode`. */
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const amount = parseBig(body.amount);
    if (!amount || amount <= 0n) {
      return NextResponse.json({ error: "amount is required" }, { status: 400 });
    }
    const type = String(body.type ?? "").toUpperCase();
    const ALLOWED = [
      "SUBSCRIPTION",
      "FEATURED_LISTING",
      "PROMOTION",
      "LEAD_FEE",
      "INSPECTION_FEE",
    ];
    if (!ALLOWED.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${ALLOWED.join(", ")}` },
        { status: 400 },
      );
    }
    const gateway = body.gateway
      ? String(body.gateway).toUpperCase()
      : "ZARINPAL";

    const payment = await db.payment.create({
      data: {
        userId,
        subscriptionId: body.subscriptionId
          ? String(body.subscriptionId)
          : null,
        amount,
        currency: body.currency ?? "IRR",
        type,
        status: "PENDING",
        gateway,
        trackingCode: body.trackingCode ? String(body.trackingCode) : null,
      },
    });

    await logAudit({
      actorId: userId,
      actorType: "USER",
      action: "payment.create",
      entityType: "Payment",
      entityId: payment.id,
      after: {
        amount: amount.toString(),
        type,
        gateway,
        subscriptionId: payment.subscriptionId,
      },
    });

    return NextResponse.json({
      ok: true,
      payment: {
        ...payment,
        amount: payment.amount.toString(),
      },
    });
  } catch (err: any) {
    trackError(err, { endpoint: "POST /api/payments/create", userId });
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
