import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";
import { requestPayment } from "@/lib/store-zarinpal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/payments/gateway/request — PUBLIC gateway request

   Body: { orderId, phone }

   Creates a Payment row with method=GATEWAY, status=PENDING, and
   the gateway authority. Returns { gatewayUrl, authority, method,
   paymentId } so the client can redirect.
   ============================================================ */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = String(body.orderId || "");
    const phone = String(body.phone || "").trim();

    if (!orderId) {
      return NextResponse.json({ error: "orderId الزامی است" }, { status: 400 });
    }
    if (!phone || phone.length < 8) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }

    const order = await storeDb.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (!order) {
      return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
    }

    const amountIrr = Math.round(Number(order.totalIrr));
    if (amountIrr <= 0) {
      return NextResponse.json({ error: "مبلغ سفارش نامعتبر است" }, { status: 400 });
    }

    // build callback URL (relative to the host the request came in on)
    const incoming = new URL(req.url);
    const origin = `${incoming.protocol}//${incoming.host}`;
    const callbackUrl = `${origin}/api/store/payments/gateway/callback?orderId=${order.id}&phone=${encodeURIComponent(phone)}`;

    const { authority, gatewayUrl, method } = await requestPayment({
      amountIrr,
      description: `سفارش ${order.orderNumber} — فروشگاه هویکس`,
      callbackUrl,
      mobile: phone,
      orderNumber: order.orderNumber,
    });

    const payment = await storeDb.payment.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        amountIrr,
        amountUsd: order.currencyRateAtOrder > 0 ? amountIrr / (order.currencyRateAtOrder * (1 + (order.marginPercentAtOrder || 0) / 100)) : 0,
        method: "GATEWAY",
        status: "PENDING",
        gateway: method,
        authority,
        gatewayUrl,
      },
    });

    return NextResponse.json({
      ok: true,
      authority,
      gatewayUrl,
      method,
      paymentId: payment.id,
    });
  } catch (e: any) {
    console.error("[api/store/payments/gateway/request POST] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
