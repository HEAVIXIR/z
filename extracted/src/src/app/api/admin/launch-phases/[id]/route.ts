import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseNumber } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/* ============================================================
   /api/admin/launch-phases/[id]
   GET    — fetch a single launch phase
   PATCH  — update title/description/targetValue/currentValue/
            startDate/endDate/status/phase (used as sortOrder)
   DELETE — delete phase (admin override; AuditLog)

   NOTE: LaunchPhase has no dedicated `sortOrder` field — the
   `phase` Int field is the natural sort order (1..N), so we
   accept `sortOrder` from the body and map it onto `phase`.
   ============================================================ */

const STATUS_VALUES = new Set(["PENDING", "ACTIVE", "COMPLETED"]);

function parseDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (v instanceof Date) return v;
  return null;
}

export async function GET(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const phase = await db.launchPhase.findUnique({ where: { id } });
    if (!phase) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: phase });
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
    const existing = await db.launchPhase.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: any = {};

    if (typeof body.title === "string" && body.title.trim()) {
      data.title = body.title.trim();
    }
    if ("description" in body) {
      data.description =
        body.description === null || body.description === undefined
          ? null
          : String(body.description);
    }
    if (body.targetValue !== undefined) {
      const tv = parseNumber(body.targetValue);
      if (tv !== null) data.targetValue = Math.max(0, Math.round(tv));
    }
    if (body.currentValue !== undefined) {
      const cv = parseNumber(body.currentValue);
      if (cv !== null) data.currentValue = Math.max(0, Math.round(cv));
    }
    if (typeof body.status === "string" && STATUS_VALUES.has(body.status)) {
      data.status = body.status;
    }
    if (body.startDate !== undefined) {
      const d = parseDate(body.startDate);
      data.startDate = d ?? null;
    }
    if (body.endDate !== undefined) {
      const d = parseDate(body.endDate);
      data.endDate = d ?? null;
    }
    // `sortOrder` from the UI maps onto the `phase` Int field.
    if (body.sortOrder !== undefined) {
      const so = parseNumber(body.sortOrder);
      if (so !== null && so > 0 && so !== existing.phase) {
        const clash = await db.launchPhase.findUnique({
          where: { phase: so },
        });
        if (clash && clash.id !== existing.id) {
          return NextResponse.json(
            { error: "شماره مرحله تکراری است." },
            { status: 400 },
          );
        }
        data.phase = so;
      }
    }

    const updated = await db.launchPhase.update({ where: { id }, data });

    await logAudit({
      actorId: null,
      actorType: "ADMIN",
      action: "launch-phase.update",
      entityType: "LaunchPhase",
      entityId: id,
      before: {
        title: existing.title,
        phase: existing.phase,
        status: existing.status,
        targetValue: existing.targetValue,
      },
      after: {
        title: updated.title,
        phase: updated.phase,
        status: updated.status,
        targetValue: updated.targetValue,
      },
      reason: `به‌روزرسانی مرحلهٔ «${updated.title}»`,
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
    const existing = await db.launchPhase.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.launchPhase.delete({ where: { id } });

    await logAudit({
      actorId: null,
      actorType: "ADMIN",
      action: "launch-phase.delete",
      entityType: "LaunchPhase",
      entityId: id,
      before: {
        title: existing.title,
        phase: existing.phase,
      },
      reason: `حذف مرحلهٔ «${existing.title}»`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
