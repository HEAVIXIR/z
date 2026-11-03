import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseBool, parseNumber } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/* ============================================================
   /api/admin/feature-flags/[id]
   GET    — fetch a single flag
   PATCH  — update key/label/description/enabled/rolloutPct
   DELETE — delete flag (admin override; AuditLog)
   ============================================================ */

export async function GET(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const flag = await db.featureFlag.findUnique({ where: { id } });
    if (!flag) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: flag });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const existing = await db.featureFlag.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: any = {};

    if (typeof body.key === "string" && body.key.trim()) {
      const newKey = body.key.trim();
      if (newKey !== existing.key) {
        const clash = await db.featureFlag.findUnique({ where: { key: newKey } });
        if (clash) {
          return NextResponse.json(
            { error: "کلید پرچم تکراری است." },
            { status: 400 },
          );
        }
        data.key = newKey;
      }
    }
    if (typeof body.label === "string") {
      data.label = body.label.trim() || existing.label;
    }
    if ("description" in body) {
      data.description =
        body.description === null || body.description === undefined
          ? null
          : String(body.description);
    }
    if ("enabled" in body) {
      data.enabled = parseBool(body.enabled);
    }
    if ("rolloutPct" in body) {
      const r = parseNumber(body.rolloutPct);
      data.rolloutPct =
        r === null ? 100 : Math.max(0, Math.min(100, Math.round(r)));
    }

    const updated = await db.featureFlag.update({ where: { id }, data });

    await logAudit({
      actorId: null,
      actorType: "ADMIN",
      action: "feature-flag.update",
      entityType: "FeatureFlag",
      entityId: id,
      before: {
        key: existing.key,
        label: existing.label,
        enabled: existing.enabled,
        rolloutPct: existing.rolloutPct,
      },
      after: {
        key: updated.key,
        label: updated.label,
        enabled: updated.enabled,
        rolloutPct: updated.rolloutPct,
      },
      reason: `به‌روزرسانی پرچم «${updated.key}»`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.featureFlag.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.featureFlag.delete({ where: { id } });

    await logAudit({
      actorId: null,
      actorType: "ADMIN",
      action: "feature-flag.delete",
      entityType: "FeatureFlag",
      entityId: id,
      before: {
        key: existing.key,
        label: existing.label,
      },
      reason: `حذف پرچم «${existing.key}»`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
