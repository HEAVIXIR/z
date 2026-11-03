import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getComparisonData } from "@/lib/compare-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/compare/[id] — fetch a comparison session + its
   full comparison table.
   Returns:
     {
       session: { id, name, status, shareToken, createdAt, aiSummary, aiSummaryAt },
       data: { items, rows, attributes, differences, crossCategoryWarning, categories }
     }
   ============================================================ */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await db.comparisonSession.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        shareToken: true,
        shareExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        aiSummary: true,
        aiSummaryAt: true,
        userId: true,
      },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status === "ARCHIVED") {
      return NextResponse.json({ error: "Session archived" }, { status: 410 });
    }

    const data = await getComparisonData(id);

    return NextResponse.json({
      session: {
        id: session.id,
        name: session.name,
        status: session.status,
        shareToken: session.shareToken,
        shareExpiresAt: session.shareExpiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        aiSummary: session.aiSummary,
        aiSummaryAt: session.aiSummaryAt,
        userId: session.userId,
      },
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ============================================================
   DELETE /api/compare/[id] — archive (soft-delete) a session.
   ============================================================ */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
   PATCH /api/compare/[id] — rename a session or refresh share token.
   Body: { name?: string, refreshShareToken?: boolean, shareExpiresAt?: string|null }
   ============================================================ */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const patch: any = {};

    if (typeof body.name === "string") {
      patch.name = body.name.trim().slice(0, 200) || null;
    }
    if (body.refreshShareToken === true) {
      // 24-char base64url token
      const bytes = new Uint8Array(18);
      crypto.getRandomValues(bytes);
      const b64 = btoa(String.fromCharCode(...bytes));
      patch.shareToken = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    if (body.shareExpiresAt === null) {
      patch.shareExpiresAt = null;
    } else if (typeof body.shareExpiresAt === "string") {
      const d = new Date(body.shareExpiresAt);
      if (!isNaN(d.getTime())) patch.shareExpiresAt = d;
    }

    const updated = await db.comparisonSession.update({
      where: { id },
      data: patch,
      select: {
        id: true,
        name: true,
        status: true,
        shareToken: true,
        shareExpiresAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ session: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
