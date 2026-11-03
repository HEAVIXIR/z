import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId, isAuthenticated } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

function serialize(o: any) {
  return {
    ...o,
    offerAmount: o.offerAmount ? o.offerAmount.toString() : null,
    counterAmount: o.counterAmount ? o.counterAmount.toString() : null,
  };
}

/* PATCH /api/offers/[id] — seller respond (accept/reject/counter).
 *
 * FIX-ADMIN-EDITABILITY — admins (valid admin session) can now act on
 * any offer from /admin/offers. Sellers continue to be authorized
 * against `listing.sellerId`. Either auth path is sufficient.
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const userId = await getCurrentUserId();
    const adminOk = await isAuthenticated();

    const offer = await db.listingOffer.findUnique({
      where: { id },
      include: { listing: true },
    });
    if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Authorization: seller (owner of the listing) OR admin.
    const isSeller = !!userId && offer.listing.sellerId === userId;
    if (!isSeller && !adminOk) {
      return NextResponse.json(
        { error: "فقط فروشنده یا مدیر می‌تواند پاسخ دهد" },
        { status: 403 },
      );
    }

    const action = String(body.action ?? "");
    let data: any = { respondedAt: new Date() };
    if (action === "accept") data.status = "ACCEPTED";
    else if (action === "reject") data.status = "REJECTED";
    else if (action === "counter") {
      data.status = "COUNTERED";
      data.counterAmount = parseBig(body.counterAmount);
      if (!data.counterAmount) {
        return NextResponse.json(
          { error: "counterAmount is required for counter" },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    if (body.sellerNote !== undefined) data.sellerNote = body.sellerNote;

    const updated = await db.listingOffer.update({ where: { id }, data });

    // Notify buyer if registered
    if (offer.buyerId) {
      await db.notification.create({
        data: {
          userId: offer.buyerId,
          type: "OFFER_RESPONSE",
          title: "پاسخ به پیشنهاد شما",
          body: `پیشنهاد شما برای آگهی «${offer.listing.title}» ${action === "accept" ? "پذیرفته شد" : action === "reject" ? "رد شد" : "پاسخ داده شد"}.`,
          link: `/listings/${offer.listing.slug}`,
        },
      });
    }

    return NextResponse.json({ ok: true, offer: serialize(updated) });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/offers/[id] — buyer cancels their own offer. */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    const offer = await db.listingOffer.findUnique({ where: { id } });
    if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!userId || (offer.buyerId !== userId && !offer.buyerPhone)) {
      return NextResponse.json(
        { error: "فقط خریدار می‌تواند لغو کند" },
        { status: 403 },
      );
    }
    await db.listingOffer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
