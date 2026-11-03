import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/expert-consult — buyer requests expert consultation.
   Body: { listingId?, question, buyerPhone, buyerName? }
   Creates ExpertConsultation record + Lead.
*/
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const question = String(body.question ?? "").trim();
    const buyerPhone = String(body.buyerPhone ?? "").trim();
    const listingId = body.listingId ? String(body.listingId) : null;

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    if (!buyerPhone) {
      return NextResponse.json({ error: "buyerPhone is required" }, { status: 400 });
    }

    const user = await getCurrentUser();

    const consult = await db.expertConsultation.create({
      data: {
        listingId,
        question,
        buyerPhone,
        buyerName: body.buyerName ? String(body.buyerName) : null,
        buyerId: user?.id ?? null,
        status: "PENDING",
      },
    });

    // Create a Lead entry so sellers/admin see this request
    if (listingId) {
      try {
        await db.lead.create({
          data: {
            listingId,
            leadType: "EXPERT_CONSULT",
            viewerPhone: buyerPhone,
            viewerName: body.buyerName ? String(body.buyerName) : null,
            note: `مشاوره با کارشناس: ${question.substring(0, 200)}`,
          },
        });
      } catch {
        /* best effort */
      }
    }

    return NextResponse.json({ ok: true, id: consult.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* GET /api/expert-consult — admin lists consultation requests. */
export async function GET() {
  try {
    const items = await db.expertConsultation.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({
      items: items.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
