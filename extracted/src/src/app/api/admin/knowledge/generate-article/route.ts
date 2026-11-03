import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { uniqueSlug } from "@/lib/api-helpers";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import { requireAdmin } from "@/lib/admin-guard";

/* ============================================================
   POST /api/admin/knowledge/generate-article
   AI article assistant for the HEAVIX Knowledge base (Article
   model). Uses z-ai-web-dev-sdk LLM to generate a new article
   on a topic the admin specifies, then uses image generation
   to create a cover image, and saves it as a DRAFT Article.
   Auth required.

   Body: { topic: string, category?: string, generateImage?: boolean }
   Returns: { ok, article: { id, slug, title, content, excerpt,
                              coverImage, status } }
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES = new Set([
  "GUIDE", "COMPARISON", "REVIEW", "NEWS", "TUTORIAL",
]);

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
  if (!topic || topic.length < 3) {
    return NextResponse.json(
      { error: "موضوع مقاله را وارد کنید (حداقل ۳ حرف)." },
      { status: 400 },
    );
  }
  const category = VALID_CATEGORIES.has(String(body?.category))
    ? String(body.category)
    : "GUIDE";
  const generateImage = body?.generateImage !== false; // default true

  // Lazy-load ZAI so module imports cleanly when SDK not used.
  let zai: any = null;
  try {
    const ZAIModule = await import("z-ai-web-dev-sdk");
    const ZAI = (ZAIModule as any).default ?? ZAIModule;
    zai = await ZAI.create();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error:
          "سرویس هوش مصنوعی در دسترس نیست. لطفاً بعداً تلاش کنید.",
        detail: msg,
      },
      { status: 502 },
    );
  }

  // ─── 1. Generate article (title + excerpt + content) via LLM ───
  const prompt = `You are HEAVIX content writer for an Iranian heavy-machinery marketplace. Write a Persian (Farsi) article on the topic below. Audience: machine buyers/sellers/operators. Tone: professional, factual, helpful. Use Persian numerals (۰-۹) where appropriate. Do NOT invent prices, dates, or specs unless they're well-known industry facts.

Return ONLY a JSON object (no markdown, no prose) with this shape:
{
  "title": "<Persian title, max 70 chars>",
  "excerpt": "<Persian excerpt, 1-2 sentences, max 180 chars>",
  "content": "<Persian Markdown body — start with a # H1 title, use ## H2 subheadings, short paragraphs, and at least one - bullet list. 400-800 words. End with a short 'نتیجه‌گیری' section.>"
}

Topic: """${topic}"""`;

  let title = "";
  let excerpt: string | null = null;
  let content = "";

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: topic },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion?.choices?.[0]?.message?.content ?? "";
    // Strip code fences + extract first JSON object
    const jsonStr = raw
      .replace(/```json|```/g, "")
      .replace(/```/g, "")
      .trim();
    const start = jsonStr.indexOf("{");
    const end = jsonStr.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(jsonStr.slice(start, end + 1));
      title = String(parsed.title ?? "").trim();
      excerpt = parsed.excerpt ? String(parsed.excerpt).trim() : null;
      content = String(parsed.content ?? "").trim();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "تولید متن مقاله ناموفق بود. لطفاً دوباره تلاش کنید.",
        detail: msg,
      },
      { status: 502 },
    );
  }

  if (!title || !content) {
    return NextResponse.json(
      { error: "پاسخ هوش مصنوعی خالی یا نامعتبر بود." },
      { status: 502 },
    );
  }

  // ─── 2. Generate cover image (best-effort, optional) ───
  let coverImage: string | null = null;
  if (generateImage) {
    try {
      const imagePrompt = buildCoverPrompt(topic, title);
      const imgResp = await zai.images.generations.create({
        prompt: imagePrompt,
        size: "1344x768",
      });
      const base64 = imgResp?.data?.[0]?.base64 ?? null;
      if (base64) {
        coverImage = await persistCoverImage(base64, title);
      }
    } catch {
      // Image gen is best-effort — continue without cover.
    }
  }

  // ─── 3. Save as DRAFT Article ───
  const slug = await uniqueSlug(db.article, title);
  let article: any = null;
  try {
    article = await db.article.create({
      data: {
        slug,
        title,
        excerpt,
        content,
        category,
        tags: topic.slice(0, 100),
        coverImage,
        status: "DRAFT",
        // publishedAt stays null until admin publishes.
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "ذخیره مقاله ناموفق بود: " + (err?.message ?? "unknown") },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    article: {
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      coverImage: article.coverImage,
      status: article.status,
    },
  });
}

/* ─── Helpers ─── */

function buildCoverPrompt(topic: string, title: string): string {
  return `Professional industrial photography for an article about "${topic}" (title: "${title}"). Heavy machinery, construction site or industrial setting, golden hour lighting, sharp focus, cinematic wide angle, no text, no watermark, no people faces visible.`;
}

async function persistCoverImage(base64: string, title: string): Promise<string> {
  const slugPart = (title || "article")
    .toString()
    .replace(/[^\w\u0600-\u06FF\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "article";
  const rand = crypto.randomBytes(4).toString("hex");
  const filename = `${slugPart}-${rand}.png`;
  const dirAbs = path.join(process.cwd(), "public", "uploads", "articles");
  await fs.mkdir(dirAbs, { recursive: true });
  await fs.writeFile(path.join(dirAbs, filename), Buffer.from(base64, "base64"));
  return `/uploads/articles/${filename}`;
}
