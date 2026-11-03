import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/settings — public site settings (safe fields only). */
export async function GET() {
  try {
    let s = await db.siteSettings.findUnique({ where: { id: "main" } });
    if (!s) {
      s = await db.siteSettings.create({ data: { id: "main" } });
    }
    // Only expose safe public fields
    return NextResponse.json({
      settings: {
        about: s.about,
        phone: s.phone,
        email: s.email,
        address: s.address,
        workingHours: s.workingHours,
        copyright: s.copyright,
        newsletterEnabled: s.newsletterEnabled,
        // FIX-MEDIA: public brand assets for header/footer rendering
        logoUrl: s.logoUrl,
        footerLogoUrl: s.footerLogoUrl,
        logoText: s.logoText,
        // CHAT-2026-09-21: logo size + position + Persian name
        logoHeight: s.logoHeight,
        footerLogoHeight: s.footerLogoHeight,
        showPersianName: s.showPersianName,
        logoPosition: s.logoPosition,
        footerLogoPosition: s.footerLogoPosition,
        // Tri-brand footer logos (3 separate slots)
        footerHeavixLogoUrl: s.footerHeavixLogoUrl,
        footerMekanixLogoUrl: s.footerMekanixLogoUrl,
        footerAriaLogoUrl: s.footerAriaLogoUrl,
        // FIX-ADMIN-EDITABILITY — animated-logo loop length (ms) so the
        // public Header can render the admin-configured cadence.
        logoAnimationDurationMs: s.logoAnimationDurationMs ?? 10000,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
