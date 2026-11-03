import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { parseBig, parseBool, parseNumber } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(l: any) {
  return {
    ...l,
    price: l.price ? l.price.toString() : null,
    images: (l.images ?? []).map((i: any) => ({ ...i })),
  };
}

/* GET /api/admin/listings — list with filters + stats. */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || undefined;
    const status = url.searchParams.get("status") || undefined;
    const brandId = url.searchParams.get("brandId") || undefined;
    const categoryId = url.searchParams.get("categoryId") || undefined;
    const featured = url.searchParams.get("featured");
    const verified = url.searchParams.get("verified");
    const showInLatest = url.searchParams.get("showInLatest");
    const sort = url.searchParams.get("sort") || "newest";
    const limit = parseNumber(url.searchParams.get("limit")) ?? 100;
    const offset = parseNumber(url.searchParams.get("offset")) ?? 0;

    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { shortDesc: { contains: q } },
        { sellerName: { contains: q } },
        { sellerPhone: { contains: q } },
      ];
    }
    if (status) where.status = status;
    if (brandId) where.brandId = brandId;
    if (categoryId) where.categoryId = categoryId;
    if (featured !== null && featured !== undefined && featured !== "")
      where.featured = parseBool(featured);
    if (verified) where.verified = parseBool(verified);
    if (showInLatest) where.showInLatest = parseBool(showInLatest);

    let orderBy: any = { createdAt: "desc" };
    if (sort === "oldest") orderBy = { createdAt: "asc" };
    else if (sort === "price_desc") orderBy = { price: "desc" };
    else if (sort === "price_asc") orderBy = { price: "asc" };
    else if (sort === "views") orderBy = { viewCount: "desc" };
    else if (sort === "title") orderBy = { title: "asc" };

    const [listings, total] = await Promise.all([
      db.listing.findMany({
        where,
        include: {
          brand: { select: { id: true, name: true, nameEn: true } },
          category: { select: { id: true, name: true, nameEn: true } },
          images: { orderBy: { sortOrder: "asc" } },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      db.listing.count({ where }),
    ]);

    // Stats
    const [totalListings, featuredCount, verifiedCount, publishedCount, soldCount, pendingCount] =
      await Promise.all([
        db.listing.count(),
        db.listing.count({ where: { featured: true } }),
        db.listing.count({ where: { verified: true } }),
        db.listing.count({ where: { status: "PUBLISHED" } }),
        db.listing.count({ where: { status: "SOLD" } }),
        db.listing.count({ where: { status: "PENDING" } }),
      ]);

    return NextResponse.json({
      listings: listings.map(serialize),
      total,
      stats: {
        total: totalListings,
        featured: featuredCount,
        verified: verifiedCount,
        published: publishedCount,
        sold: soldCount,
        pending: pendingCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/listings — bulk actions. (P0-RBAC: requires listing.publish) */
export async function POST(req: Request) {
  // Authorization: legacy admin-cookie path OR user session with `listing.publish`.
  // The admin-cookie path is legacy (see src/app/admin/layout.tsx) and bypasses RBAC.
  const adminCookieOk = await isAuthenticated();
  const sessionUser = adminCookieOk ? null : await getCurrentUser();
  if (!adminCookieOk && !sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sessionUser && !(await hasPermission(sessionUser.id, "listing.publish"))) {
    return NextResponse.json(
      { error: "Forbidden: missing permission 'listing.publish'" },
      { status: 403 },
    );
  }
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "ids is required" }, { status: 400 });
    }

    const now = new Date();
    const EXTEND_DAYS = 30;
    const extendedAt = new Date(now.getTime() + EXTEND_DAYS * 24 * 60 * 60 * 1000);

    let data: any = {};
    switch (action) {
      case "feature": data = { featured: true }; break;
      case "unfeature": data = { featured: false }; break;
      case "verify": data = { verified: true }; break;
      case "unverify": data = { verified: false }; break;
      case "showInLatest": data = { showInLatest: true }; break;
      case "hideFromLatest": data = { showInLatest: false }; break;
      case "publish": data = { status: "PUBLISHED", publishedAt: now }; break;
      case "pause": data = { status: "PAUSED" }; break;
      case "extend": data = { expiresAt: extendedAt }; break;
      case "markSold": data = { status: "SOLD", soldAt: now }; break;
      case "delete":
        await db.listing.deleteMany({ where: { id: { in: ids } } });
        return NextResponse.json({ ok: true, action, count: ids.length });
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const result = await db.listing.updateMany({
      where: { id: { in: ids } },
      data,
    });

    return NextResponse.json({ ok: true, action, updated: result.count });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
