import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/wanted — list active wanted requests (public).
   ?status=ACTIVE (default) | ?mine=true (user's own requests) */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mine = url.searchParams.get("mine") === "true";
    const status = url.searchParams.get("status")?.trim() || "ACTIVE";
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));

    const where: any = {};
    if (mine) {
      const userId = await getCurrentUserId();
      if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      where.userId = userId;
    } else {
      where.status = status;
    }

    const requests = await db.buyRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        brandPref: true,
        transaction: true,
        budgetMin: true,
        budgetMax: true,
        city: true,
        province: true,
        deadline: true,
        status: true,
        verified: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ requests: requests.map(r => ({
      ...r,
      budgetMin: r.budgetMin ? r.budgetMin.toString() : null,
      budgetMax: r.budgetMax ? r.budgetMax.toString() : null,
    })) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* POST /api/wanted — create a new wanted request.
   Body: { title, description, category, brandPref?, transaction?, budgetMin?, budgetMax?, city?, province?, deadline? } */
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "برای ثبت درخواست ابتدا وارد شوید" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, description, category, brandPref, transaction, budgetMin, budgetMax, city, province, deadline } = body;

    if (!title || !category) {
      return NextResponse.json({ error: "title و category الزامی است" }, { status: 400 });
    }

    const request = await db.buyRequest.create({
      data: {
        title: String(title).slice(0, 200),
        description: description ? String(description).slice(0, 2000) : null,
        category: String(category),
        brandPref: brandPref ? String(brandPref) : null,
        transaction: transaction || "SALE",
        budgetMin: budgetMin ? BigInt(String(budgetMin).replace(/[^\d]/g, "")) : null,
        budgetMax: budgetMax ? BigInt(String(budgetMax).replace(/[^\d]/g, "")) : null,
        city: city ? String(city) : null,
        province: province ? String(province) : null,
        deadline: deadline ? String(deadline) : null,
        status: "ACTIVE",
        verified: false,
        userId: userId,
        buyerName: "کاربر هویکس",
        buyerPhone: "0000000000",
      },
    });

    await logAudit({
      actorId: userId,
      actorType: "USER",
      action: "wanted.create",
      entityType: "BuyRequest",
      entityId: request.id,
      after: { title, category, status: "ACTIVE" },
      ip: getClientIp(req),
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: request.id, status: request.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
