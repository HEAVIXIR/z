import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseBig, parseNumber } from "@/lib/api-helpers";

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

const ALLOWED_VEHICLES = new Set(["FLATBED", "LOWBOY", "CONTAINER", "SPECIAL"]);

/* POST /api/transport — request transport (auth required). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const origin = String(body.origin ?? "").trim();
    const destination = String(body.destination ?? "").trim();
    if (!origin || !destination) {
      return NextResponse.json(
        { error: "مبدا و مقصد الزامی است" },
        { status: 400 },
      );
    }
    const vehicleType = body.vehicleType ? String(body.vehicleType) : null;
    if (vehicleType && !ALLOWED_VEHICLES.has(vehicleType)) {
      return NextResponse.json(
        { error: "نوع وسیله نقلیه نامعتبر است" },
        { status: 400 },
      );
    }
    const data: any = {
      origin,
      destination,
      requestedBy: user.id,
      status: "REQUESTED",
    };
    if (body.listingId) data.listingId = String(body.listingId);
    if (body.dealRoomId) data.dealRoomId = String(body.dealRoomId);
    if (body.cargoType) data.cargoType = String(body.cargoType);
    if (body.cargoWeight !== undefined) {
      const w = parseNumber(body.cargoWeight);
      if (w !== null) data.cargoWeight = w;
    }
    if (body.cargoLength !== undefined) {
      const v = parseNumber(body.cargoLength);
      if (v !== null) data.cargoLength = v;
    }
    if (body.cargoWidth !== undefined) {
      const v = parseNumber(body.cargoWidth);
      if (v !== null) data.cargoWidth = v;
    }
    if (body.cargoHeight !== undefined) {
      const v = parseNumber(body.cargoHeight);
      if (v !== null) data.cargoHeight = v;
    }
    if (vehicleType) data.vehicleType = vehicleType;
    if (body.loadingDate) data.loadingDate = new Date(body.loadingDate);
    if (body.deliveryDate) data.deliveryDate = new Date(body.deliveryDate);
    if (body.notes) data.notes = String(body.notes);
    const created = await db.transportRequest.create({
      data,
      include: { listing: true },
    });
    return NextResponse.json({ request: serialize(created) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* GET /api/transport — list current user's transport requests. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const requests = await db.transportRequest.findMany({
      where: { requestedBy: user.id },
      orderBy: { createdAt: "desc" },
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
    return NextResponse.json({
      requests: requests.map(serialize),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
