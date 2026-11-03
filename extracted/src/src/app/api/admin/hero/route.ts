import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/hero */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    let hero = await db.heroConfig.findUnique({ where: { id: "main" } });
    if (!hero) hero = await db.heroConfig.create({ data: { id: "main" } });
    return NextResponse.json({ hero });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PUT /api/admin/hero */
export async function PUT(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const allowed = [
      "badge", "title1", "highlight", "subtitle", "buttonText", "buttonLink",
      "secondBtnText", "secondBtnLink", "slide1", "slide2", "slide3",
      "cardServicesImg", "cardFeaturedImg", "cardExclusiveImg", "animationType",
      // FIX-LISTINGS-HERO — optional Listing IDs (overrides the static card images).
      "cardServicesListingId", "cardFeaturedListingId", "cardExclusiveListingId",
      "statsWidth", "cardHeight", "cardWidth", "titleFontSize", "badgeAlign",
      "titleAlign", "highlightAlign", "subtitleAlign", "buttonAlign",
      "statsWidthCustom", "statsPaddingCustom", "statsGapCustom",
      "cardWidthCustom", "cardHeightCustom", "cardGapCustom", "cardRadiusCustom",
      "titleFontSizeCustom", "subtitleFontSizeCustom", "badgeFontSizeCustom",
      "buttonPaddingYCustom", "buttonPaddingXCustom",
      "heroMinHeightCustom", "contentMaxWidthCustom", "contentGapCustom",
      "slideOpacityCustom", "slideIntervalCustom", "overlayColorCustom",
    ];
    const data: any = {};
    for (const k of allowed) if (k in body) data[k] = body[k] === undefined ? null : body[k];

    const hero = await db.heroConfig.upsert({
      where: { id: "main" },
      create: { id: "main", ...data },
      update: data,
    });
    return NextResponse.json({ ok: true, hero });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
