import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/coupons/validate — PUBLIC coupon validation
   Body: { code, subtotalIrr }
   Returns: CouponValidation shape (valid, type, value, discountIrr,
            subtotalIrr, totalAfterDiscount, error?)
   ============================================================ */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = String(body.code || "").trim().toUpperCase();
    const subtotalIrr = Number(body.subtotalIrr) || 0;

    if (!code) {
      return NextResponse.json({ valid: false, error: "کد تخفیف را وارد کنید" });
    }

    const coupon = await storeDb.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.active) {
      return NextResponse.json({ valid: false, error: "کد تخفیف نامعتبر است" });
    }

    const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
    if (expired) {
      return NextResponse.json({ valid: false, error: "کد تخفیف منقضی شده است" });
    }

    const limitReached = coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit;
    if (limitReached) {
      return NextResponse.json({ valid: false, error: "سقف استفاده از این کد تکمیل شده است" });
    }

    if (subtotalIrr < (coupon.minOrderIrr || 0)) {
      return NextResponse.json({
        valid: false,
        error: `حداقل سفارش برای این کد ${new Intl.NumberFormat("fa-IR").format(coupon.minOrderIrr)} تومان است`,
      });
    }

    let discountIrr = 0;
    if (coupon.type === "PERCENT") {
      discountIrr = Math.round((subtotalIrr * coupon.value) / 100);
    } else {
      discountIrr = Math.round(coupon.value);
    }
    discountIrr = Math.min(discountIrr, subtotalIrr);
    const totalAfterDiscount = Math.max(0, subtotalIrr - discountIrr);

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountIrr,
      subtotalIrr,
      totalAfterDiscount,
    });
  } catch (e: any) {
    console.error("[api/store/coupons/validate POST] error:", e);
    return NextResponse.json(
      { valid: false, error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
