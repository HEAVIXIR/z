import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

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

/* GET /api/admin/subscription-plans/[id] */
export async function GET(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const plan = await db.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "طرح یافت نشد" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, plan: await serialize(plan) });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/admin/subscription-plans/[id] — update any plan field. */
export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "طرح یافت نشد" },
        { status: 404 },
      );
    }
    const body = await req.json().catch(() => ({}));

    const data: any = {};

    if ("code" in body) {
      const newCode = String(body.code ?? "").trim();
      if (!newCode) {
        return NextResponse.json(
          { success: false, error: "code نمی‌تواند خالی باشد" },
          { status: 400 },
        );
      }
      if (newCode !== existing.code) {
        const conflict = await db.subscriptionPlan.findUnique({
          where: { code: newCode },
        });
        if (conflict) {
          return NextResponse.json(
            {
              success: false,
              error: `طرح با کد «${newCode}» قبلاً ثبت شده است`,
            },
            { status: 409 },
          );
        }
      }
      data.code = newCode;
    }
    if ("nameFa" in body) {
      const v = String(body.nameFa ?? "").trim();
      if (!v) {
        return NextResponse.json(
          { success: false, error: "nameFa نمی‌تواند خالی باشد" },
          { status: 400 },
        );
      }
      data.nameFa = v;
    }
    if ("nameEn" in body) data.nameEn = body.nameEn ? String(body.nameEn) : null;
    if ("description" in body)
      data.description = body.description ? String(body.description) : null;
    if ("priceMonthly" in body) {
      const b = parseBig(body.priceMonthly);
      data.priceMonthly = b ?? BigInt(0);
    }
    if ("priceYearly" in body) {
      data.priceYearly = parseBig(body.priceYearly);
    }
    if ("currency" in body)
      data.currency = body.currency ? String(body.currency) : "IRR";
    if ("featuredCredits" in body)
      data.featuredCredits = num(body.featuredCredits, 0);
    if ("analyticsAccess" in body)
      data.analyticsAccess = Boolean(body.analyticsAccess);
    if ("aiAssistantAccess" in body)
      data.aiAssistantAccess = Boolean(body.aiAssistantAccess);
    if ("priorityLeads" in body)
      data.priorityLeads = Boolean(body.priorityLeads);
    if ("companyPage" in body) data.companyPage = Boolean(body.companyPage);
    if ("maxListings" in body) data.maxListings = num(body.maxListings, 0);
    if ("maxImages" in body) data.maxImages = num(body.maxImages, 8);
    if ("verifiedBadge" in body)
      data.verifiedBadge = Boolean(body.verifiedBadge);
    if ("supportLevel" in body)
      data.supportLevel = body.supportLevel ? String(body.supportLevel) : null;
    if ("sortOrder" in body) data.sortOrder = num(body.sortOrder, 0);
    if ("active" in body) data.active = body.active !== false;
    if ("popular" in body) data.popular = Boolean(body.popular);
    if ("featuresJson" in body)
      data.featuresJson = normalizeJson(body.featuresJson);

    const plan = await db.subscriptionPlan.update({
      where: { id },
      data,
    });

    await audit("subscription_plan.update", plan.id, existing, data);

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

/* DELETE /api/admin/subscription-plans/[id] */
export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "طرح یافت نشد" },
        { status: 404 },
      );
    }

    // Prevent delete if any PremiumSubscription uses this plan code.
    const subscribers = await db.premiumSubscription.count({
      where: { plan: existing.code },
    });
    if (subscribers > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `این طرح به ${subscribers} اشتراک فعال اختصاص دارد و قابل حذف نیست. ابتدا طرح اشتراک‌ها را تغییر دهید.`,
        },
        { status: 409 },
      );
    }

    await db.subscriptionPlan.delete({ where: { id } });

    await audit("subscription_plan.delete", id, existing, null);

    return NextResponse.json({ success: true });
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
