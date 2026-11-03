import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { storeDb } from "@/lib/store-db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/store/currency — HEAVIX USD→TOMAN rate management
   ============================================================ */

function serializeRate(r: any) {
  return {
    ...r,
    rate: r.rate?.toString?.() ?? String(r.rate ?? 0),
    marginPercent: r.marginPercent?.toString?.() ?? String(r.marginPercent ?? 0),
    createdAt: r.createdAt?.toISOString?.() ?? null,
  };
}

function serializeSetting(s: any) {
  return {
    ...s,
    defaultRate: s.defaultRate?.toString?.() ?? String(s.defaultRate ?? 0),
    marginPercent: s.marginPercent?.toString?.() ?? String(s.marginPercent ?? 0),
    lastAutoRate: s.lastAutoRate?.toString?.() ?? null,
    lastAutoFetchAt: s.lastAutoFetchAt?.toISOString?.() ?? null,
    updatedAt: s.updatedAt?.toISOString?.() ?? null,
  };
}

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const limit = Math.min(60, Number(url.searchParams.get("limit")) || 30);

    const [rates, setting] = await Promise.all([
      storeDb.currencyRate.findMany({
        orderBy: { date: "desc" },
        take: limit,
      }),
      storeDb.currencySetting.findUnique({ where: { id: "singleton" } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        rates: rates.map(serializeRate),
        setting: setting ? serializeSetting(setting) : null,
      },
    });
  } catch (e: any) {
    console.error("[store/currency GET] error:", e);
    return NextResponse.json(
      { success: false, error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "update-setting") {
      const { defaultRate, marginPercent, autoUpdateEnabled, autoSource } = body;
      const data: any = {};
      if (defaultRate !== undefined) data.defaultRate = Number(defaultRate) || 0;
      if (marginPercent !== undefined) data.marginPercent = Number(marginPercent) || 0;
      if (autoUpdateEnabled !== undefined) data.autoUpdateEnabled = !!autoUpdateEnabled;
      if (autoSource !== undefined) data.autoSource = autoSource;
      const s = await storeDb.currencySetting.upsert({
        where: { id: "singleton" },
        update: data,
        create: {
          id: "singleton",
          defaultRate: Number(defaultRate) || 230000,
          marginPercent: Number(marginPercent) || 3,
          autoUpdateEnabled: !!autoUpdateEnabled,
          autoSource: autoSource || "telegram",
        },
      });
      return NextResponse.json({ success: true, data: serializeSetting(s) });
    }

    if (action === "add-rate") {
      const { date, rate, marginPercent, source, note } = body;
      if (!date || rate === undefined) {
        return NextResponse.json({ success: false, error: "تاریخ و نرخ الزامی است" }, { status: 400 });
      }
      const r = await storeDb.currencyRate.upsert({
        where: { date },
        update: {
          rate: Number(rate),
          marginPercent: Number(marginPercent) || 0,
          source: source || "MANUAL",
          note: note || null,
        },
        create: {
          date,
          rate: Number(rate),
          marginPercent: Number(marginPercent) || 0,
          source: source || "MANUAL",
          note: note || null,
        },
      });
      return NextResponse.json({ success: true, data: serializeRate(r) });
    }

    return NextResponse.json({ success: false, error: "action نامعتبر" }, { status: 400 });
  } catch (e: any) {
    console.error("[store/currency POST] error:", e);
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
