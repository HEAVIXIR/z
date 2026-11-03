import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import { requireAdmin } from "@/lib/admin-guard";

/* ============================================================
   POST /api/admin/knowledge/generate-image
   AI cover image generator for an existing Article. Uses
   z-ai-web-dev-sdk image generation API. Saves the PNG to
   /public/uploads/articles/<slug>-<rand>.png and updates the
   article's coverImage field. Auth required.

   Body: { articleId: string, prompt?: string }
   Returns: { ok, coverImage, prompt }
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const articleId = typeof body?.articleId === "string" ? body.articleId : "";
  if (!articleId) {
    return NextResponse.json(
      { error: "articleId is required" },
      { status: 400 },
    );
  }

  let article: any = null;
  try {
    article = await db.article.findUnique({ where: { id: articleId } });
  } catch (e: any) {
    return NextResponse.json(
      { error: "DB lookup failed: " + (e?.message ?? "unknown") },
      { status: 500 },
    );
  }
  if (!article) {
    return NextResponse.json({ error: "مقاله یافت نشد." }, { status: 404 });
  }

  const userPrompt =
    typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const prompt =
    userPrompt ||
    buildCoverPrompt(article.title, article.excerpt, article.tags);

  // Lazy-load ZAI
  let base64: string | null = null;
  try {
    const ZAIModule = await import("z-ai-web-dev-sdk");
    const ZAI = (ZAIModule as any).default ?? ZAIModule;
    const zai = await ZAI.create();
    const resp = await zai.images.generations.create({
      prompt,
      size: "1344x768",
    });
    base64 = resp?.data?.[0]?.base64 ?? null;
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          "سرویس هوش مصنوعی در دسترس نیست. لطفاً بعداً تلاش کنید یا تصویر را به‌صورت دستی بارگذاری کنید.",
        detail: e?.message ?? "unknown",
      },
      { status: 502 },
    );
  }

  if (!base64) {
    return NextResponse.json(
      { error: "پاسخ خالی از سرویس تصویرسازی." },
      { status: 502 },
    );
  }

  // Persist
  const slugPart = (article.slug || "article")
    .toString()
    .replace(/[^\w\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "article";
  const rand = crypto.randomBytes(4).toString("hex");
  const filename = `${slugPart}-${rand}.png`;
  const dirAbs = path.join(process.cwd(), "public", "uploads", "articles");
  await fs.mkdir(dirAbs, { recursive: true });
  await fs.writeFile(path.join(dirAbs, filename), Buffer.from(base64, "base64"));
  const coverImage = `/uploads/articles/${filename}`;

  try {
    await db.article.update({
      where: { id: articleId },
      data: { coverImage },
    });
  } catch {
    // The image is saved but DB update failed — still return the URL.
    return NextResponse.json({
      ok: true,
      coverImage,
      prompt,
      warning: "تصویر ساخته شد اما به‌روزرسانی دیتابیس ناموفق بود.",
    });
  }

  return NextResponse.json({ ok: true, coverImage, prompt });
}

function buildCoverPrompt(
  title: string,
  excerpt: string | null,
  tags: string | null,
): string {
  const subject = (title || "industrial machinery").slice(0, 100);
  const ctx = (excerpt ?? tags ?? "").slice(0, 150);
  return `Professional industrial photography for an article titled "${subject}".${ctx ? ` Context: ${ctx}.` : ""} Heavy machinery, construction site or industrial setting, golden hour lighting, sharp focus, cinematic wide angle, no text, no watermark, no people faces visible.`;
}
