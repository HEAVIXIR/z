import { NextResponse } from "next/server";
import { removeItem } from "@/lib/compare-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   DELETE /api/compare/[id]/items/[itemId] — remove a single
   item from a session. Re-computes sortOrder lazily on the
   next getComparisonData call (sortOrder is a hint, not enforced).
   ============================================================ */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { id, itemId } = await params;
    await removeItem(id, itemId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
