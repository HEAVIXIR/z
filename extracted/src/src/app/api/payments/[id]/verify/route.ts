import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { trackError } from "@/lib/error-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/payments/[id]/verify
   --------------------------------
   Admin-only. Marks a payment as PAID (or FAILED / REFUNDED).
   Body:
     {
       status: "PAID" | "FAILED" | "REFUNDED"  (default "PAID")
       trackingCode?: string
       reason?: string
     }

   On PAID, sets paidAt = now. If the payment has a subscriptionId
   and the type is SUBSCRIPTION, also flips the linked
   PremiumSubscription.status to ACTIVE (so a manual verify
   immediately unlocks the plan features). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const status = String(body.status ?? "PAID").toUpperCase();
    const ALLOWED = ["PAID", "FAILED", "REFUNDED"];
    if (!ALLOWED.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED.join(", ")}` },
        { status: 400 },
      );
    }

    const before = await db.payment.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const data: any = {
      status,
      ...(body.trackingCode
        ? { trackingCode: String(body.trackingCode) }
        : {}),
    };
    if (status === "PAID") {
      data.paidAt = new Date();
    }

    const after = await db.payment.update({ where: { id }, data });

    // Auto-activate the linked subscription on PAID SUBSCRIPTION
    // payments so the admin's verify click is the single action
    // needed to unlock plan features for a manual/offline payment.
    if (
      status === "PAID" &&
      before.type === "SUBSCRIPTION" &&
      before.subscriptionId
    ) {
      try {
        await db.premiumSubscription.update({
          where: { id: before.subscriptionId },
          data: { status: "ACTIVE", paymentRef: id },
        });
      } catch (subErr: any) {
        // Don't fail the verify just because the sub activation
        // failed (e.g. orphaned subscriptionId) — log + continue.
        console.error(
          "[payments.verify] sub activation failed:",
          subErr?.message ?? subErr,
        );
      }
    }

    await logAudit({
      actorType: "ADMIN",
      action: "payment.verify",
      entityType: "Payment",
      entityId: id,
      before: { ...before, amount: before.amount.toString() },
      after: { ...after, amount: after.amount.toString() },
      reason: body.reason ? String(body.reason) : `Marked ${status}`,
    });

    return NextResponse.json({
      ok: true,
      payment: { ...after, amount: after.amount.toString() },
    });
  } catch (err: any) {
    trackError(err, { endpoint: "POST /api/payments/[id]/verify" });
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
