import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* PATCH /api/reviews/[id] — the reviewed seller/company responds.
   Body: { response: string }
   Only the individual seller being reviewed, or a user belonging to the
   reviewed company, may post the response — and only once. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const review = await db.review.findUnique({ where: { id } });
    if (!review) {
      return NextResponse.json({ error: "نظر یافت نشد" }, { status: 404 });
    }

    const isReviewedSeller = review.sellerId && review.sellerId === user.id;
    const isReviewedCompany = review.companyId && review.companyId === user.companyId;
    if (!isReviewedSeller && !isReviewedCompany) {
      return NextResponse.json({ error: "شما مجاز به پاسخ به این نظر نیستید" }, { status: 403 });
    }
    if (review.sellerResponse) {
      return NextResponse.json({ error: "قبلاً به این نظر پاسخ داده شده است" }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const response = String(body.response ?? "").trim().slice(0, 1000);
    if (!response || response.length < 3) {
      return NextResponse.json({ error: "متن پاسخ خیلی کوتاه است" }, { status: 400 });
    }

    const updated = await db.review.update({
      where: { id },
      data: { sellerResponse: response, sellerRespondedAt: new Date() },
    });

    await logAudit({
      actorId: user.id,
      actorType: "USER",
      action: "review.respond",
      entityType: "Review",
      entityId: id,
      after: { sellerResponse: response },
      ip: getClientIp(req),
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* DELETE /api/reviews/[id] — the author can withdraw their own review,
   but only while it's still PENDING (not yet published/moderated). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const review = await db.review.findUnique({ where: { id } });
    if (!review) {
      return NextResponse.json({ error: "نظر یافت نشد" }, { status: 404 });
    }
    if (review.authorId !== user.id) {
      return NextResponse.json({ error: "این نظر متعلق به شما نیست" }, { status: 403 });
    }
    if (review.status !== "PENDING") {
      return NextResponse.json({ error: "فقط نظرات در انتظار بررسی قابل حذف هستند" }, { status: 409 });
    }

    await db.review.delete({ where: { id } });

    await logAudit({
      actorId: user.id,
      actorType: "USER",
      action: "review.delete",
      entityType: "Review",
      entityId: id,
      ip: getClientIp(req),
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
