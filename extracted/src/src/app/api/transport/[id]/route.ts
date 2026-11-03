import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { parseBig } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(t: any) {
  return {
    ...t,
    quotedPrice: t.quotedPrice ? t.quotedPrice.toString() : null,
    listing: t.listing
      ? {
          ...t.listing,
          price: t.listing.price ? t.listing.price.toString() : null,
        }
      : null,
  };
}

/* GET /api/transport/[id] — get detail. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const admin = await isAuthenticated();
  if (!user && !admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const t = await db.transportRequest.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            price: true,
            images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
          },
        },
      },
    });
    if (!t) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!admin && user && t.requestedBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ request: serialize(t) });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/transport/[id] — admin updates (quote, carrier, status). */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await isAuthenticated();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const body = await req.json().catch(() => ({}));
    const data: any = {};
    if (typeof body.status === "string") data.status = body.status;
    if (body.quotedPrice !== undefined) {
      data.quotedPrice = parseBig(body.quotedPrice);
    }
    if (body.carrierName !== undefined)
      data.carrierName = body.carrierName ? String(body.carrierName) : null;
    if (body.carrierPhone !== undefined)
      data.carrierPhone = body.carrierPhone ? String(body.carrierPhone) : null;
    if (body.trackingCode !== undefined)
      data.trackingCode = body.trackingCode ? String(body.trackingCode) : null;
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes) : null;
    if (body.loadingDate) data.loadingDate = new Date(body.loadingDate);
    if (body.deliveryDate) data.deliveryDate = new Date(body.deliveryDate);
    const updated = await db.transportRequest.update({
      where: { id },
      data,
      include: { listing: true },
    });
    return NextResponse.json({ request: serialize(updated) });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
