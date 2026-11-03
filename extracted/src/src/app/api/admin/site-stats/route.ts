import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import {
  getAllStatsWithValues,
  METRIC_OPTIONS,
  type StatMetric,
} from "@/lib/site-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_METRICS = new Set<string>(METRIC_OPTIONS.map((m) => m.value));

async function requireAuth() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/* GET /api/admin/site-stats — list all SiteStat rows with live computed values. */
export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const stats = await getAllStatsWithValues();
    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/site-stats — create a new SiteStat row. */
export async function POST(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await req.json().catch(() => ({}));
    const key = String(body.key ?? "").trim();
    const labelFa = String(body.labelFa ?? "").trim();
    const metric = String(body.metric ?? "").trim();

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }
    if (!labelFa) {
      return NextResponse.json(
        { error: "labelFa is required" },
        { status: 400 },
      );
    }
    if (!VALID_METRICS.has(metric)) {
      return NextResponse.json(
        { error: `metric must be one of: ${Array.from(VALID_METRICS).join(", ")}` },
        { status: 400 },
      );
    }

    // customValue is required when metric === "custom_value"
    let customValue: string | null = null;
    if (metric === "custom_value") {
      const cv = String(body.customValue ?? "").trim();
      if (!cv) {
        return NextResponse.json(
          { error: "customValue is required when metric=custom_value" },
          { status: 400 },
        );
      }
      customValue = cv;
    } else if (body.customValue !== undefined && body.customValue !== null) {
      customValue = String(body.customValue).trim() || null;
    }

    const created = await db.siteStat.create({
      data: {
        key,
        labelFa,
        labelEn: body.labelEn ? String(body.labelEn).trim() : null,
        metric,
        customValue,
        icon: body.icon ? String(body.icon).trim() : null,
        sortOrder: Number(body.sortOrder) || 0,
        active: body.active !== false,
      },
    });
    return NextResponse.json({ success: true, stat: created });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/admin/site-stats — update a SiteStat row.
   Body: { id, labelFa?, labelEn?, metric?, customValue?, icon?, sortOrder?, active? } */
export async function PATCH(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.labelFa !== undefined) {
      const v = String(body.labelFa).trim();
      if (!v) {
        return NextResponse.json(
          { error: "labelFa cannot be empty" },
          { status: 400 },
        );
      }
      data.labelFa = v;
    }
    if (body.labelEn !== undefined) {
      data.labelEn = body.labelEn === null ? null : String(body.labelEn).trim() || null;
    }
    if (body.metric !== undefined) {
      const m = String(body.metric).trim();
      if (!VALID_METRICS.has(m)) {
        return NextResponse.json(
          { error: `metric must be one of: ${Array.from(VALID_METRICS).join(", ")}` },
          { status: 400 },
        );
      }
      data.metric = m as StatMetric;
      // Clear customValue when switching away from custom_value
      if (m !== "custom_value") data.customValue = null;
    }
    if (body.customValue !== undefined) {
      data.customValue =
        body.customValue === null || body.customValue === ""
          ? null
          : String(body.customValue).trim();
    }
    if (body.icon !== undefined) {
      data.icon = body.icon === null || body.icon === "" ? null : String(body.icon).trim();
    }
    if (body.sortOrder !== undefined) {
      data.sortOrder = Number(body.sortOrder) || 0;
    }
    if (body.active !== undefined) {
      data.active = Boolean(body.active);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "no fields to update" }, { status: 400 });
    }

    const updated = await db.siteStat.update({ where: { id }, data });
    return NextResponse.json({ success: true, stat: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/admin/site-stats?id=... — delete a SiteStat row. */
export async function DELETE(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id query param is required" }, { status: 400 });
    }
    await db.siteStat.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
