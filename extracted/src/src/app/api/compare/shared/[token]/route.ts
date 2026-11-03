import { NextResponse } from "next/server";
import { getSessionByShareToken, getComparisonData } from "@/lib/compare-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/compare/shared/[token] — public shared comparison.
   No auth required. Respects the share token's expiry.
   Returns:
     {
       session: { id, name, shareExpiresAt },
       data: { items, rows, attributes, differences, crossCategoryWarning, categories }
     }
   ============================================================ */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const session = await getSessionByShareToken(token);
    if (!session) {
      return NextResponse.json({ error: "لینک اشتراک‌گذاری نامعتبر یا منقضی است" }, { status: 404 });
    }

    const data = await getComparisonData(session.id);

    return NextResponse.json({
      session: {
        id: session.id,
        name: session.name,
        shareExpiresAt: session.shareExpiresAt,
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
