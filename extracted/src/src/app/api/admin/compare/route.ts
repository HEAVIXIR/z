import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { listSessionsForAdmin } from "@/lib/compare-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/admin/compare — admin overview of comparison engine.
   Returns:
     {
       sessions: [ { id, name, status, userId, shareToken, createdAt,
                     updatedAt, aiSummary, aiSummaryAt, itemCount } ],
       attributes: [ { id, key, name, nameEn, labelFa, type, unit, sortOrder } ],
       visibleAttributeIds: string[]  // from SiteSettings.compareVisibleAttributeIds
     }
   ============================================================ */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [sessions, attrs, settings] = await Promise.all([
      listSessionsForAdmin({ limit: 200 }),
      db.attributeDefinition.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          key: true,
          name: true,
          nameEn: true,
          labelFa: true,
          labelEn: true,
          type: true,
          unit: true,
          sortOrder: true,
        },
      }),
      db.siteSettings.findUnique({
        where: { id: "main" },
        select: { compareVisibleAttributeIds: true },
      }),
    ]);

    let visibleIds: string[] = [];
    if (settings?.compareVisibleAttributeIds) {
      try {
        const parsed = JSON.parse(settings.compareVisibleAttributeIds);
        if (Array.isArray(parsed)) {
          visibleIds = parsed.filter((x: any) => typeof x === "string");
        }
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({
      sessions,
      attributes: attrs,
      visibleAttributeIds: visibleIds,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ============================================================
   PUT /api/admin/compare — update the visible-attributes list.
   Body: { visibleAttributeIds?: string[] }
   When `visibleAttributeIds` is an empty array, ALL attributes are
   shown (default). When non-empty, ONLY those IDs are shown in the
   public compare table.
   ============================================================ */
export async function PUT(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    let ids: string[] = [];
    if (Array.isArray(body.visibleAttributeIds)) {
      ids = body.visibleAttributeIds
        .filter((x: any) => typeof x === "string")
        .slice(0, 500);
    }

    const json = JSON.stringify(ids);
    await db.siteSettings.upsert({
      where: { id: "main" },
      create: {
        id: "main",
        compareVisibleAttributeIds: json,
      },
      update: {
        compareVisibleAttributeIds: json,
      },
    });

    return NextResponse.json({ ok: true, visibleAttributeIds: ids });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
