import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/rejections-all — all rejections. */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const items = await db.listingRejection.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            sellerPhone: true,
            sellerName: true,
            sellerId: true,
            images: { take: 1, orderBy: { sortOrder: "asc" } },
          },
        },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    return NextResponse.json({ rejections: items });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
