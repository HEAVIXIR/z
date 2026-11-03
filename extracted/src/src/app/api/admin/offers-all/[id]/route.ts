import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

const ALLOWED_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "COUNTERED",
  "EXPIRED",
  "WITHDRAWN",
];

function serialize(o: any) {
  return {
    ...o,
    offerAmount: o.offerAmount ? o.offerAmount.toString() : null,
    counterAmount: o.counterAmount ? o.counterAmount.toString() : null,
  };
}

/* GET /api/admin/offers-all/[id] — single offer with relations. */
export async function GET(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const offer = await db.listingOffer.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            status: true,
            sellerName: true,
            sellerPhone: true,
          },
        },
        buyer: {
          select: { id: true, firstName: true, lastName: true, mobile: true, email: true },
        },
      },
    });
    if (!offer) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: serialize({
        ...offer,
        listing: {
          ...offer.listing,
          price: offer.listing?.price ? offer.listing.price.toString() : null,
        },
      }),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/admin/offers-all/[id]
   Body: {
     status?: "PENDING"|"ACCEPTED"|"REJECTED"|"COUNTERED"|"EXPIRED"|"WITHDRAWN",
     adminNote?: string | null,    // stored on sellerNote
     counterPrice?: string | number | null, // stored on counterAmount
     markListingSold?: boolean     // optional: when ACCEPTED, also set listing status to SOLD
   }
*/
export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = await db.listingOffer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const data: any = { respondedAt: new Date() };

    if (body.status !== undefined) {
      const status = String(body.status).trim().toUpperCase();
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: `status must be one of ${ALLOWED_STATUSES.join(", ")}` },
          { status: 400 },
        );
      }
      data.status = status;
    }

    if (body.adminNote !== undefined) {
      data.sellerNote =
        body.adminNote === null || body.adminNote === ""
          ? null
          : String(body.adminNote).slice(0, 4000);
    }

    if (body.counterPrice !== undefined) {
      data.counterAmount = parseBig(body.counterPrice);
    }

    // Optional: when accepting an offer, also flip the listing to SOLD.
    const shouldMarkListingSold =
      body.markListingSold === true ||
      (data.status === "ACCEPTED" && body.markListingSold !== false);

    const updated = await db.listingOffer.update({
      where: { id },
      data,
      include: {
        listing: {
          select: { id: true, title: true, slug: true, price: true, status: true },
        },
      },
    });

    if (shouldMarkListingSold && updated.listingId) {
      try {
        await db.listing.update({
          where: { id: updated.listingId },
          data: { status: "SOLD", soldAt: new Date() },
        });
      } catch {
        /* non-fatal — listing update is best-effort */
      }
    }

    try {
      await logAudit({
        actorType: "ADMIN",
        action: "offer.update",
        entityType: "ListingOffer",
        entityId: id,
        before: serialize(existing),
        after: serialize(updated),
        reason: `تغییر وضعیت پیشنهاد${data.status ? ` به ${data.status}` : ""}`,
      });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      success: true,
      data: serialize({
        ...updated,
        listing: {
          ...updated.listing,
          price: updated.listing?.price ? updated.listing.price.toString() : null,
        },
      }),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/admin/offers-all/[id] */
export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.listingOffer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    await db.listingOffer.delete({ where: { id } });

    try {
      await logAudit({
        actorType: "ADMIN",
        action: "offer.delete",
        entityType: "ListingOffer",
        entityId: id,
        before: serialize(existing),
        reason: "حذف پیشنهاد توسط مدیر",
      });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
