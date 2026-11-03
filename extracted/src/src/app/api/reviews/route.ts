import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { recomputeRatingFor, serializeReview } from "@/lib/reviews";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/reviews?companyId=X | ?sellerId=X — published reviews only, newest first. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId")?.trim() || undefined;
    const sellerId = url.searchParams.get("sellerId")?.trim() || undefined;
    if (!companyId && !sellerId) {
      return NextResponse.json({ error: "companyId or sellerId is required" }, { status: 400 });
    }
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);

    const reviews = await db.review.findMany({
      where: { status: "PUBLISHED", ...(companyId ? { companyId } : { sellerId }) },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        listing: { select: { id: true, slug: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ reviews: reviews.map(serializeReview) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* POST /api/reviews — submit a review.
   Body: { companyId? , sellerId?, dealRoomId?, listingId?, rating (1-5), title?, body }
   Exactly one of companyId / sellerId is required. New reviews start PENDING
   and are hidden from public listing until an admin publishes them — unless
   they're anchored to a DealRoom the author actually took part in, in which
   case they auto-publish as a verified deal. */
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "برای ثبت نظر ابتدا وارد شوید" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const companyId = body.companyId ? String(body.companyId) : null;
    const sellerId = body.sellerId ? String(body.sellerId) : null;
    const dealRoomId = body.dealRoomId ? String(body.dealRoomId) : null;
    const listingId = body.listingId ? String(body.listingId) : null;
    const rating = Number(body.rating);
    const title = body.title ? String(body.title).slice(0, 120) : null;
    const text = String(body.body ?? "").trim();

    if (!companyId && !sellerId) {
      return NextResponse.json({ error: "companyId یا sellerId الزامی است" }, { status: 400 });
    }
    if (companyId && sellerId) {
      return NextResponse.json({ error: "نظر باید فقط برای یک شرکت یا یک فروشنده باشد" }, { status: 400 });
    }
    if (sellerId === userId) {
      return NextResponse.json({ error: "نمی‌توانید برای خودتان نظر ثبت کنید" }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "امتیاز باید عددی بین ۱ تا ۵ باشد" }, { status: 400 });
    }
    if (!text || text.length < 5) {
      return NextResponse.json({ error: "متن نظر خیلی کوتاه است" }, { status: 400 });
    }

    let verifiedDeal = false;
    if (dealRoomId) {
      const deal = await db.dealRoom.findUnique({ where: { id: dealRoomId } });
      if (!deal || (deal.buyerId !== userId && deal.sellerId !== userId)) {
        return NextResponse.json({ error: "این معامله متعلق به شما نیست" }, { status: 403 });
      }
      const existingForDeal = await db.review.findUnique({ where: { dealRoomId } });
      if (existingForDeal) {
        return NextResponse.json({ error: "برای این معامله قبلاً نظر ثبت شده است" }, { status: 409 });
      }
      verifiedDeal = true;
    }

    const review = await db.review.create({
      data: {
        authorId: userId,
        companyId,
        sellerId,
        dealRoomId,
        listingId,
        rating,
        title,
        body: text,
        verifiedDeal,
        status: verifiedDeal ? "PUBLISHED" : "PENDING",
      },
    });

    if (verifiedDeal) {
      await recomputeRatingFor(review);
    }

    await logAudit({
      actorId: userId,
      actorType: "USER",
      action: "review.create",
      entityType: "Review",
      entityId: review.id,
      after: { companyId, sellerId, rating, verifiedDeal, status: review.status },
      ip: getClientIp(req),
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: review.id, status: review.status });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "شما قبلاً برای این مورد نظر ثبت کرده‌اید" }, { status: 409 });
    }
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
