import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";
import { getEffectiveRate, usdToIrr } from "@/lib/store-currency";
import { getStoreUserWithRole } from "@/lib/store-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/orders — HEAVIX store order endpoints

   Auth model (issue 1 — "one login for all HEAVIX sections"):
   - If the caller is logged in to HEAVIX (heavix-user cookie), we
     attach their `userId` to the created order and use it to scope
     GET responses.
   - If the caller is a HEAVIX admin (heavix-admin cookie), GET
     returns ALL orders regardless of userId/phone.
   - Phone-based lookup is kept for backwards compatibility (the
     pre-login flow) so existing customers with no HEAVIX account
     can still see their orders by phone.

   GET  ?phone=X        → list this customer's orders by phone
        ?userId=X       → list this user's orders by HEAVIX userId
        ?mine=true      → list the current session user's orders
        (admin session) → list all orders
   POST body:           → create a new order from cart
     { phone, name, family, address, items: [{partId, quantity}],
       mechanicId?, couponCode?, notes? }
     The userId is auto-attached from the session if the caller is
     logged in to HEAVIX. If not logged in, the order is still
     created (phone-only) but no userId is set.
   ============================================================ */

function genOrderNumber(): string {
  const t = Date.now().toString(36).toUpperCase().slice(-6);
  const r = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `HV-${t}${r}`;
}

function serializeOrder(o: any) {
  return {
    ...o,
    subtotalUsd: Number(o.subtotalUsd ?? 0),
    shippingUsd: Number(o.shippingUsd ?? 0),
    discountIrr: Number(o.discountIrr ?? 0),
    totalUsd: Number(o.totalUsd ?? 0),
    totalIrr: Number(o.totalIrr ?? 0),
    currencyRateAtOrder: Number(o.currencyRateAtOrder ?? 0),
    marginPercentAtOrder: Number(o.marginPercentAtOrder ?? 0),
    createdAt: o.createdAt?.toISOString?.() ?? null,
    updatedAt: o.updatedAt?.toISOString?.() ?? null,
    items: (o.items || []).map((it: any) => ({
      ...it,
      unitPriceUsd: Number(it.unitPriceUsd ?? 0),
      unitPriceIrr: Number(it.unitPriceIrr ?? 0),
      lineTotalUsd: Number(it.lineTotalUsd ?? 0),
      lineTotalIrr: Number(it.lineTotalIrr ?? 0),
    })),
    payments: (o.payments || []).map((p: any) => ({
      ...p,
      amountIrr: Number(p.amountIrr ?? 0),
      amountUsd: Number(p.amountUsd ?? 0),
      createdAt: p.createdAt?.toISOString?.() ?? null,
      reviewedAt: p.reviewedAt?.toISOString?.() ?? null,
    })),
    shipment: o.shipment
      ? {
          ...o.shipment,
          shippedAt: o.shipment.shippedAt?.toISOString?.() ?? null,
          deliveredAt: o.shipment.deliveredAt?.toISOString?.() ?? null,
        }
      : null,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const phone = (url.searchParams.get("phone") || "").trim();
    const userIdParam = (url.searchParams.get("userId") || "").trim();
    const mine = url.searchParams.get("mine") === "true";

    // Resolve the current session user (with admin flag).
    const sessionUser = await getStoreUserWithRole();

    // Admin → return all orders.
    if (sessionUser?.isAdmin) {
      const orders = await storeDb.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          items: { include: { part: { select: { id: true, name: true, nameFa: true, sku: true, images: true, active: true } } } },
          payments: { orderBy: { createdAt: "desc" } },
          shipment: true,
          mechanic: { select: { id: true, name: true, family: true, shopName: true, phone: true } },
        },
      });
      return NextResponse.json({ orders: orders.map(serializeOrder), admin: true });
    }

    // ?mine=true → use the session user's id.
    if (mine && sessionUser?.id) {
      const orders = await storeDb.order.findMany({
        where: { userId: sessionUser.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          items: { include: { part: { select: { id: true, name: true, nameFa: true, sku: true, images: true, active: true } } } },
          payments: { orderBy: { createdAt: "desc" } },
          shipment: true,
          mechanic: { select: { id: true, name: true, family: true, shopName: true, phone: true } },
        },
      });
      return NextResponse.json({ orders: orders.map(serializeOrder) });
    }

    // Explicit userId filter (e.g. from the HEAVIX dashboard).
    if (userIdParam) {
      // Only allow the user to query their own orders (or admin, handled above).
      if (sessionUser && sessionUser.id !== userIdParam) {
        return NextResponse.json({ error: "غیرمجاز" }, { status: 403 });
      }
      const orders = await storeDb.order.findMany({
        where: { userId: userIdParam },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          items: { include: { part: { select: { id: true, name: true, nameFa: true, sku: true, images: true, active: true } } } },
          payments: { orderBy: { createdAt: "desc" } },
          shipment: true,
          mechanic: { select: { id: true, name: true, family: true, shopName: true, phone: true } },
        },
      });
      return NextResponse.json({ orders: orders.map(serializeOrder) });
    }

    // Backwards-compat phone lookup.
    if (!phone || phone.length < 8) {
      return NextResponse.json({ orders: [] });
    }

    const customer = await storeDb.customer.findUnique({ where: { phone } });
    if (!customer) {
      return NextResponse.json({ orders: [] });
    }

    // Scope by userId too when available so a logged-in user doesn't
    // see orders placed under the same phone by a different account.
    const where = sessionUser?.id
      ? { customerId: customer.id, userId: sessionUser.id }
      : { customerId: customer.id };

    const orders = await storeDb.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        items: { include: { part: { select: { id: true, name: true, nameFa: true, sku: true, images: true, active: true } } } },
        payments: { orderBy: { createdAt: "desc" } },
        shipment: true,
        mechanic: { select: { id: true, name: true, family: true, shopName: true, phone: true } },
      },
    });

    return NextResponse.json({ orders: orders.map(serializeOrder) });
  } catch (e: any) {
    console.error("[api/store/orders GET] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = String(body.phone || "").trim();
    const name = String(body.name || "").trim();
    const family = String(body.family || "").trim();
    const address = String(body.address || "").trim();
    const notes = body.notes ? String(body.notes) : null;
    const mechanicId = body.mechanicId ? String(body.mechanicId) : null;
    const couponCode = body.couponCode ? String(body.couponCode).trim().toUpperCase() : null;
    const itemsInput: Array<{ partId: string; quantity: number }> = Array.isArray(body.items)
      ? body.items
          .map((it: any) => ({ partId: String(it.partId || ""), quantity: Math.max(1, Number(it.quantity) || 1) }))
          .filter((it) => it.partId)
      : [];

    // Resolve the current HEAVIX user (if any).
    const sessionUser = await getStoreUserWithRole();

    // If the caller is logged in to HEAVIX, auto-fill name/phone/email
    // from their profile when not explicitly provided. This implements
    // the "orders appear in their HEAVIX registered profile" behavior.
    const finalName = name || sessionUser?.firstName || "";
    const finalFamily = family || sessionUser?.lastName || "";
    const finalPhone = phone || sessionUser?.mobile || "";

    if (!finalPhone || finalPhone.length < 8) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }
    if (!finalName) {
      return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });
    }
    if (!address) {
      return NextResponse.json({ error: "آدرس الزامی است" }, { status: 400 });
    }
    if (itemsInput.length === 0) {
      return NextResponse.json({ error: "سبد خرید خالی است" }, { status: 400 });
    }

    // upsert customer
    const customer = await storeDb.customer.upsert({
      where: { phone: finalPhone },
      update: { name: finalName, family: finalFamily || "", address },
      create: { phone: finalPhone, name: finalName, family: finalFamily || "", address },
    });

    // load parts (active only) — snapshot prices
    const partIds = itemsInput.map((it) => it.partId);
    const parts = await storeDb.part.findMany({
      where: { id: { in: partIds }, active: true },
    });

    if (parts.length !== partIds.length) {
      return NextResponse.json({ error: "برخی قطعات یافت نشد یا غیرفعال هستند" }, { status: 400 });
    }

    // effective rate at order time
    const eff = await getEffectiveRate();

    // shipping flat fee (USD)
    const shippingUsd = 2;

    // build items + totals
    let subtotalUsd = 0;
    let subtotalIrr = 0;
    const orderItemsData: any[] = [];
    for (const it of itemsInput) {
      const part = parts.find((p) => p.id === it.partId);
      if (!part) continue;
      if (part.stock < it.quantity) {
        return NextResponse.json(
          { error: `موجودی قطعه «${part.nameFa || part.name}» کافی نیست` },
          { status: 400 },
        );
      }
      const unitPriceUsd = part.priceUsd;
      const unitPriceIrr = usdToIrr(unitPriceUsd, eff);
      const lineTotalUsd = unitPriceUsd * it.quantity;
      const lineTotalIrr = unitPriceIrr * it.quantity;
      subtotalUsd += lineTotalUsd;
      subtotalIrr += lineTotalIrr;
      orderItemsData.push({
        partId: part.id,
        partNameSnapshot: part.nameFa || part.name,
        quantity: it.quantity,
        unitPriceUsd,
        unitPriceIrr,
        lineTotalUsd,
        lineTotalIrr,
      });
    }

    // coupon validation
    let discountIrr = 0;
    let appliedCouponCode: string | null = null;
    if (couponCode) {
      const coupon = await storeDb.coupon.findUnique({ where: { code: couponCode } });
      if (coupon && coupon.active) {
        const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
        const limitReached = coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit;
        const meetsMin = subtotalIrr >= (coupon.minOrderIrr || 0);
        if (!expired && !limitReached && meetsMin) {
          appliedCouponCode = coupon.code;
          if (coupon.type === "PERCENT") {
            discountIrr = Math.round((subtotalIrr * coupon.value) / 100);
          } else {
            discountIrr = Math.round(coupon.value);
          }
          discountIrr = Math.min(discountIrr, subtotalIrr);
        }
      }
    }

    const totalUsd = subtotalUsd + shippingUsd;
    const totalIrr = Math.max(0, subtotalIrr + Math.round(shippingUsd * eff.rate * (1 + (eff.marginPercent || 0) / 100)) - discountIrr);

    // create order + items + decrement stock + increment soldCount + bump coupon usage
    const orderNumber = genOrderNumber();
    const order = await storeDb.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          // Link to the HEAVIX User (main DB) so the order shows up in
          // their dashboard. Null for phone-only (guest) orders.
          userId: sessionUser?.id || null,
          mechanicId: mechanicId || null,
          status: "PENDING",
          subtotalUsd,
          shippingUsd,
          discountIrr,
          totalUsd,
          totalIrr,
          currencyRateAtOrder: eff.rate,
          marginPercentAtOrder: eff.marginPercent,
          couponCode: appliedCouponCode,
          shippingAddress: address,
          notes,
          paymentStatus: "UNPAID",
          items: { create: orderItemsData },
        },
        include: {
          items: true,
          mechanic: { select: { id: true, name: true, family: true, shopName: true, phone: true } },
        },
      });

      // decrement stock + increment soldCount per part
      for (const it of orderItemsData) {
        await tx.part.update({
          where: { id: it.partId },
          data: {
            stock: { decrement: it.quantity },
            soldCount: { increment: it.quantity },
          },
        });
      }

      // bump coupon usage
      if (appliedCouponCode) {
        await tx.coupon.update({
          where: { code: appliedCouponCode },
          data: { usedCount: { increment: 1 } },
        });
      }

      // update customer stats
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalOrders: { increment: 1 },
          totalSpentIrr: { increment: totalIrr },
        },
      });

      return o;
    });

    return NextResponse.json({
      ok: true,
      order: serializeOrder(order),
      // Surface whether the order was linked to a HEAVIX account so the
      // client can show the right post-checkout messaging.
      linkedToUser: !!sessionUser?.id,
    });
  } catch (e: any) {
    console.error("[api/store/orders POST] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
