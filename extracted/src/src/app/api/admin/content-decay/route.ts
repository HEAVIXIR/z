import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/admin/content-decay
   Finds articles that are older than 6 months AND have declining
   views (recent 30 days < previous 30 days). Marks as "outdated".
   ============================================================ */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const last30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prev30Start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get all articles older than 6 months
    const oldArticles = await db.article.findMany({
      where: {
        publishedAt: { lt: sixMonthsAgo },
        status: "PUBLISHED",
      },
      orderBy: { publishedAt: "desc" },
      take: 500,
    });

    // We approximate "declining views" using viewCount compared to expected decay.
    // For a more sophisticated analysis, we'd track per-day views — but here we
    // use a simple heuristic: if viewCount < expected average for its age, mark
    // as outdated. Expected ~ 10 views/day * days since published.
    const outdated = oldArticles.map((a) => {
      const publishedAt = a.publishedAt ?? a.createdAt;
      const ageDays = Math.max(
        1,
        Math.floor((now.getTime() - publishedAt.getTime()) / 86400000),
      );
      const expectedViews = ageDays * 10;
      const isDeclining = a.viewCount < expectedViews * 0.5;
      const ageMonths = Math.floor(ageDays / 30);
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        category: a.category,
        coverImage: a.coverImage,
        viewCount: a.viewCount,
        publishedAt: publishedAt.toISOString(),
        ageDays,
        ageMonths,
        expectedViews,
        isDeclining,
        status: isDeclining ? "outdated" : "fresh",
      };
    });

    const flaggedOutdated = outdated.filter((o) => o.isDeclining);

    const stats = {
      totalOld: oldArticles.length,
      outdatedCount: flaggedOutdated.length,
      freshCount: outdated.length - flaggedOutdated.length,
      last30Start: last30Start.toISOString(),
      prev30Start: prev30Start.toISOString(),
    };

    return NextResponse.json({
      articles: flaggedOutdated,
      allOld: outdated,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
