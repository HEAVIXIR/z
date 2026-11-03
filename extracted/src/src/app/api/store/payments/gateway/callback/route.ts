import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";
import { verifyPayment } from "@/lib/store-zarinpal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/payments/gateway/callback — PUBLIC gateway callback

   Query params: ?orderId=X&phone=Y&Authority=Z&Status=OK|NOK
                 (or ?payment=mock for sandbox)

   Verifies the payment with Zarinpal (or treats it as success in
   mock mode), updates the Payment row, and flips the order's
   paymentStatus to PAID. Then redirects back to /store with a
   success/failure toast param.
   ============================================================ */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId") || "";
    const phone = url.searchParams.get("phone") || "";
    const authority = url.searchParams.get("Authority") || "";
    const status = url.searchParams.get("Status") || "";
    const isMock = url.searchParams.get("payment") === "mock";

    // No order context — go back to /store
    if (!orderId) {
      return NextResponse.redirect(new URL("/store?payment=failed", url.origin));
    }

    const order = await storeDb.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) {
      return NextResponse.redirect(new URL("/store?payment=failed", url.origin));
    }

    const payment = order.payments.find(
      (p) => p.authority === authority || (isMock && p.gateway === "MOCK" && p.status === "PENDING"),
    );
    if (!payment) {
      return NextResponse.redirect(new URL(`/store?payment=failed&order=${order.orderNumber}`, url.origin));
    }

    // verify
    const verify = await verifyPayment({
      authority: payment.authority || authority,
      status: status || (isMock ? "OK" : "NOK"),
      amountIrr: Number(payment.amountIrr),
    });

    if (!verify.success) {
      await storeDb.payment.update({
        where: { id: payment.id },
        data: { status: "REJECTED" },
      });
      await storeDb.order.update({
        where: { id: order.id },
        data: { paymentStatus: "UNPAID" },
      });
      return NextResponse.redirect(new URL(`/store?payment=failed&order=${order.orderNumber}`, url.origin));
    }

    // success — mark APPROVED + flip order to PAID
    await storeDb.payment.update({
      where: { id: payment.id },
      data: {
        status: "APPROVED",
        refId: verify.refId,
        reviewedAt: new Date(),
      },
    });

    // recompute order's payment status from approved payments sum
    const approvedPayments = await storeDb.payment.findMany({
      where: { orderId: order.id, status: "APPROVED" },
    });
    const approvedSum = approvedPayments.reduce((s, p) => s + Number(p.amountIrr), 0);
    const totalIrr = Number(order.totalIrr);
    const newPayStatus = approvedSum >= totalIrr ? "PAID" : approvedSum > 0 ? "PARTIAL" : "UNPAID";
    await storeDb.order.update({
      where: { id: order.id },
      data: { paymentStatus: newPayStatus, status: "CONFIRMED" },
    });

    return NextResponse.redirect(new URL(`/store?payment=success&order=${order.orderNumber}`, url.origin));
  } catch (e: any) {
    console.error("[api/store/payments/gateway/callback GET] error:", e);
    const url = new URL(req.url);
    return NextResponse.redirect(new URL("/store?payment=failed", url.origin));
  }
}
