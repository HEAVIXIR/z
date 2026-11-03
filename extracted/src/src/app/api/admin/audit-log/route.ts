import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/audit-log — admin audit log reader.

   GET (admin only):
     ?actorId=       filter by actorId
     ?action=        filter by action (contains)
     ?entityType=    filter by entityType
     ?entityId=      filter by entityId (exact)
     ?from=          ISO date — createdAt >=
     ?to=            ISO date — createdAt <=
     ?limit=         page size (1..200, default 50)
     ?offset=        pagination offset

   Returns:
     { success, total, data: [...] }
   Sorted by createdAt DESC.
   ============================================================ */

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function serialize(row: any) {
  return {
    id: row.id,
    actorId: row.actorId,
    actorType: row.actorType,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    beforeJson: row.beforeJson,
    afterJson: row.afterJson,
    ip: row.ip,
    userAgent: row.userAgent,
    requestId: row.requestId,
    reason: row.reason,
    createdAt: row.createdAt,
    // optional joined actor label
    actorLabel: row.actorLabel ?? null,
  };
}

async function authorizeAdmin(): Promise<boolean> {
  // Legacy admin-cookie path
  if (await isAuthenticated()) return true;
  // User-session path — needs ADMIN role
  const user = await getCurrentUser();
  if (!user) return false;
  return isAdmin(user.id);
}

export async function GET(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const sp = url.searchParams;

    const actorId = (sp.get("actorId") ?? "").trim();
    const action = (sp.get("action") ?? "").trim();
    const entityType = (sp.get("entityType") ?? "").trim();
    const entityId = (sp.get("entityId") ?? "").trim();
    const from = parseDate(sp.get("from"));
    const to = parseDate(sp.get("to"));
    const limit = Math.min(200, Math.max(1, Number(sp.get("limit")) || 50));
    const offset = Math.max(0, Number(sp.get("offset")) || 0);

    const where: any = {};
    if (actorId) where.actorId = actorId;
    if (action) where.action = { contains: action };
    if (entityType) where.entityType = { contains: entityType };
    if (entityId) where.entityId = entityId;
    if (from || to) {
      where.createdAt = {} as any;
      if (from) (where.createdAt as any).gte = from;
      if (to) (where.createdAt as any).lte = to;
    }

    const [rows, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    // Best-effort actor label enrichment — batch-fetch user names for any
    // actorId that looks like a User id AND actorType USER.
    const actorIds = Array.from(
      new Set(
        rows
          .filter((r) => r.actorId && r.actorType === "USER")
          .map((r) => r.actorId as string),
      ),
    );
    let actorMap = new Map<string, string>();
    if (actorIds.length > 0) {
      try {
        const users = await db.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        });
        for (const u of users) {
          actorMap.set(u.id, `${u.firstName} ${u.lastName}`.trim() || u.email);
        }
      } catch {
        /* ignore */
      }
    }
    const data = rows.map((r) =>
      serialize({
        ...r,
        actorLabel: r.actorId ? actorMap.get(r.actorId) ?? null : null,
      }),
    );

    return NextResponse.json({ success: true, total, data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
