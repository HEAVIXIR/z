import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseNumber } from "@/lib/api-helpers";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/ai-price-suggestion
   Body: { brandId?, categoryId?, year?, condition?, workingHours?, province?, description? }
   Returns: { min, max, suggested, currency, samples, confidence }
*/
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const where: any = { status: "PUBLISHED", price: { not: null } };
    if (body.brandId) where.brandId = body.brandId;
    if (body.categoryId) where.categoryId = body.categoryId;
    if (body.condition) where.condition = body.condition;
    if (body.province) where.province = { contains: body.province };
    if (body.year) {
      const y = parseNumber(body.year);
      if (y) where.year = { gte: y - 3, lte: y + 3 };
    }

    const samples = await db.listing.findMany({
      where,
      select: {
        price: true,
        year: true,
        workingHours: true,
        condition: true,
        province: true,
        brand: { select: { name: true } },
      },
      take: 50,
    });

    if (samples.length === 0) {
      return NextResponse.json({
        suggested: null,
        min: null,
        max: null,
        samples: 0,
        confidence: "LOW",
        message: "نمونه کافی برای پیشنهاد قیمت وجود ندارد",
      });
    }

    const prices = samples
      .map((s) => Number(s.price))
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const median = prices[Math.floor(prices.length / 2)];
    const min = prices[0];
    const max = prices[prices.length - 1];

    // LLM refinement (optional, falls back to median if AI fails)
    let suggested = Math.round(median);
    let aiNote = "";
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a heavy-machinery pricing assistant. Given stats about similar listings and the user's machine specs, suggest a fair asking price (Toman, digits only). Return JSON {price:number,note:string}.",
          },
          {
            role: "user",
            content: JSON.stringify({
              samples: {
                count: prices.length,
                avg: Math.round(avg),
                median,
                min,
                max,
              },
              machine: {
                brandId: body.brandId,
                categoryId: body.categoryId,
                year: body.year,
                condition: body.condition,
                hours: body.workingHours,
                province: body.province,
                description: body.description,
              },
            }),
          },
        ],
        thinking: { type: "disabled" },
      });
      const raw = completion?.choices?.[0]?.message?.content || "";
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        if (parsed.price) suggested = Math.round(Number(parsed.price));
        if (parsed.note) aiNote = String(parsed.note);
      }
    } catch {
      /* fallback */
    }

    const confidence =
      prices.length >= 15 ? "HIGH" : prices.length >= 5 ? "MEDIUM" : "LOW";

    return NextResponse.json({
      suggested: suggested.toString(),
      min: min.toString(),
      max: max.toString(),
      avg: Math.round(avg).toString(),
      median: median.toString(),
      samples: prices.length,
      confidence,
      aiNote: aiNote || undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
