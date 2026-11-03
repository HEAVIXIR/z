import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toEnDigits } from "@/lib/format";
import { parseBig, parseNumber } from "@/lib/api-helpers";

/* ============================================================
   /api/sell-in-7-days — public API for the "Sell in 7 Days"
   campaign. (FIX-SALE-ANIM)

   POST          Create a new application (with tracking code).
   GET ?code=    Look up an application by tracking code and
                 return its status + step timeline.
   GET ?trackingCode=   Alias of the above (matches spec).
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Default prepayment amount (Toman) if SiteSettings is unset. */
const DEFAULT_PREPAYMENT = 500_000n;
/** Default commission rate (%) on the sale price. */
const DEFAULT_COMMISSION_RATE = 1;
void DEFAULT_COMMISSION_RATE;

function randomTrackingCode(): string {
  // 8-char base32 (uppercase, no ambiguous chars).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

async function uniqueTrackingCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = randomTrackingCode();
    const existing = await db.sellIn7DaysApplication.findUnique({
      where: { trackingCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  // Fallback — append a numeric suffix if all retries collided.
  return randomTrackingCode() + Math.floor(Math.random() * 10);
}

async function getPrepaymentAmount(): Promise<bigint> {
  try {
    const settings = await db.siteSettings.findUnique({ where: { id: "main" } });
    if (settings?.sellIn7DaysPrepaymentAmount) {
      return settings.sellIn7DaysPrepaymentAmount;
    }
  } catch {
    /* ignore — fall back to default */
  }
  return DEFAULT_PREPAYMENT;
}

function normalizeMobile(raw: string): string {
  const en = toEnDigits((raw || "").trim());
  // Strip everything that isn't a digit or leading +.
  const m = en.replace(/[^\d+]/g, "");
  if (m.startsWith("+98")) return "0" + m.slice(3);
  if (m.startsWith("0098")) return "0" + m.slice(4);
  if (m.startsWith("98") && m.length === 12) return "0" + m.slice(2);
  return m;
}

function isValidMobile(raw: string): boolean {
  const m = normalizeMobile(raw);
  return /^09\d{9}$/.test(m);
}

/* ----------------------------- POST ----------------------------- */
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بدنهٔ درخواست نامعتبر است." }, { status: 400 });
  }

  const sellerName = (body.sellerName ?? "").toString().trim();
  const sellerMobileRaw = (body.sellerMobile ?? "").toString().trim();
  const sellerEmail = (body.sellerEmail ?? "").toString().trim() || null;
  const deviceName = (body.deviceName ?? "").toString().trim();
  const categoryId = body.categoryId ? String(body.categoryId) : null;
  const brandId = body.brandId ? String(body.brandId) : null;
  const modelName = (body.modelName ?? "").toString().trim() || null;
  const year = parseNumber(body.year);
  const workingHours = parseNumber(body.workingHours);
  const condition = body.condition ? String(body.condition) : null;
  const province = (body.province ?? "").toString().trim() || null;
  const city = (body.city ?? "").toString().trim() || null;
  const expectedPrice = parseBig(body.expectedPrice);
  const description = (body.description ?? "").toString().trim() || null;
  const prepayNow = body.prepayNow !== false; // default true

  if (!sellerName || sellerName.length < 3) {
    return NextResponse.json({ error: "نام فروشنده الزامی است." }, { status: 400 });
  }
  if (!isValidMobile(sellerMobileRaw)) {
    return NextResponse.json(
      { error: "شماره موبایل معتبر نیست. (مثال: 09121234567)" },
      { status: 400 },
    );
  }
  if (!deviceName || deviceName.length < 3) {
    return NextResponse.json({ error: "نام دستگاه الزامی است." }, { status: 400 });
  }

  const sellerMobile = normalizeMobile(sellerMobileRaw);

  // Optional validation: categoryId / brandId should exist if provided.
  if (categoryId) {
    const cat = await db.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!cat) return NextResponse.json({ error: "دسته‌بندی نامعتبر است." }, { status: 400 });
  }
  if (brandId) {
    const brand = await db.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!brand) return NextResponse.json({ error: "برند نامعتبر است." }, { status: 400 });
  }

  const prepaymentAmount = await getPrepaymentAmount();
  const trackingCode = await uniqueTrackingCode();

  // For dev — if prepayNow=true, mark as paid immediately.
  const prepaymentPaid = !!prepayNow;
  const status = prepaymentPaid ? "PREPAYMENT_PAID" : "PENDING_PREPAYMENT";
  const currentStep = prepaymentPaid ? 2 : 1; // step 1 done once prepaid

  const application = await db.sellIn7DaysApplication.create({
    data: {
      trackingCode,
      sellerName,
      sellerMobile,
      sellerEmail,
      deviceName,
      categoryId,
      brandId,
      modelName,
      year,
      workingHours,
      condition,
      province,
      city,
      expectedPrice,
      description,
      prepaymentPaid,
      prepaymentAmount,
      status,
      currentStep,
    },
  });

  return NextResponse.json({
    ok: true,
    trackingCode: application.trackingCode,
    id: application.id,
    prepaymentPaid,
    prepaymentAmount: prepaymentAmount.toString(),
    currentStep: application.currentStep,
    status: application.status,
  });
}

/* ----------------------------- GET ------------------------------ */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code =
    (url.searchParams.get("trackingCode") ?? "").trim() ||
    (url.searchParams.get("code") ?? "").trim();

  if (!code) {
    return NextResponse.json(
      { error: "کد رهگیری را وارد کنید." },
      { status: 400 },
    );
  }

  const app = await db.sellIn7DaysApplication.findUnique({
    where: { trackingCode: code.toUpperCase() },
    select: {
      id: true,
      trackingCode: true,
      deviceName: true,
      sellerName: true,
      sellerMobile: true,
      sellerEmail: true,
      modelName: true,
      year: true,
      workingHours: true,
      condition: true,
      province: true,
      city: true,
      expectedPrice: true,
      description: true,
      prepaymentPaid: true,
      prepaymentAmount: true,
      status: true,
      currentStep: true,
      inspectionDate: true,
      valuationPrice: true,
      salePrice: true,
      commissionAmount: true,
      soldAt: true,
      createdAt: true,
      updatedAt: true,
      categoryId: true,
      brandId: true,
    },
  });

  if (!app) {
    return NextResponse.json(
      { error: "درخواستی با این کد رهگیری یافت نشد." },
      { status: 404 },
    );
  }

  // Resolve category + brand labels for nicer display.
  let category: { name: string; slug: string } | null = null;
  let brand: { name: string; slug: string } | null = null;
  if (app.categoryId) {
    category = await db.category.findUnique({
      where: { id: app.categoryId },
      select: { name: true, slug: true },
    });
  }
  if (app.brandId) {
    brand = await db.brand.findUnique({
      where: { id: app.brandId },
      select: { name: true, slug: true },
    });
  }

  return NextResponse.json({
    ok: true,
    application: {
      ...app,
      expectedPrice: app.expectedPrice?.toString() ?? null,
      prepaymentAmount: app.prepaymentAmount?.toString() ?? null,
      valuationPrice: app.valuationPrice?.toString() ?? null,
      salePrice: app.salePrice?.toString() ?? null,
      commissionAmount: app.commissionAmount?.toString() ?? null,
      inspectionDate: app.inspectionDate?.toISOString() ?? null,
      soldAt: app.soldAt?.toISOString() ?? null,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      category,
      brand,
    },
  });
}
