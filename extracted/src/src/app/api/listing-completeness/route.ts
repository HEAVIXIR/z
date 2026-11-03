import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/listing-completeness?listingId=...
   Returns a 0-100 score + checklist of items passed/failed.
   ============================================================ */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const listingId = url.searchParams.get("listingId");
    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 },
      );
    }

    const listing = await db.listing.findUnique({
      where: { id: listingId },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        images: { take: 1 },
      },
    });
    if (!listing) {
      return NextResponse.json({ error: "listing not found" }, { status: 404 });
    }

    const checklist = [
      {
        item: "hasImage",
        label: "تصویر آگهی",
        passed: listing.images.length > 0,
      },
      {
        item: "hasPrice",
        label: "قیمت",
        passed: listing.price != null && listing.price > 0,
      },
      {
        item: "hasBrand",
        label: "برند",
        passed: !!listing.brand,
      },
      {
        item: "hasCategory",
        label: "دسته‌بندی",
        passed: !!listing.category,
      },
      {
        item: "hasDescription",
        label: "توضیحات (+۵۰ کاراکتر)",
        passed: !!listing.description && listing.description.length > 50,
      },
      {
        item: "hasYear",
        label: "سال ساخت",
        passed: !!listing.year,
      },
      {
        item: "hasHours",
        label: "ساعت کارکرد",
        passed: listing.workingHours != null,
      },
      {
        item: "hasPhone",
        label: "شماره تماس فروشنده",
        passed: !!listing.sellerPhone,
      },
      {
        item: "hasSpecs",
        label: "مشخصات فنی",
        passed:
          !!listing.condition ||
          !!listing.province ||
          !!listing.city,
      },
      {
        item: "verified",
        label: "تأیید شده توسط هویکس",
        passed: !!listing.verified,
      },
    ];

    const passedCount = checklist.filter((c) => c.passed).length;
    const score = Math.round((passedCount / checklist.length) * 100);
    const missing = checklist.filter((c) => !c.passed).map((c) => c.item);

    return NextResponse.json({
      score,
      checklist,
      missing,
      passedCount,
      totalCount: checklist.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
