import { NextResponse } from "next/server";
import {
  getEntityGraph,
  getBrandGraph,
  getCategoryGraph,
  getProductGraph,
} from "@/lib/knowledge-graph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/knowledge-graph — public knowledge-graph read API.

   Query:
     ?entityType=Brand|Model|Product|Machine|Part|Attachment|Category|Listing|Company
     ?entityId=<id>
     ?depth=<1-3>            (default 2)
     ?view=graph|brand|category|product
                            (default graph; for brand/category/product
                             the full-context bundles are returned)

   Returns:
     graph   → { nodes: GraphNode[], edges: GraphEdge[] }
     brand   → BrandGraph bundle
     category→ CategoryGraph bundle
     product → ProductGraph bundle

   All variants are public read (no auth) — the data is the same
   as what's surfaced on the public brand/category/product pages.
*/
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const entityType = (url.searchParams.get("entityType") ?? "").trim();
    const entityId = (url.searchParams.get("entityId") ?? "").trim();
    const depthRaw = Number(url.searchParams.get("depth")) || 2;
    const depth = Math.min(3, Math.max(1, depthRaw));
    const view = (url.searchParams.get("view") ?? "graph").toLowerCase().trim();

    // The brand/category/product bundles can be fetched directly
    // without entityType/entityId pairs (they take a single id).
    if (view === "brand") {
      const brandId = entityId || (url.searchParams.get("brandId") ?? "").trim();
      if (!brandId) {
        return NextResponse.json(
          { error: "brandId (or entityId) is required for view=brand" },
          { status: 400 },
        );
      }
      const bundle = await getBrandGraph(brandId);
      return NextResponse.json({ view: "brand", ...bundle });
    }
    if (view === "category") {
      const categoryId = entityId || (url.searchParams.get("categoryId") ?? "").trim();
      if (!categoryId) {
        return NextResponse.json(
          { error: "categoryId (or entityId) is required for view=category" },
          { status: 400 },
        );
      }
      const bundle = await getCategoryGraph(categoryId);
      return NextResponse.json({ view: "category", ...bundle });
    }
    if (view === "product") {
      const productId = entityId || (url.searchParams.get("productId") ?? "").trim();
      if (!productId) {
        return NextResponse.json(
          { error: "productId (or entityId) is required for view=product" },
          { status: 400 },
        );
      }
      const bundle = await getProductGraph(productId);
      return NextResponse.json({ view: "product", ...bundle });
    }

    // Default: generic BFS graph view.
    if (!entityType || !entityId) {
      return NextResponse.json(
        {
          error:
            "entityType and entityId are required (or use view=brand|category|product with the appropriate id)",
        },
        { status: 400 },
      );
    }

    const graph = await getEntityGraph(entityType, entityId, depth);
    return NextResponse.json({ view: "graph", ...graph });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
