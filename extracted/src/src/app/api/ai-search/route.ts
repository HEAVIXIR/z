import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBig, parseNumber } from "@/lib/api-helpers";
import { searchListings } from "@/lib/search";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/ai-search — natural-language query → LLM extracts filters + intent → DB query.
   Body: { query, limit? }
   Returns: { filters, intent, listings }
   Side-effects: logs zero-result searches as DemandSignal records.

   P1-18: the listing fetch is routed through `searchListings`
   (src/lib/search.ts) so Persian normalization is applied uniformly.
   The price / condition / year filters that searchListings doesn't
   (yet) expose are applied as a post-filter on the returned hits —
   the helper over-fetches (limit:100) so the post-filters still
   leave enough results to satisfy the caller's `limit`.
*/
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body.query ?? "").trim();
    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const zai = await ZAI.create();
    const sys = `You are HEAVIX search assistant. From a Persian natural-language search query about heavy machinery, extract structured JSON with these keys (omit any that don't apply):
{
  "intent": "BUY" | "RENT" | "COMPARE" | "RESEARCH" | "PARTS" | "SERVICE",
  "filters": {
    "q": "free text",
    "brandName": "Persian or English brand name",
    "categoryName": "Persian category name",
    "minPrice": number (Toman),
    "maxPrice": number (Toman),
    "condition": "NEW" | "USED" | "REFURBISHED" | "FOR_PARTS",
    "province": "Persian province name",
    "yearFrom": number,
    "yearTo": number,
    "listingType": "SALE" | "RENT"
  }
}

Intent rules:
- BUY: user wants to purchase a machine ("می‌خوام بخرم", "قیمت", "فروش")
- RENT: user wants to rent ("اجاره", "کرایه", "رنت")
- COMPARE: comparing models/brands ("مقایسه", "بهتره", "یا")
- RESEARCH: research/info seeking ("مشخصات", "توان", "وزن", "راهنما")
- PARTS: spare parts ("قطعه", "یدکی", "فیلتر", "روغن")
- SERVICE: repair/maintenance ("تعمیر", "سرویس", "دیزل‌نگاری")

Return ONLY the JSON object.`;
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: query },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion?.choices?.[0]?.message?.content || "";
    const jsonStr = raw.replace(/```json|```/g, "").trim();
    const start = jsonStr.indexOf("{");
    const end = jsonStr.lastIndexOf("}");
    const parsed: any =
      start >= 0 && end > start
        ? JSON.parse(jsonStr.slice(start, end + 1))
        : { filters: { q: query } };

    const filters = parsed.filters || parsed;
    const intent: string | null = parsed.intent
      ? String(parsed.intent).toUpperCase()
      : null;
    const validIntents = ["BUY", "RENT", "COMPARE", "RESEARCH", "PARTS", "SERVICE"];
    const normalizedIntent = intent && validIntents.includes(intent) ? intent : null;

    const limit = Math.min(50, Number(body.limit) || 20);

    // P1-18: delegate the listing fetch to searchListings so normalization
    // is shared with the public search endpoints.
    const { results: hits } = await searchListings({
      q: filters.q ?? null,
      category: filters.categoryName ?? null,
      brand: filters.brandName ?? null,
      province: filters.province ?? null,
      transactionType: filters.listingType ?? null,
      limit: 100, // over-fetch so the post-filters still leave enough
      offset: 0,
    });

    // Post-filters that searchListings doesn't (yet) handle natively.
    const minPrice = filters.minPrice ? parseBig(filters.minPrice) : null;
    const maxPrice = filters.maxPrice ? parseBig(filters.maxPrice) : null;
    const yearFrom = filters.yearFrom ? parseNumber(filters.yearFrom) : null;
    const yearTo = filters.yearTo ? parseNumber(filters.yearTo) : null;
    const condition = filters.condition ?? null;

    const filtered = hits.filter((l) => {
      if (minPrice !== null || maxPrice !== null) {
        const p = l.price ? BigInt(l.price) : null;
        if (p === null) return false;
        if (minPrice !== null && p < minPrice) return false;
        if (maxPrice !== null && p > maxPrice) return false;
      }
      if (condition && l.condition !== condition) return false;
      if (yearFrom !== null && (l.year ?? 0) < yearFrom) return false;
      if (yearTo !== null && (l.year ?? 9999) > yearTo) return false;
      return true;
    });

    const listings = filtered.slice(0, limit);

    // Log zero-result searches as DemandSignal records (de-duped by query+intent over 1 hour)
    if (listings.length === 0) {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const existing = await db.demandSignal.findFirst({
          where: {
            query,
            intent: normalizedIntent,
            createdAt: { gte: oneHourAgo },
          },
          select: { id: true },
        });
        if (!existing) {
          await db.demandSignal.create({
            data: {
              query,
              category: filters.categoryName ?? null,
              brand: filters.brandName ?? null,
              city: filters.province ?? null,
              resultCount: 0,
              intent: normalizedIntent,
              convertedToRequest: false,
            },
          });
        }
      } catch {
        /* best-effort logging — never fail the search */
      }
    }

    // Flat shape for the client (used by HeroSearch results panel) + keep
    // the original listings array for backward compatibility.
    const flatResults = listings.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      price: l.price,
      brandName: l.brand?.name ?? null,
      categoryName: l.category?.name ?? null,
      icon: l.category?.nameEn ?? null,
      image: l.image,
      year: l.year,
      city: l.city,
      featured: l.featured,
      verified: l.verified,
    }));

    return NextResponse.json({
      success: true,
      filters,
      intent: normalizedIntent,
      count: listings.length,
      results: flatResults,
      listings: listings.map((l) => ({
        ...l,
        price: l.price,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
