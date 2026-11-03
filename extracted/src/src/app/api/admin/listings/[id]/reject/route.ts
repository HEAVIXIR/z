import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/* POST /api/admin/listings/[id]/reject
   Body: { reason, reasonLabel?, adminNote? }
   Creates a ListingRejection record and sets listing status to REJECTED.
*/
export async function POST(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = String(body.reason ?? "").trim();
    const adminNote = String(body.adminNote ?? "").trim();

    if (!reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    const listing = await db.listing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const rejection = await db.listingRejection.create({
      data: {
        listingId: id,
        reason,
        reasonLabel: body.reasonLabel ?? null,
        adminNote,
        status: "OPEN",
      },
    });

    await db.listing.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    // Notify seller if registered
    if (listing.sellerId) {
      await db.notification.create({
        data: {
          userId: listing.sellerId,
          type: "LISTING_REJECTED",
          title: "آگهی شما رد شد",
          body: `آگهی «${listing.title}» توسط مدیریت رد شد. دلیل: ${reason}`,
          link: `/listings/${listing.slug}`,
        },
      });
    }

    return NextResponse.json({ ok: true, rejection });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
