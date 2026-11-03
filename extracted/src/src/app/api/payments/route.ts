import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/payments
   --------------------------------
   Auth-required. Lists the current user's payments, newest first.
   Supports `?take=` (default 50, max 200) and `?status=` filter. */
export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") ?? 50)));
    const status = url.searchParams.get("status");

    const where: any = { userId };
    if (status) where.status = String(status).toUpperCase();

    const [items, total] = await Promise.all([
      db.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
      }),
      db.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments: items.map((p) => ({
        ...p,
        amount: p.amount.toString(),
      })),
      total,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
