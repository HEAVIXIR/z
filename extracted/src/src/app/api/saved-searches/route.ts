import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(s: any) {
  return {
    ...s,
    minPrice: s.minPrice ? s.minPrice.toString() : null,
    maxPrice: s.maxPrice ? s.maxPrice.toString() : null,
  };
}

/* GET /api/saved-searches */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const items = await db.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ savedSearches: items.map(serialize) });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/saved-searches */
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const s = await db.savedSearch.create({
      data: {
        name: String(body.name),
        query: body.query ?? null,
        categorySlug: body.categorySlug ?? null,
        brandSlug: body.brandSlug ?? null,
        minPrice: parseBig(body.minPrice),
        maxPrice: parseBig(body.maxPrice),
        condition: body.condition ?? null,
        city: body.city ?? null,
        notifyEmail: body.notifyEmail !== false,
        notifyPush: Boolean(body.notifyPush),
        active: body.active !== false,
        userId,
      },
    });
    return NextResponse.json({ ok: true, savedSearch: serialize(s) });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/saved-searches?id=... */
export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const data: any = {};
    const allowed = [
      "name", "query", "categorySlug", "brandSlug", "condition",
      "city", "notifyEmail", "notifyPush", "active",
    ];
    for (const k of allowed) {
      if (k in body) {
        if (k === "notifyEmail" || k === "notifyPush" || k === "active") data[k] = Boolean(body[k]);
        else data[k] = body[k] === undefined ? null : body[k];
      }
    }
    if ("minPrice" in body) data.minPrice = parseBig(body.minPrice);
    if ("maxPrice" in body) data.maxPrice = parseBig(body.maxPrice);
    const s = await db.savedSearch.update({ where: { id, userId }, data });
    return NextResponse.json({ ok: true, savedSearch: serialize(s) });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/saved-searches?id=... */
export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await db.savedSearch.deleteMany({ where: { id, userId } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
