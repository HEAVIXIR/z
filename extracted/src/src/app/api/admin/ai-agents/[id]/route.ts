import { NextResponse } from "next/server";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/* ============================================================
   /api/admin/ai-agents/[id]
   GET    — fetch a single agent
   PATCH  — update nameFa / nameEn / description / taskType /
            active / configJson
   DELETE — delete agent (admin override; allowed even for
            seeded built-in agents). AuditLog.

   NOTE: AIAgent has no `sortOrder` column — the registry order
   is `createdAt` ASC. We expose no sortOrder in PATCH.
   ============================================================ */

async function authorizeAdmin(): Promise<boolean> {
  if (await isAuthenticated()) return true;
  const user = await getCurrentUser();
  if (!user) return false;
  return isAdmin(user.id);
}

export async function GET(_req: Request, { params }: Params) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const agent = await db.aIAgent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: agent });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: Params) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const existing = await db.aIAgent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: any = {};

    if (typeof body.nameFa === "string" && body.nameFa.trim()) {
      data.nameFa = body.nameFa.trim();
    }
    if ("nameEn" in body) {
      data.nameEn =
        typeof body.nameEn === "string" && body.nameEn.trim()
          ? body.nameEn.trim()
          : null;
    }
    if ("description" in body) {
      data.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
    }
    if (typeof body.taskType === "string" && body.taskType.trim()) {
      data.taskType = body.taskType.trim();
    }
    if ("active" in body) {
      data.active = Boolean(body.active);
    }
    if ("configJson" in body) {
      if (body.configJson === null || body.configJson === undefined) {
        data.config = null;
      } else if (typeof body.configJson === "string") {
        data.config = body.configJson.trim() || null;
      } else {
        try {
          data.config = JSON.stringify(body.configJson);
        } catch {
          data.config = null;
        }
      }
    }

    const updated = await db.aIAgent.update({ where: { id }, data });

    await logAudit({
      actorId: null,
      actorType: "ADMIN",
      action: "ai.agent.update",
      entityType: "AIAgent",
      entityId: id,
      before: {
        key: existing.key,
        nameFa: existing.nameFa,
        taskType: existing.taskType,
        active: existing.active,
      },
      after: {
        key: updated.key,
        nameFa: updated.nameFa,
        taskType: updated.taskType,
        active: updated.active,
      },
      reason: `به‌روزرسانی ایجنت «${updated.nameFa}»`,
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
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.aIAgent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.aIAgent.delete({ where: { id } });

    await logAudit({
      actorId: null,
      actorType: "ADMIN",
      action: "ai.agent.delete",
      entityType: "AIAgent",
      entityId: id,
      before: {
        key: existing.key,
        nameFa: existing.nameFa,
        taskType: existing.taskType,
      },
      reason: `حذف ایجنت «${existing.nameFa}»`,
    });

    // NOTE: built-in agents are re-seeded by ensureBuiltInAgents()
    // on the next listAgents() call. This is by design — the
    // registry file is the source of truth for built-in agents.
    // Custom (non-built-in) agents stay deleted permanently.

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
