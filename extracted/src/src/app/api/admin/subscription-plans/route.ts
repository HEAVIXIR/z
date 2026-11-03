import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serialize a SubscriptionPlan row (BigInt → string) and include subscriber count. */
async function serialize(p: any) {
  const count = await db.premiumSubscription.count({
    where: { plan: p.code },
  });
  return {
    ...p,
    priceMonthly: p.priceMonthly?.toString() ?? "0",
    priceYearly: p.priceYearly?.toString() ?? null,
    subscriberCount: count,
  };
}

/* GET /api/admin/subscription-plans — list all plans ordered by sortOrder. */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const plans = await db.subscriptionPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const out = await Promise.all(plans.map(serialize));
    return NextResponse.json({ success: true, plans: out });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/subscription-plans — create a new plan. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));

    const code = String(body.code ?? "").trim();
    const nameFa = String(body.nameFa ?? "").trim();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "code الزامی است" },
        { status: 400 },
      );
    }
    if (!nameFa) {
      return NextResponse.json(
        { success: false, error: "nameFa الزامی است" },
        { status: 400 },
      );
    }

    const existing = await db.subscriptionPlan.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `طرح با کد «${code}» قبلاً ثبت شده است`,
        },
        { status: 409 },
      );
    }

    const data: any = {
      code,
      nameFa,
      nameEn: body.nameEn ? String(body.nameEn) : null,
      description: body.description ? String(body.description) : null,
      priceMonthly: parseBig(body.priceMonthly) ?? BigInt(0),
      priceYearly: parseBig(body.priceYearly),
      currency: body.currency ? String(body.currency) : "IRR",
      featuredCredits: num(body.featuredCredits, 0),
      analyticsAccess: Boolean(body.analyticsAccess),
      aiAssistantAccess: Boolean(body.aiAssistantAccess),
      priorityLeads: Boolean(body.priorityLeads),
      companyPage: Boolean(body.companyPage),
      maxListings: num(body.maxListings, 0),
      maxImages: num(body.maxImages, 8),
      verifiedBadge: Boolean(body.verifiedBadge),
      supportLevel: body.supportLevel ? String(body.supportLevel) : null,
      sortOrder: num(body.sortOrder, 0),
      active: body.active !== false,
      popular: Boolean(body.popular),
      featuresJson: normalizeJson(body.featuresJson),
    };

    const plan = await db.subscriptionPlan.create({ data });

    await audit("subscription_plan.create", plan.id, null, data);

    return NextResponse.json({
      success: true,
      plan: await serialize(plan),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ── helpers ── */
function num(v: any, def: number): number {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : def;
}

function normalizeJson(v: any): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

async function audit(
  action: string,
  entityId: string,
  before: any,
  after: any,
) {
  try {
    await db.auditLog.create({
      data: {
        actorType: "ADMIN",
        action,
        entityType: "SubscriptionPlan",
        entityId,
        beforeJson: before ? JSON.stringify(before).slice(0, 4000) : null,
        afterJson: after ? JSON.stringify(after).slice(0, 4000) : null,
      },
    });
  } catch {
    /* best-effort */
  }
}
