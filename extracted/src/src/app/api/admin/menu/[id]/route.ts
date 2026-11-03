import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

/* ============================================================
   /api/admin/menu/[id] — update + delete a single menu item.
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const item = await db.menuItem.update({
      where: { id },
      data: {
        title: body.title !== undefined ? String(body.title) : undefined,
        href: body.href !== undefined ? (body.href || null) : undefined,
        parentId: body.parentId !== undefined ? (body.parentId || null) : undefined,
        icon: body.icon !== undefined ? (body.icon || null) : undefined,
        order: body.order !== undefined ? Number(body.order) : undefined,
        active: body.active !== undefined ? Boolean(body.active) : undefined,
        openInNew: body.openInNew !== undefined ? Boolean(body.openInNew) : undefined,
      },
    });
    return NextResponse.json({ success: true, data: item });
  } catch (e) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // Build update data — accept any subset of the editable fields.
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = String(body.title);
    if (body.href !== undefined) data.href = body.href ? String(body.href) : null;
    if (body.parentId !== undefined) data.parentId = body.parentId ? String(body.parentId) : null;
    if (body.icon !== undefined) data.icon = body.icon ? String(body.icon) : null;
    if (body.order !== undefined) {
      const n = Number(body.order);
      if (Number.isFinite(n)) data.order = Math.trunc(n);
    }
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.openInNew !== undefined) data.openInNew = Boolean(body.openInNew);

    const item = await db.menuItem.update({ where: { id }, data });
    return NextResponse.json({ ok: true, success: true, item });
  } catch (e) {
    return NextResponse.json({ error: "Patch failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await db.menuItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
