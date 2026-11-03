import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { generateSocialReel } from "@/lib/social-reels";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for video generation

/* GET /api/admin/social-reels — list all reels with listing info. */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const platform = url.searchParams.get("platform");
    const listingId = url.searchParams.get("listingId");
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);

    const where: any = {};
    if (status) where.status = status;
    if (platform) where.platform = platform;
    if (listingId) where.listingId = listingId;

    const reels = await db.socialReel.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            brand: { select: { name: true } },
            images: { orderBy: [{ isPrimary: "desc" }], take: 1 },
          },
        },
      },
    });

    const stats = {
      total: await db.socialReel.count(),
      ready: await db.socialReel.count({ where: { status: "READY" } }),
      generating: await db.socialReel.count({ where: { status: "GENERATING" } }),
      failed: await db.socialReel.count({ where: { status: "FAILED" } }),
    };

    return NextResponse.json({
      success: true,
      reels,
      stats,
    });
  } catch (e: any) {
    console.error("[admin/social-reels] GET error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/social-reels — generate a new reel.
 * Body: { listingId, platform?, prompt?, durationSec?, resolution? }
 * Action "generate" creates + generates synchronously (may take 1-3 min).
 * Action "generate-async" creates row + returns immediately, generation runs in background.
 */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { listingId, platform, prompt, durationSec, resolution, action } = body;
    if (!listingId) {
      return NextResponse.json(
        { success: false, error: "listingId is required" },
        { status: 400 },
      );
    }

    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { id: true, title: true },
    });
    if (!listing) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 },
      );
    }

    // generate-async: create row, run generation in background, return immediately
    if (action === "generate-async") {
      // Fire and forget — don't await
      generateSocialReel({
        listingId,
        platform: platform || "INSTAGRAM",
        prompt,
        durationSec: Number(durationSec) || 5,
        resolution: resolution || "720x1440",
      }).catch((e) =>
        console.error("[admin/social-reels] background generation error:", e),
      );
      return NextResponse.json({
        success: true,
        message: "Generation started in background. Poll the list endpoint to track status.",
      });
    }

    // default: generate synchronously (may take 1-3 min)
    const result = await generateSocialReel({
      listingId,
      platform: platform || "INSTAGRAM",
      prompt,
      durationSec: Number(durationSec) || 5,
      resolution: resolution || "720x1440",
    });

    return NextResponse.json({ success: true, reel: result });
  } catch (e: any) {
    console.error("[admin/social-reels] POST error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
