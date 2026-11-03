import { NextResponse } from "next/server";
import { addItem } from "@/lib/compare-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   POST /api/compare/[id]/items — add an item to a session.
   Body: { listingId?, productId?, brandId?, modelId? }
   At least one identifier must be provided. Enforces 5-item cap.
   Returns: { item: { id, sessionId, sortOrder } }
   ============================================================ */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const listingId = typeof body.listingId === "string" ? body.listingId : undefined;
    const productId = typeof body.productId === "string" ? body.productId : undefined;
    const brandId = typeof body.brandId === "string" ? body.brandId : undefined;
    const modelId = typeof body.modelId === "string" ? body.modelId : undefined;

    if (!listingId && !productId && !brandId && !modelId) {
      return NextResponse.json(
        { error: "حداقل یکی از listingId/productId/brandId/modelId لازم است" },
        { status: 400 },
      );
    }

    const item = await addItem(id, { listingId, productId, brandId, modelId });
    return NextResponse.json({ item });
  } catch (err: any) {
    const msg = err?.message ?? "Server error";
    const status = msg.includes("حداکثر") ? 400 : msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
