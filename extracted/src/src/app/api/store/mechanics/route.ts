import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/mechanics — PUBLIC list of verified/active mechanics
   The marketplace shows these in the MechanicsDialog and the
   CheckoutDialog mechanic picker.
   ============================================================ */

export async function GET() {
  try {
    const items = await storeDb.mechanic.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ verified: "desc" }, { rating: "desc" }, { totalOrders: "desc" }],
      include: { _count: { select: { orders: true } } },
    });

    const mechanics = items.map((m) => ({
      id: m.id,
      name: m.name,
      family: m.family,
      shopName: m.shopName,
      specialty: m.specialty,
      city: m.city,
      address: m.address,
      phone: m.phone,
      rating: m.rating,
      verified: m.verified,
      totalOrders: m.totalOrders || m._count?.orders || 0,
    }));

    return NextResponse.json({ mechanics });
  } catch (e: any) {
    console.error("[api/store/mechanics GET] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
