import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/wishlist — PUBLIC wishlist endpoints

   GET  ?phone=X               → list partIds in this customer's wishlist
   POST body:                  → add/remove
     { phone, partId, action: "add" | "remove" }
   ============================================================ */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const phone = (url.searchParams.get("phone") || "").trim();
    if (!phone || phone.length < 8) {
      return NextResponse.json({ partIds: [] });
    }

    const customer = await storeDb.customer.findUnique({ where: { phone } });
    if (!customer) {
      return NextResponse.json({ partIds: [] });
    }

    const rows = await storeDb.wishlist.findMany({
      where: { customerId: customer.id },
      select: { partId: true },
    });

    return NextResponse.json({ partIds: rows.map((r) => r.partId) });
  } catch (e: any) {
    console.error("[api/store/wishlist GET] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = String(body.phone || "").trim();
    const partId = String(body.partId || "");
    const action = body.action === "remove" ? "remove" : "add";

    if (!phone || phone.length < 8) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }
    if (!partId) {
      return NextResponse.json({ error: "partId الزامی است" }, { status: 400 });
    }

    const part = await storeDb.part.findUnique({ where: { id: partId } });
    if (!part) {
      return NextResponse.json({ error: "قطعه یافت نشد" }, { status: 404 });
    }

    const customer = await storeDb.customer.upsert({
      where: { phone },
      update: {},
      create: { phone, name: "مشتری", family: "" },
    });

    if (action === "add") {
      try {
        await storeDb.wishlist.create({
          data: { customerId: customer.id, partId },
        });
      } catch {
        // already wishlisted (unique constraint) — ignore
      }
    } else {
      await storeDb.wishlist.deleteMany({
        where: { customerId: customer.id, partId },
      });
    }

    const rows = await storeDb.wishlist.findMany({
      where: { customerId: customer.id },
      select: { partId: true },
    });

    return NextResponse.json({ partIds: rows.map((r) => r.partId) });
  } catch (e: any) {
    console.error("[api/store/wishlist POST] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
