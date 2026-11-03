import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/catalog-health — health score + issues list. */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const total = await db.listing.count();
    if (total === 0) {
      return NextResponse.json({
        score: 0,
        issues: [{ type: "EMPTY", message: "هیچ آگهی موجود نیست" }],
        breakdown: {},
      });
    }

    const [
      missingImages,
      missingPrice,
      missingBrand,
      missingCategory,
      missingDescription,
      missingYear,
      missingProvince,
      paused,
      expired,
    ] = await Promise.all([
      db.listing.count({ where: { images: { none: {} } } }),
      db.listing.count({ where: { price: null } }),
      db.listing.count({ where: { brandId: null } }),
      db.listing.count({ where: { categoryId: null } }),
      db.listing.count({ where: { OR: [{ description: null }, { description: "" }] } }),
      db.listing.count({ where: { year: null } }),
      db.listing.count({ where: { province: null } }),
      db.listing.count({ where: { status: "PAUSED" } }),
      db.listing.count({ where: { expiresAt: { lt: new Date() } } }),
    ]);

    // Score = 100 - weighted penalties
    const penalty =
      (missingImages / total) * 25 +
      (missingPrice / total) * 15 +
      (missingBrand / total) * 10 +
      (missingCategory / total) * 10 +
      (missingDescription / total) * 10 +
      (missingYear / total) * 5 +
      (missingProvince / total) * 5 +
      (paused / total) * 10 +
      (expired / total) * 10;
    const score = Math.max(0, Math.round(100 - penalty));

    const issues: Array<{ type: string; count: number; severity: "high" | "medium" | "low"; message: string }> = [];
    if (missingImages > 0)
      issues.push({ type: "MISSING_IMAGES", count: missingImages, severity: "high", message: `${missingImages} آگهی بدون تصویر` });
    if (missingPrice > 0)
      issues.push({ type: "MISSING_PRICE", count: missingPrice, severity: "high", message: `${missingPrice} آگهی بدون قیمت` });
    if (missingBrand > 0)
      issues.push({ type: "MISSING_BRAND", count: missingBrand, severity: "medium", message: `${missingBrand} آگهی بدون برند` });
    if (missingCategory > 0)
      issues.push({ type: "MISSING_CATEGORY", count: missingCategory, severity: "medium", message: `${missingCategory} آگهی بدون دسته‌بندی` });
    if (missingDescription > 0)
      issues.push({ type: "MISSING_DESCRIPTION", count: missingDescription, severity: "medium", message: `${missingDescription} آگهی بدون توضیحات` });
    if (missingYear > 0)
      issues.push({ type: "MISSING_YEAR", count: missingYear, severity: "low", message: `${missingYear} آگهی بدون سال تولید` });
    if (missingProvince > 0)
      issues.push({ type: "MISSING_LOCATION", count: missingProvince, severity: "low", message: `${missingProvince} آگهی بدون استان` });
    if (paused > 0)
      issues.push({ type: "PAUSED", count: paused, severity: "low", message: `${paused} آگهی متوقف‌شده` });
    if (expired > 0)
      issues.push({ type: "EXPIRED", count: expired, severity: "medium", message: `${expired} آگهی منقضی‌شده` });

    return NextResponse.json({
      score,
      total,
      issues,
      breakdown: {
        missingImages,
        missingPrice,
        missingBrand,
        missingCategory,
        missingDescription,
        missingYear,
        missingProvince,
        paused,
        expired,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
