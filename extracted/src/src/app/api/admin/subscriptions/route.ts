import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(s: any) {
  return {
    ...s,
    amount: s.amount ? s.amount.toString() : null,
  };
}

/* GET /api/admin/subscriptions — list + stats. */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [items, stats] = await Promise.all([
      db.premiumSubscription.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, firstName: true, lastName: true, mobile: true } } },
      }),
      {
        total: await db.premiumSubscription.count(),
        active: await db.premiumSubscription.count({ where: { status: "ACTIVE" } }),
        expired: await db.premiumSubscription.count({
          where: { expiresAt: { lt: new Date() } },
        }),
        basic: await db.premiumSubscription.count({ where: { plan: "BASIC" } }),
        pro: await db.premiumSubscription.count({ where: { plan: "PRO" } }),
        enterprise: await db.premiumSubscription.count({ where: { plan: "ENTERPRISE" } }),
      },
    ]);
    return NextResponse.json({
      subscriptions: items.map(serialize),
      stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/subscriptions — create/update. Body: { userId, plan?, ... } */
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
    const plan = body.plan || "BASIC";
    const amount = parseBig(body.amount);
    const data: any = {
      plan,
      status: body.status || "ACTIVE",
      featuredCredits: Number(body.featuredCredits) || 0,
      analyticsAccess: Boolean(body.analyticsAccess),
      aiAssistantAccess: Boolean(body.aiAssistantAccess),
      priorityLeads: Boolean(body.priorityLeads),
      companyPage: Boolean(body.companyPage),
      paymentRef: body.paymentRef ?? null,
    };
    if (amount) data.amount = amount;
    if (body.expiresAt) data.expiresAt = new Date(body.expiresAt);

    const s = await db.premiumSubscription.upsert({
      where: { userId },
      create: { userId, ...data, startedAt: new Date() },
      update: data,
    });
    return NextResponse.json({ ok: true, subscription: serialize(s) });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
