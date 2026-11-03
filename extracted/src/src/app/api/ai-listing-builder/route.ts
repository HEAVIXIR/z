import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/ai-listing-builder — description → LLM extracts structured data.
   Body: { description, brandName?, categoryName? }
   Returns: { title, brand, model, year, hours, condition, price, location, ... }
*/
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const description = String(body.description ?? "").trim();
    if (!description) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    const zai = await ZAI.create();
    const sys = `You are HEAVIX listing builder. From a free-text description (often Persian) of a heavy-machinery sale ad, extract structured JSON with these keys (omit if not present):
{
  "title": "concise listing title in Persian",
  "brand": "Persian brand name",
  "model": "model name",
  "year": number,
  "hours": number,
  "condition": "NEW" | "USED" | "REFURBISHED" | "FOR_PARTS",
  "price": number (Toman digits only),
  "priceType": "NEGOTIABLE" | "FIXED" | "CALL_FOR_PRICE",
  "province": "Persian province",
  "city": "Persian city",
  "specs": { "engine": "...", "transmission": "...", ... }
}
Return ONLY JSON.`;
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: description },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion?.choices?.[0]?.message?.content || "";
    const jsonStr = raw.replace(/```json|```/g, "").trim();
    const start = jsonStr.indexOf("{");
    const end = jsonStr.lastIndexOf("}");
    const extracted: any =
      start >= 0 && end > start ? JSON.parse(jsonStr.slice(start, end + 1)) : {};

    return NextResponse.json({ extracted, source: description });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
