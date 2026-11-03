import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/offers-all — admin view of all offers. */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const limit = Number(url.searchParams.get("limit")) || 100;

    const where: any = {};
    if (status) where.status = status;

    const offers = await db.listingOffer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        listing: {
          select: { id: true, title: true, slug: true, sellerName: true, sellerPhone: true },
        },
      },
    });

    return NextResponse.json({
      offers: offers.map((o) => ({
        ...o,
        offerAmount: o.offerAmount ? o.offerAmount.toString() : null,
        counterAmount: o.counterAmount ? o.counterAmount.toString() : null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
