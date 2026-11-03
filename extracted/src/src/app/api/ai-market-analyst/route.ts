import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/ai-market-analyst
   Body: { question }
   Admin-only. Aggregates market data and asks AI to analyze it.
*/
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const question = String(body.question ?? "").trim();
    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    // Gather market context
    const totalListings = await db.listing.count();
    const published = await db.listing.count({ where: { status: "PUBLISHED" } });
    const sold = await db.listing.count({ where: { status: "SOLD" } });
    const avgPrice = await db.listing.aggregate({
      _avg: { price: true },
      where: { price: { not: null }, status: "PUBLISHED" },
    });
    const totalRequests = await db.buyRequest.count({ where: { status: "ACTIVE" } });
    const topBrands = await db.brand.findMany({
      include: { _count: { select: { listings: true } } },
      take: 30,
    });
    const topCategories = await db.category.findMany({
      include: { _count: { select: { listings: true } } },
      take: 30,
    });
    const recentListings = await db.listing.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { title: true, price: true, province: true, brandId: true, categoryId: true },
    });

    const context = {
      stats: {
        totalListings,
        published,
        sold,
        avgPrice: avgPrice._avg.price
          ? Number(avgPrice._avg.price).toFixed(0)
          : null,
        totalRequests,
      },
      topBrands: topBrands
        .map((b) => ({ name: b.name, count: b._count.listings }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topCategories: topCategories
        .map((c) => ({ name: c.name, count: c._count.listings }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      recentListings: recentListings.map((l) => ({
        title: l.title,
        price: l.price ? l.price.toString() : null,
        province: l.province,
      })),
    };

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are HEAVIX market analyst assistant. Answer the admin's question in Persian using the provided market data context. Be concise and data-driven.",
        },
        {
          role: "user",
          content: `MARKET DATA:\n${JSON.stringify(context, null, 2)}\n\nQUESTION: ${question}`,
        },
      ],
      thinking: { type: "disabled" },
    });
    const answer = completion?.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      question,
      answer,
      context,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
