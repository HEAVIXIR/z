import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/* GET /api/admin/knowledge-entries/[id] — single entry detail. */
export async function GET(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const entry = await db.knowledgeEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: {
        ...entry,
        verifiedAt: entry.verifiedAt?.toISOString() ?? null,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/admin/knowledge-entries/[id] — admin update. */
export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const existing = await db.knowledgeEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: any = {};
    const allowed = [
      "entityType",
      "entityId",
      "title",
      "key",
      "value",
      "unit",
      "source",
      "sourceUrl",
      "sourceRef",
      "verifiedBy",
    ];
    for (const k of allowed) {
      if (k in body) {
        data[k] = body[k] === undefined || body[k] === "" ? null : body[k];
      }
    }
    // Boolean fields
    if ("verified" in body) {
      data.verified = Boolean(body.verified);
      // When toggling verified ON, stamp verifiedAt — otherwise clear it.
      if (data.verified) {
        data.verifiedAt = new Date();
      } else {
        data.verifiedAt = null;
      }
    }
    if ("aiSuggested" in body) {
      data.aiSuggested = Boolean(body.aiSuggested);
    }

    // If (entityType, entityId, key) is being changed and would collide,
    // update would fail with a unique-constraint error — surface it cleanly.
    const updated = await db.knowledgeEntry.update({
      where: { id },
      data,
    });
    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        verifiedAt: updated.verifiedAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/admin/knowledge-entries/[id] — admin delete. */
export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.knowledgeEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.knowledgeEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
