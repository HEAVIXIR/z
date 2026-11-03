import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/site-settings */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    let s = await db.siteSettings.findUnique({ where: { id: "main" } });
    if (!s) s = await db.siteSettings.create({ data: { id: "main" } });
    // BigInt fields → string for JSON safety
    const safe = {
      ...s,
      sellIn7DaysPrepaymentAmount:
        s.sellIn7DaysPrepaymentAmount != null
          ? s.sellIn7DaysPrepaymentAmount.toString()
          : null,
    };
    return NextResponse.json({ settings: safe });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PUT /api/admin/site-settings  (P0-RBAC: requires settings.manage) */
export async function PUT(req: Request) {
  const adminCookieOk = await isAuthenticated();
  const sessionUser = adminCookieOk ? null : await getCurrentUser();
  if (!adminCookieOk && !sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sessionUser && !(await hasPermission(sessionUser.id, "settings.manage"))) {
    return NextResponse.json(
      { error: "Forbidden: missing permission 'settings.manage'" },
      { status: 403 },
    );
  }
  try {
    const body = await req.json().catch(() => ({}));

    /* String fields (nullable) */
    const stringFields = [
      "about", "phone", "email", "address", "workingHours", "copyright",
      // Brand assets
      "logoUrl", "footerLogoUrl", "logoText",
      "logoPosition", "footerLogoPosition",
      // Tri-brand footer logos
      "footerHeavixLogoUrl", "footerMekanixLogoUrl", "footerAriaLogoUrl",
      // Sell-in-7-Days
      "sellIn7DaysCommissionRate", // handled as number below — kept here for safety
    ];

    /* Boolean fields */
    const boolFields = [
      "newsletterEnabled",
      "showPersianName",
    ];

    /* Number (Int/Float) fields */
    const numFields = [
      "logoHeight",
      "footerLogoHeight",
      "sellIn7DaysCommissionRate",
      "logoAnimationDurationMs",
    ];

    /* BigInt fields */
    const bigIntFields = ["sellIn7DaysPrepaymentAmount"];

    const data: any = {};

    for (const k of stringFields) {
      if (k in body) {
        const v = body[k];
        data[k] = v === undefined ? null : v === "" ? null : String(v);
      }
    }

    for (const k of boolFields) {
      if (k in body) data[k] = Boolean(body[k]);
    }

    for (const k of numFields) {
      if (k in body) {
        const v = body[k];
        if (v === null || v === "" || v === undefined) {
          data[k] = null;
        } else {
          const n = Number(v);
          data[k] = Number.isFinite(n) ? n : null;
        }
      }
    }

    for (const k of bigIntFields) {
      if (k in body) {
        const v = body[k];
        if (v === null || v === "" || v === undefined) {
          data[k] = null;
        } else {
          data[k] = BigInt(String(v).replace(/[^\d-]/g, "") || "0");
        }
      }
    }

    const s = await db.siteSettings.upsert({
      where: { id: "main" },
      create: { id: "main", ...data },
      update: data,
    });
    const safe = {
      ...s,
      sellIn7DaysPrepaymentAmount:
        s.sellIn7DaysPrepaymentAmount != null
          ? s.sellIn7DaysPrepaymentAmount.toString()
          : null,
    };
    return NextResponse.json({ ok: true, settings: safe });
  } catch (err: any) {
    console.error("[site-settings] PUT error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
