import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uniqueSlug } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/articles — list + single by slug (?slug=...). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const limit = Math.min(50, Number(url.searchParams.get("limit")) || 20);
    const category = url.searchParams.get("category") || undefined;

    if (slug) {
      const article = await db.article.findUnique({
        where: { slug },
      });
      if (!article) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      await db.article.update({
        where: { id: article.id },
        data: { viewCount: { increment: 1 } },
      });
      return NextResponse.json({ article });
    }

    const where: any = { status: "PUBLISHED" };
    if (category) where.category = category;

    const articles = await db.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        category: true,
        tags: true,
        viewCount: true,
        publishedAt: true,
      },
    });

    return NextResponse.json({ articles });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
