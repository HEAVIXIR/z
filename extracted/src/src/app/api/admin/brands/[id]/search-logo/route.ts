import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";
import { requireAdmin } from "@/lib/admin-guard";

/* ============================================================
   POST /api/admin/brands/[id]/search-logo
   AI arm for Brand — searches the web for brand logo image
   candidates via the z-ai-web-dev-sdk image search API.
   Returns up to 5 candidates so the admin can pick one in a
   modal grid.

   Body (optional): { query?: string }
   If no query is provided, one is built from the brand's
   nameEn + name (e.g. "Caterpillar logo").

   Returns: { ok: true, results: [{ url, title, source }] }
   On AI failure: { error } with status 502 (no crash).
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  let brand: any = null;
  try {
    brand = await db.brand.findUnique({ where: { id } });
  } catch (e: any) {
    return NextResponse.json(
      { error: "DB lookup failed: " + (e?.message ?? "unknown") },
      { status: 500 },
    );
  }

  if (!brand) {
    return NextResponse.json(
      { error: "برند یافت نشد." },
      { status: 404 },
    );
  }

  // Parse body — ignore JSON errors (allow empty body)
  let body: any = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const userQuery = typeof body?.query === "string" ? body.query.trim() : "";

  const subject =
    (brand.nameEn ?? "").trim() ||
    (brand.name ?? "").trim() ||
    "industrial brand";
  const query = userQuery || `${subject} official logo transparent png`;

  // Search for logo candidates via SDK
  let rawResults: any[] = [];
  try {
    const zai = await ZAI.create();
    const resp = await zai.images.search.create({
      query,
      count: 5,
      rank: true,
    });
    rawResults = Array.isArray(resp?.results) ? resp.results : [];
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          "سرویس هوش مصنوعی در حال حاضر در دسترس نیست. لطفاً بعداً تلاش کنید یا لوگو را به‌صورت دستی بارگذاری کنید.",
        detail: e?.message ?? "unknown",
      },
      { status: 502 },
    );
  }

  // Normalize to { url, title, source }
  const results = rawResults
    .map((r: any) => ({
      url: r?.original_url ?? r?.url ?? "",
      title: r?.caption ?? r?.title ?? brand.nameEn ?? brand.name ?? "",
      source: r?.source ?? r?.host ?? "",
    }))
    .filter((r) => typeof r.url === "string" && r.url.length > 0);

  return NextResponse.json({ ok: true, results, query });
}
