import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { getComparisonData } from "@/lib/compare-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/admin/compare/[id] — fetch a single session's full
   comparison data + AI summary for the admin detail view.
   ============================================================ */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const session = await db.comparisonSession.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        userId: true,
        shareToken: true,
        shareExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        aiSummary: true,
        aiSummaryAt: true,
        items: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            listingId: true,
            productId: true,
            brandId: true,
            modelId: true,
            sortOrder: true,
          },
        },
      },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    let data = null;
    try {
      data = await getComparisonData(id);
    } catch {
      /* session may have no valid items */
    }

    return NextResponse.json({ session, data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ============================================================
   DELETE /api/admin/compare/[id] — archive a session.
   ============================================================ */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await db.comparisonSession.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ============================================================
   PATCH /api/admin/compare/[id] — rename a session.
   Body: { name?: string }
   ============================================================ */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const patch: any = {};
    if (typeof body.name === "string") {
      patch.name = body.name.trim().slice(0, 200) || null;
    }
    const updated = await db.comparisonSession.update({
      where: { id },
      data: patch,
      select: { id: true, name: true, updatedAt: true },
    });
    return NextResponse.json({ session: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
