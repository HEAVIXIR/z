import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/parts/[id]/reviews — PUBLIC review submission
   Customer submits a review by phone (we upsert the Customer row
   by phone). Reviews are created with approved=false — moderated
   by the admin from /admin/store.
   ============================================================ */

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: partId } = await params;
  try {
    const body = await req.json();
    const phone = String(body.phone || "").trim();
    const name = String(body.name || "").trim();
    const family = String(body.family || "").trim();
    const rating = Number(body.rating);
    const title = body.title ? String(body.title) : null;
    const comment = body.comment ? String(body.comment) : null;

    if (!phone || phone.length < 8) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "امتیاز باید بین ۱ تا ۵ باشد" }, { status: 400 });
    }

    const part = await storeDb.part.findUnique({ where: { id: partId } });
    if (!part) {
      return NextResponse.json({ error: "قطعه یافت نشد" }, { status: 404 });
    }

    // upsert customer by phone
    const customer = await storeDb.customer.upsert({
      where: { phone },
      update: { name, family: family || "" },
      create: { phone, name, family: family || "" },
    });

    const review = await storeDb.review.create({
      data: {
        partId,
        customerId: customer.id,
        rating: Math.round(rating),
        title,
        comment,
        approved: false,
      },
    });

    return NextResponse.json({ ok: true, review });
  } catch (e: any) {
    console.error("[api/store/parts/[id]/reviews POST] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
