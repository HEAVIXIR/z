import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/payments/manual — PUBLIC manual receipt submission

   Body: { orderId, phone, method: CARD|CASH, amountIrr,
           referenceCode?, payerName?, payerCard?, note? }

   Creates a Payment row with status=PENDING. The admin verifies
   (approves/rejects) from /admin/store/payments. On approval the
   related order's paymentStatus is auto-flipped to PAID/PARTIAL.
   ============================================================ */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = String(body.orderId || "");
    const phone = String(body.phone || "").trim();
    const method = body.method === "CASH" ? "CASH" : "CARD";
    const amountIrr = Number(body.amountIrr) || 0;
    const referenceCode = body.referenceCode ? String(body.referenceCode) : null;
    const payerName = body.payerName ? String(body.payerName) : null;
    const payerCard = body.payerCard ? String(body.payerCard) : null;
    const note = body.note ? String(body.note) : null;

    if (!orderId) {
      return NextResponse.json({ error: "orderId الزامی است" }, { status: 400 });
    }
    if (!phone || phone.length < 8) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }
    if (amountIrr <= 0) {
      return NextResponse.json({ error: "مبلغ پرداخت نامعتبر است" }, { status: 400 });
    }

    const order = await storeDb.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (!order) {
      return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
    }

    // resolve customer (the order's customer, but require phone match)
    if (!order.customer || order.customer.phone !== phone) {
      // also allow lookup by phone
      const byPhone = await storeDb.customer.findUnique({ where: { phone } });
      if (!byPhone || byPhone.id !== order.customerId) {
        return NextResponse.json(
          { error: "شماره موبایل با سفارش مطابقت ندارد" },
          { status: 403 },
        );
      }
    }

    const payment = await storeDb.payment.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        amountIrr,
        amountUsd: order.currencyRateAtOrder > 0 ? amountIrr / (order.currencyRateAtOrder * (1 + (order.marginPercentAtOrder || 0) / 100)) : 0,
        method,
        status: "PENDING",
        referenceCode,
        payerName,
        payerCard,
        note,
      },
    });

    return NextResponse.json({
      ok: true,
      payment: {
        ...payment,
        amountIrr: Number(payment.amountIrr),
        amountUsd: Number(payment.amountUsd),
        createdAt: payment.createdAt?.toISOString?.() ?? null,
        reviewedAt: payment.reviewedAt?.toISOString?.() ?? null,
      },
      message: "فیش شما با موفقیت ثبت شد. پس از تأیید مدیر، سفارش پردازش خواهد شد.",
    });
  } catch (e: any) {
    console.error("[api/store/payments/manual POST] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
