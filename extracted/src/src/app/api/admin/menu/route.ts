import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/menu */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const items = await db.menuItem.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

function menuData(body: any) {
  const data: any = {};
  const allowed = ["title", "href", "icon", "order", "parentId", "openInNew", "active"];
  for (const k of allowed) {
    if (k in body) {
      if (k === "openInNew" || k === "active") data[k] = Boolean(body[k]);
      else if (k === "order") data[k] = Number(body[k]) || 0;
      else data[k] = body[k] === undefined ? null : body[k];
    }
  }
  return data;
}

/* POST /api/admin/menu — create new item. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const item = await db.menuItem.create({ data: menuData(body) });
    return NextResponse.json({ ok: true, item });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PUT /api/admin/menu — bulk update (body.items: [{id, ...}]) or single ({id, ...}). */
export async function PUT(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body.items)) {
      await Promise.all(
        body.items.map((it: any) =>
          db.menuItem.update({
            where: { id: String(it.id) },
            data: menuData(it),
          }),
        ),
      );
      const items = await db.menuItem.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      return NextResponse.json({ ok: true, items });
    }
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const item = await db.menuItem.update({
      where: { id: String(body.id) },
      data: menuData(body),
    });
    return NextResponse.json({ ok: true, item });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/admin/menu?id=... */
export async function DELETE(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await db.menuItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
