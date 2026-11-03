import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { uniqueSlug } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/articles — list + stats. */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const limit = Number(url.searchParams.get("limit")) || 100;

    const where: any = {};
    if (status) where.status = status;

    const [articles, stats] = await Promise.all([
      db.article.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      {
        total: await db.article.count(),
        published: await db.article.count({ where: { status: "PUBLISHED" } }),
        draft: await db.article.count({ where: { status: "DRAFT" } }),
        archived: await db.article.count({ where: { status: "ARCHIVED" } }),
        totalViews: (
          await db.article.aggregate({ _sum: { viewCount: true } })
        )._sum.viewCount ?? 0,
      },
    ]);
    return NextResponse.json({ articles, stats });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/articles — create + bulk actions. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));

    // Bulk action mode
    if (body.action && Array.isArray(body.ids)) {
      const ids: string[] = body.ids;
      let data: any = {};
      switch (body.action) {
        case "publish": data = { status: "PUBLISHED", publishedAt: new Date() }; break;
        case "draft": data = { status: "DRAFT" }; break;
        case "archive": data = { status: "ARCHIVED" }; break;
        case "delete":
          await db.article.deleteMany({ where: { id: { in: ids } } });
          return NextResponse.json({ ok: true, action: body.action, count: ids.length });
        default:
          return NextResponse.json({ error: "Unknown action" }, { status: 400 });
      }
      const r = await db.article.updateMany({
        where: { id: { in: ids } },
        data,
      });
      return NextResponse.json({ ok: true, action: body.action, updated: r.count });
    }

    // Create single
    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "title and content are required" },
        { status: 400 },
      );
    }
    const slug = await uniqueSlug(db.article, body.slug || body.title);
    const article = await db.article.create({
      data: {
        slug,
        title: String(body.title),
        excerpt: body.excerpt ?? null,
        content: String(body.content),
        category: body.category || "GUIDE",
        tags: body.tags ?? null,
        coverImage: body.coverImage ?? null,
        status: body.status || "DRAFT",
        publishedAt: body.status === "PUBLISHED" ? new Date() : null,
      },
    });
    return NextResponse.json({ ok: true, article });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
