import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string }>;
}

/* PATCH /api/articles/[slug] — admin update. */
export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const existing = await db.article.findUnique({ where: { slug } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: any = {};
    const allowed = [
      "title", "excerpt", "content", "category", "tags", "coverImage",
      "status", "publishedAt",
    ];
    for (const k of allowed) {
      if (k in body) data[k] = body[k] === undefined ? null : body[k];
    }
    // If title changed, update slug too
    if (body.title && body.title !== existing.title) {
      const newSlug = `${body.title
        .toLowerCase()
        .replace(/[^\w\u0600-\u06FF-]+/g, "-")
        .replace(/^-+|-+$/g, "")}-${Date.now().toString(36)}`;
      data.slug = newSlug;
    }

    const article = await db.article.update({
      where: { id: existing.id },
      data,
    });
    return NextResponse.json({ ok: true, article });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/articles/[slug] */
export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { slug } = await params;
    await db.article.delete({ where: { slug } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
