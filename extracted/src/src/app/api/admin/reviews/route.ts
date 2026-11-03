import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/reviews?status=PENDING — moderation queue. Default: PENDING. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status")?.trim() || "PENDING";
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);

    const reviews = await db.review.findMany({
      where: status === "ALL" ? {} : { status },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, mobile: true } },
        company: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, firstName: true, lastName: true } },
        listing: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ reviews });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
