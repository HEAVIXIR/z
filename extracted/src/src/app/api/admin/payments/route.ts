import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { trackError } from "@/lib/error-tracking";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(p: any) {
  return {
    ...p,
    amount: p.amount ? p.amount.toString() : null,
  };
}

/* GET /api/admin/payments
   --------------------------------
   Admin-only. Lists all payments, newest first. Supports:
     ?status=PENDING|PAID|FAILED|REFUNDED
     ?type=SUBSCRIPTION|FEATURED_LISTING|PROMOTION|LEAD_FEE|INSPECTION_FEE
     ?userId=<id>
     ?take=<n>  (default 100, max 500)

   Includes the user's name/mobile for the admin table. */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const take = Math.min(
      500,
      Math.max(1, Number(url.searchParams.get("take") ?? 100)),
    );
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");
    const userId = url.searchParams.get("userId");

    const where: any = {};
    if (status) where.status = String(status).toUpperCase();
    if (type) where.type = String(type).toUpperCase();
    if (userId) where.userId = String(userId);

    const [items, total, stats] = await Promise.all([
      db.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mobile: true,
              email: true,
            },
          },
        },
      }),
      db.payment.count({ where }),
      {
        pending: await db.payment.count({ where: { status: "PENDING" } }),
        paid: await db.payment.count({ where: { status: "PAID" } }),
        failed: await db.payment.count({ where: { status: "FAILED" } }),
        refunded: await db.payment.count({ where: { status: "REFUNDED" } }),
        revenuePaid: (await db.payment.aggregate({
          where: { status: "PAID" },
          _sum: { amount: true },
        }))._sum.amount?.toString() ?? "0",
      },
    ]);

    return NextResponse.json({
      payments: items.map(serialize),
      total,
      stats,
    });
  } catch (err: any) {
    trackError(err, { endpoint: "GET /api/admin/payments" });
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/payments
   --------------------------------
   Admin-only. Creates a MANUAL payment row on behalf of a user
   (for offline / cash / bank-transfer payments). Body:
     {
       userId:        string  (required)
       amount:        string|number  (required, IRR)
       type:          "SUBSCRIPTION" | "FEATURED_LISTING" | ...
       subscriptionId?: string
       gateway?:      "MANUAL" (default)
       trackingCode?: string  (e.g. bank receipt number)
       markPaid?:     boolean (default true — admin is creating
                              an already-paid offline payment)
     }

   The payment is created with gateway="MANUAL" and (by default)
   status=PAID + paidAt=now, because the typical flow is: user
   pays offline → admin records the payment as already-settled.
   Pass `markPaid: false` to create a PENDING manual payment
   (e.g. awaiting bank confirmation). */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId ?? "");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const amount = parseBig(body.amount);
    if (!amount || amount <= 0n) {
      return NextResponse.json({ error: "amount is required" }, { status: 400 });
    }
    const type = String(body.type ?? "SUBSCRIPTION").toUpperCase();
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
    const markPaid = body.markPaid !== false; // default true

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const payment = await db.payment.create({
      data: {
        userId,
        subscriptionId: body.subscriptionId
          ? String(body.subscriptionId)
          : null,
        amount,
        currency: body.currency ?? "IRR",
        type,
        status: markPaid ? "PAID" : "PENDING",
        gateway: body.gateway ? String(body.gateway).toUpperCase() : "MANUAL",
        trackingCode: body.trackingCode ? String(body.trackingCode) : null,
        paidAt: markPaid ? new Date() : null,
      },
    });

    // On markPaid + SUBSCRIPTION type + linked subscriptionId,
    // activate the subscription so plan features unlock
    // immediately.
    if (
      markPaid &&
      type === "SUBSCRIPTION" &&
      payment.subscriptionId
    ) {
      try {
        await db.premiumSubscription.update({
          where: { id: payment.subscriptionId },
          data: { status: "ACTIVE", paymentRef: payment.id },
        });
      } catch (subErr: any) {
        console.error(
          "[admin.payments] sub activation failed:",
          subErr?.message ?? subErr,
        );
      }
    }

    await logAudit({
      actorType: "ADMIN",
      action: "payment.create_manual",
      entityType: "Payment",
      entityId: payment.id,
      after: {
        userId,
        amount: amount.toString(),
        type,
        gateway: payment.gateway,
        status: payment.status,
      },
    });

    return NextResponse.json({ ok: true, payment: serialize(payment) });
  } catch (err: any) {
    trackError(err, { endpoint: "POST /api/admin/payments" });
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
