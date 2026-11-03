import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";
import { getEffectiveRate } from "@/lib/store-currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/currency — PUBLIC today's effective rate + setting
   ============================================================ */

export async function GET() {
  try {
    const eff = await getEffectiveRate();
    const setting = await storeDb.currencySetting.findUnique({ where: { id: "singleton" } });

    const currency = {
      rate: eff.rate,
      marginPercent: eff.marginPercent,
      source: eff.source,
      date: eff.date,
      lastAutoRate: setting?.lastAutoRate ?? null,
      lastAutoStatus: setting?.lastAutoStatus ?? null,
      lastAutoFetchAt: setting?.lastAutoFetchAt?.toISOString?.() ?? null,
      autoUpdateEnabled: setting?.autoUpdateEnabled ?? false,
      autoSource: setting?.autoSource ?? null,
      defaultRate: setting?.defaultRate ?? null,
    };

    return NextResponse.json(currency);
  } catch (e: any) {
    console.error("[api/store/currency GET] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
