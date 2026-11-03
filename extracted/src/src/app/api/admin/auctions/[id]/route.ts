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

const ALLOWED_STATUSES = ["SCHEDULED", "LIVE", "ENDED", "CANCELLED"];

function serialize(a: any) {
  return {
    ...a,
    startPrice: a.startPrice ? a.startPrice.toString() : null,
    reservePrice: a.reservePrice ? a.reservePrice.toString() : null,
    minIncrement: a.minIncrement ? a.minIncrement.toString() : null,
    winningBid: a.winningBid ? a.winningBid.toString() : null,
    listing: a.listing
      ? { ...a.listing, price: a.listing.price ? a.listing.price.toString() : null }
      : a.listing,
  };
}

/* GET /api/admin/auctions/[id] */
export async function GET(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const auction = await db.auction.findUnique({
      where: { id },
      include: {
        listing: {
          select: { id: true, title: true, slug: true, price: true, status: true },
        },
        bids: {
          orderBy: { amount: "desc" },
          take: 1,
        },
        _count: { select: { bids: true } },
      },
    });
    if (!auction) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    const topBid = auction.bids[0] ?? null;
    return NextResponse.json({
      success: true,
      data: {
        ...serialize({
          ...auction,
          bids: undefined,
          _count: undefined,
        }),
        bidCount: auction._count.bids,
        topBid: topBid
          ? {
              id: topBid.id,
              amount: topBid.amount.toString(),
              bidderName: topBid.bidderName,
              createdAt: topBid.createdAt,
            }
          : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/admin/auctions/[id]
   Editable fields: startPrice, reservePrice, minIncrement, startDate, endDate,
   status, featured (optional — currently no featured field on Auction, but we accept & ignore),
   title, description, adminNotes.
   Status transitions: SCHEDULED | LIVE | ENDED | CANCELLED.
*/
export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = await db.auction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const data: any = {};

    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (!t) {
        return NextResponse.json({ success: false, error: "title cannot be empty" }, { status: 400 });
      }
      data.title = t;
    }
    if (body.description !== undefined) {
      data.description = body.description === null || body.description === "" ? null : String(body.description);
    }
    if (body.startPrice !== undefined) {
      const v = parseBig(body.startPrice);
      if (v === null) {
        return NextResponse.json({ success: false, error: "invalid startPrice" }, { status: 400 });
      }
      data.startPrice = v;
    }
    if (body.reservePrice !== undefined) {
      data.reservePrice = parseBig(body.reservePrice);
    }
    if (body.minIncrement !== undefined) {
      const v = parseBig(body.minIncrement);
      if (v === null) {
        return NextResponse.json({ success: false, error: "invalid minIncrement" }, { status: 400 });
      }
      data.minIncrement = v;
    }
    if (body.startDate !== undefined) {
      const d = body.startDate === null ? null : new Date(body.startDate);
      if (d && isNaN(d.getTime())) {
        return NextResponse.json({ success: false, error: "invalid startDate" }, { status: 400 });
      }
      data.startDate = d;
    }
    if (body.endDate !== undefined) {
      const d = body.endDate === null ? null : new Date(body.endDate);
      if (d && isNaN(d.getTime())) {
        return NextResponse.json({ success: false, error: "invalid endDate" }, { status: 400 });
      }
      data.endDate = d;
    }
    if (body.adminNotes !== undefined) {
      data.adminNotes = body.adminNotes === null || body.adminNotes === "" ? null : String(body.adminNotes);
    }
    if (body.status !== undefined) {
      const status = String(body.status).trim().toUpperCase();
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: `status must be one of ${ALLOWED_STATUSES.join(", ")}` },
          { status: 400 },
        );
      }
      data.status = status;
      // Admin force-end: set winner from current top bid if available
      if (status === "ENDED" && !existing.winnerId) {
        try {
          const top = await db.auctionBid.findFirst({
            where: { auctionId: id },
            orderBy: { amount: "desc" },
          });
          if (top) {
            data.winnerId = top.bidderId ?? null;
            data.winnerName = top.bidderName;
            data.winningBid = top.amount;
            try {
              await db.auctionBid.update({
                where: { id: top.id },
                data: { isWinning: true },
              });
            } catch {
              /* non-fatal */
            }
          }
        } catch {
          /* non-fatal */
        }
      }
    }

    // Date sanity check
    const finalStart = data.startDate ?? existing.startDate;
    const finalEnd = data.endDate ?? existing.endDate;
    if (finalStart && finalEnd && finalEnd <= finalStart) {
      return NextResponse.json(
        { success: false, error: "endDate must be after startDate" },
        { status: 400 },
      );
    }

    const updated = await db.auction.update({
      where: { id },
      data,
      include: {
        listing: { select: { id: true, title: true, slug: true, price: true } },
        _count: { select: { bids: true } },
      },
    });

    try {
      await logAudit({
        actorType: "ADMIN",
        action: "auction.update",
        entityType: "Auction",
        entityId: id,
        before: serialize(existing),
        after: serialize(updated),
        reason: `ویرایش مزایده${data.status ? ` / تغییر وضعیت به ${data.status}` : ""}`,
      });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      success: true,
      data: {
        ...serialize({
          ...updated,
          _count: undefined,
        }),
        bidCount: updated._count.bids,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/admin/auctions/[id]
   Note: AuctionBid has onDelete: Cascade, so bids will be removed automatically.
*/
export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.auction.findUnique({
      where: { id },
      include: { _count: { select: { bids: true } } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    await db.auction.delete({ where: { id } });

    try {
      await logAudit({
        actorType: "ADMIN",
        action: "auction.delete",
        entityType: "Auction",
        entityId: id,
        before: serialize({ ...existing, _count: undefined }),
        reason: `حذف مزایده و ${existing._count.bids} پیشنهاد مرتبط`,
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
