import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseBig, parseNumber } from "@/lib/api-helpers";

/* ============================================================
   /api/admin/sell-in-7-days — admin endpoints for managing
   Sell-in-7-Days applications. (FIX-SALE-ANIM)

   GET    List applications with filters (q, status, step).
          Returns rows + summary stats.
   PATCH  Update a single application:
          - status, currentStep, inspectionDate,
            valuationPrice, salePrice, commissionAmount,
            prepaymentPaid, adminNotes (none yet), cancelled flag
          - action: "markSold" computes commissionAmount as
            1% (or configured rate) of salePrice and sets
            status=SOLD, currentStep=4, soldAt=now().
          - action: "markPrepaid" marks prepaymentPaid=true
            and bumps status to PREPAYMENT_PAID + step 2.
          - action: "scheduleInspection" sets inspectionDate
            and status=INSPECTION_SCHEDULED.
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "PENDING_PREPAYMENT",
  "PREPAYMENT_PAID",
  "INSPECTION_SCHEDULED",
  "INSPECTED",
  "VALUATION_DONE",
  "LISTED",
  "SOLD",
  "CANCELLED",
] as const;

const STATUS_STEP: Record<string, number> = {
  PENDING_PREPAYMENT: 1,
  PREPAYMENT_PAID: 2,
  INSPECTION_SCHEDULED: 2,
  INSPECTED: 3,
  VALUATION_DONE: 3,
  LISTED: 4,
  SOLD: 4,
  CANCELLED: 4,
};

async function getCommissionRate(): Promise<number> {
  try {
    const settings = await db.siteSettings.findUnique({ where: { id: "main" } });
    const r = settings?.sellIn7DaysCommissionRate;
    if (typeof r === "number" && r >= 0 && r <= 100) return r;
  } catch {
    /* ignore */
  }
  return 1;
}

function serializeApp(a: any) {
  return {
    id: a.id,
    trackingCode: a.trackingCode,
    sellerName: a.sellerName,
    sellerMobile: a.sellerMobile,
    sellerEmail: a.sellerEmail,
    deviceName: a.deviceName,
    categoryId: a.categoryId,
    brandId: a.brandId,
    modelName: a.modelName,
    year: a.year,
    workingHours: a.workingHours,
    condition: a.condition,
    province: a.province,
    city: a.city,
    expectedPrice: a.expectedPrice?.toString() ?? null,
    description: a.description,
    prepaymentPaid: a.prepaymentPaid,
    prepaymentAmount: a.prepaymentAmount?.toString() ?? null,
    status: a.status,
    currentStep: a.currentStep,
    inspectionDate: a.inspectionDate?.toISOString() ?? null,
    valuationPrice: a.valuationPrice?.toString() ?? null,
    salePrice: a.salePrice?.toString() ?? null,
    commissionAmount: a.commissionAmount?.toString() ?? null,
    soldAt: a.soldAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    brand: a.brand ? { id: a.brand.id, name: a.brand.name } : null,
    category: a.category ? { id: a.category.id, name: a.category.name } : null,
  };
}

/* ----------------------------- GET ------------------------------ */
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();
  const stepRaw = (url.searchParams.get("step") ?? "").trim();
  const step = stepRaw ? parseNumber(stepRaw) : null;
  const limit = Math.min(parseNumber(url.searchParams.get("limit")) ?? 100, 200);
  const offset = parseNumber(url.searchParams.get("offset")) ?? 0;

  const where: any = {};
  if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
    where.status = status;
  }
  if (step && step >= 1 && step <= 4) {
    where.currentStep = step;
  }
  if (q) {
    where.OR = [
      { trackingCode: { contains: q.toUpperCase() } },
      { deviceName: { contains: q } },
      { sellerName: { contains: q } },
      { sellerMobile: { contains: q } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.sellIn7DaysApplication.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    db.sellIn7DaysApplication.count({ where }),
  ]);

  // Resolve brand + category labels in bulk (the SellIn7DaysApplication
  // model stores brandId/categoryId as plain strings — no Prisma relation).
  const brandIds = Array.from(
    new Set(rows.map((r) => r.brandId).filter((x): x is string => !!x)),
  );
  const categoryIds = Array.from(
    new Set(rows.map((r) => r.categoryId).filter((x): x is string => !!x)),
  );
  const [brands, categories] = await Promise.all([
    brandIds.length
      ? db.brand.findMany({
          where: { id: { in: brandIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    categoryIds.length
      ? db.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const rowsWithRelations = rows.map((r) => ({
    ...r,
    brand: r.brandId ? brandMap.get(r.brandId) ?? null : null,
    category: r.categoryId ? categoryMap.get(r.categoryId) ?? null : null,
  }));

  // Summary stats — counts per status + totals
  const allRows = await db.sellIn7DaysApplication.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const stats: Record<string, number> = { total: 0 };
  for (const r of allRows) {
    stats[r.status] = r._count._all;
    stats.total += r._count._all;
  }

  return NextResponse.json({
    ok: true,
    data: rowsWithRelations.map(serializeApp),
    total,
    stats,
  });
}

/* ----------------------------- PATCH ---------------------------- */
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بدنهٔ درخواست نامعتبر است." }, { status: 400 });
  }

  const id = (body.id ?? "").toString();
  if (!id) return NextResponse.json({ error: "id الزامی است." }, { status: 400 });

  const existing = await db.sellIn7DaysApplication.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "درخواست یافت نشد." }, { status: 404 });
  }

  const action = (body.action ?? "").toString();
  const data: any = {};

  // Status transitions
  const newStatus = body.status ? String(body.status) : null;
  if (newStatus && (VALID_STATUSES as readonly string[]).includes(newStatus)) {
    data.status = newStatus;
    data.currentStep = STATUS_STEP[newStatus] ?? existing.currentStep;
  }

  if (body.currentStep != null) {
    const step = parseNumber(body.currentStep);
    if (step && step >= 1 && step <= 4) data.currentStep = step;
  }

  // Direct field updates
  if (body.valuationPrice !== undefined) {
    data.valuationPrice = parseBig(body.valuationPrice);
  }
  if (body.salePrice !== undefined) {
    data.salePrice = parseBig(body.salePrice);
  }
  if (body.commissionAmount !== undefined) {
    data.commissionAmount = parseBig(body.commissionAmount);
  }
  if (body.prepaymentPaid !== undefined) {
    data.prepaymentPaid = !!body.prepaymentPaid;
  }
  if (body.inspectionDate !== undefined) {
    const d = body.inspectionDate ? new Date(body.inspectionDate) : null;
    data.inspectionDate = d && !isNaN(d.getTime()) ? d : null;
  }

  /* ---- Special actions ---- */
  if (action === "markPrepaid") {
    data.prepaymentPaid = true;
    if (!existing.prepaymentAmount) {
      const settings = await db.siteSettings.findUnique({ where: { id: "main" } });
      data.prepaymentAmount = settings?.sellIn7DaysPrepaymentAmount ?? 500_000n;
    }
    data.status = "PREPAYMENT_PAID";
    data.currentStep = 2;
  } else if (action === "scheduleInspection") {
    data.inspectionDate = body.inspectionDate
      ? new Date(body.inspectionDate)
      : new Date();
    data.status = "INSPECTION_SCHEDULED";
    data.currentStep = 2;
  } else if (action === "markInspected") {
    data.status = "INSPECTED";
    data.currentStep = 3;
  } else if (action === "markValuationDone") {
    data.valuationPrice = parseBig(body.valuationPrice) ?? existing.valuationPrice;
    data.status = "VALUATION_DONE";
    data.currentStep = 3;
  } else if (action === "markListed") {
    data.status = "LISTED";
    data.currentStep = 4;
  } else if (action === "markSold") {
    const salePrice = parseBig(body.salePrice) ?? existing.salePrice;
    if (!salePrice) {
      return NextResponse.json(
        { error: "برای تسویه، قیمت فروش الزامی است." },
        { status: 400 },
      );
    }
    const rate = await getCommissionRate();
    const commission = (salePrice * BigInt(Math.round(rate * 100))) / 10_000n;
    data.salePrice = salePrice;
    data.commissionAmount = commission;
    data.status = "SOLD";
    data.currentStep = 4;
    data.soldAt = new Date();
  } else if (action === "cancel") {
    data.status = "CANCELLED";
  }

  const updated = await db.sellIn7DaysApplication.update({
    where: { id },
    data,
  });

  // Resolve brand + category labels (no Prisma relation on the model).
  const [brand, category] = await Promise.all([
    updated.brandId
      ? db.brand.findUnique({
          where: { id: updated.brandId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    updated.categoryId
      ? db.category.findUnique({
          where: { id: updated.categoryId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
  ]);
  const updatedWithRelations = { ...updated, brand, category };

  return NextResponse.json({ ok: true, application: serializeApp(updatedWithRelations) });
}
