import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   POST /api/admin/ai-content-factory
   Body: { topic, category }
   Returns: { title, excerpt, content (markdown), tags, category }

   Admin-only. Generates an article draft using the LLM.
   The returned draft can then be reviewed and published via
   the existing /api/admin/articles endpoint.
   ============================================================ */

const ALLOWED_CATEGORIES = [
  "GUIDE",
  "COMPARISON",
  "REVIEW",
  "NEWS",
  "TUTORIAL",
] as const;

const CATEGORY_HINTS: Record<string, string> = {
  GUIDE: "راهنمای خرید/انتخاب",
  COMPARISON: "مقایسهٔ مدل‌ها یا برندها",
  REVIEW: "نقد و بررسی تخصصی",
  NEWS: "خبر صنعت ماشین‌آلات",
  TUTORIAL: "آموزش گام‌به‌گام",
};

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const topic = String(body.topic ?? "").trim();
    const rawCategory = String(body.category ?? "GUIDE").toUpperCase();
    const category = (ALLOWED_CATEGORIES as readonly string[]).includes(
      rawCategory,
    )
      ? (rawCategory as (typeof ALLOWED_CATEGORIES)[number])
      : "GUIDE";

    if (!topic) {
      return NextResponse.json(
        { error: "topic is required" },
        { status: 400 },
      );
    }
    if (topic.length > 300) {
      return NextResponse.json(
        { error: "topic is too long (max 300 chars)" },
        { status: 400 },
      );
    }

    const categoryHint = CATEGORY_HINTS[category] ?? "مقاله عمومی";

    const systemPrompt = `You are the HEAVIX AI Content Factory — a senior Persian industrial-machinery journalist. Generate a high-quality Persian article draft about the requested topic.

Topic: ${topic}
Article type: ${categoryHint}

Output STRICT JSON only (no markdown fences, no commentary):
{
  "title": "عنوان جذاب فارسی (حداکثر ۸۰ کاراکتر)",
  "excerpt": "خلاصهٔ ۱-۲ جمله‌ای فارسی برای لیست مقالات",
  "content": "محتوای کامل به فرمت Markdown\n\n## مقدمه\n...\n\n## بخش‌های اصلی\n...\n\n## نتیجه‌گیری\n...",
  "tags": ["برچسب۱", "برچسب۲", "برچسب۳"]
}

Content rules:
- All text in Persian (Farsi) script.
- Length: 600-1100 words.
- Use Markdown: # for main title (omit — title is separate), ## for sections, ### for sub-sections, - for lists, **bold** for key terms.
- Be factual, technical, and helpful. Cite category/brand names if relevant.
- Do NOT fabricate phone numbers, URLs, or prices.
- Tags: 3-6 short Persian keywords.
- Never include an H1 (#) at the start — start with ## directly.
- Include a short conclusion section at the end.`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: topic },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion?.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start < 0 || end <= start) {
      return NextResponse.json(
        { error: "AI returned an invalid response — please try again." },
        { status: 502 },
      );
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return NextResponse.json(
        { error: "AI returned malformed JSON — please try again." },
        { status: 502 },
      );
    }

    const title = String(parsed.title ?? "").trim();
    const excerpt = String(parsed.excerpt ?? "").trim();
    const content = String(parsed.content ?? "").trim();
    const tagsRaw = Array.isArray(parsed.tags) ? parsed.tags : [];
    const tags = tagsRaw
      .map((t: any) => String(t ?? "").trim())
      .filter(Boolean)
      .slice(0, 8);

    if (!title || !content) {
      return NextResponse.json(
        { error: "AI response was incomplete — please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      draft: {
        title,
        excerpt: excerpt || null,
        content,
        tags: tags.length > 0 ? tags.join(", ") : null,
        category,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
