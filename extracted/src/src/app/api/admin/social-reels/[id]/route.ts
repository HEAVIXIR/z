import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { buildShareLinks } from "@/lib/social-reels";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/social-reels/[id] — single reel detail with share links. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const reel = await db.socialReel.findUnique({
      where: { id },
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
    if (!reel) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    // Build share links if video is ready
    let shareLinks: Record<string, string> | null = null;
    if (reel.videoUrl) {
      shareLinks = buildShareLinks({
        videoUrl: reel.videoUrl,
        title: reel.listing?.title || "HEAVIX",
      });
    }
    return NextResponse.json({ success: true, reel, shareLinks });
  } catch (e: any) {
    console.error("[admin/social-reels/[id]] GET error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/admin/social-reels/[id] — update reel (platform, prompt, shareCount) or retry. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const { platform, prompt, viewCount, shareCount } = body;
    const reel = await db.socialReel.update({
      where: { id },
      data: {
        ...(platform ? { platform } : {}),
        ...(prompt !== undefined ? { prompt } : {}),
        ...(viewCount !== undefined ? { viewCount: Number(viewCount) } : {}),
        ...(shareCount !== undefined ? { shareCount: Number(shareCount) } : {}),
      },
    });
    return NextResponse.json({ success: true, reel });
  } catch (e: any) {
    console.error("[admin/social-reels/[id]] PATCH error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/admin/social-reels/[id] — delete reel + remove video file. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const reel = await db.socialReel.findUnique({ where: { id } });
    if (!reel) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    // Delete video file if local
    if (reel.videoUrl && reel.videoUrl.startsWith("/uploads/reels/")) {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", reel.videoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await db.socialReel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[admin/social-reels/[id]] DELETE error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
