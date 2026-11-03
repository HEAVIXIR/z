import { NextResponse } from "next/server";
import { searchListings, searchBrands, searchCategories } from "@/lib/search";
import { logSearchQuery } from "@/lib/demand-engine";
import { getClientIp } from "@/lib/request-context";
import { getCurrentUserId } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/search — unified public search endpoint.
   Query:
     ?q=                  free text (Persian normalized internally)
     ?type=listings|brands|categories|all   (default: all)
     ?limit=              per-section cap (default 5 for all, up to 20)
     ?category=&brand=&transactionType=&province=&city=
                          listing-only filters (forwarded to searchListings)
   Returns: { q, results: { listings: [...], brands: [...], categories: [...] } }

   This is the public search API used by the hero search + the command
   palette. It fans the query out across listings / brands / categories
   in parallel and returns a single combined payload.

   P1-18 — Persian normalization is performed inside each helper
   (searchListings / searchBrands / searchCategories) so callers don't
   need to know about ي→ی, ك→ک, ZWNJ, Arabic→Persian digits, etc.
*/
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const type = (url.searchParams.get("type") ?? "all").toLowerCase().trim();
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit")) || 5));

    const category = url.searchParams.get("category")?.trim() || null;
    const brand = url.searchParams.get("brand")?.trim() || null;
    const transactionType = url.searchParams.get("transactionType")?.trim() || null;
    const province = url.searchParams.get("province")?.trim() || null;
    const city = url.searchParams.get("city")?.trim() || null;

    if (!q) {
      return NextResponse.json({
        q: "",
        results: { listings: [], brands: [], categories: [] },
      });
    }

    const validTypes = ["listings", "brands", "categories", "all"];
    const t = validTypes.includes(type) ? type : "all";

    const wantListings = t === "all" || t === "listings";
    const wantBrands = t === "all" || t === "brands";
    const wantCategories = t === "all" || t === "categories";

    // For "all" we cap each section at `limit` (default 5) so the
    // payload stays small for the command palette. When a single
    // section is requested, we relax the cap to 20.
    const sectionCap = t === "all" ? limit : Math.max(limit, 20);

    const [listings, brands, categories] = await Promise.all([
      wantListings
        ? searchListings({
            q,
            category,
            brand,
            transactionType,
            province,
            city,
            limit: sectionCap,
            offset: 0,
          }).then((r) => r.results)
        : Promise.resolve([]),
      wantBrands ? searchBrands(q, { take: sectionCap }) : Promise.resolve([]),
      wantCategories
        ? searchCategories(q, { take: sectionCap })
        : Promise.resolve([]),
    ]);

    // P2-23 Demand Engine — log the search (fire-and-forget, never
    // block the response). We log the union of results so the demand
    // layer has an accurate hasResults flag.
    const totalResults =
      listings.length + brands.length + categories.length;
    Promise.resolve()
      .then(async () => {
        const userId = await getCurrentUserId().catch(() => null);
        await logSearchQuery({
          query: q,
          resultCount: totalResults,
          userId,
          ip: getClientIp(req),
          categorySlug: category,
          brandSlug: brand,
        });
      })
      .catch(() => {
        /* demand logging must never break search */
      });

    // P1-2 — also track as an AnalyticsEvent (fire-and-forget).
    trackEvent({
      eventType: "SEARCH",
      query: q,
      userId: null, // resolved above but not awaited here — leave null
      categoryId: null, // slug-based; AnalyticsEvent stores IDs — skipped
      brandId: null,
      page: "/api/search",
      ip: getClientIp(req),
    });

    return NextResponse.json({
      q,
      results: {
        listings,
        brands,
        categories,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
