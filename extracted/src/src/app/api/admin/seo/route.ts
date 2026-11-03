import { NextResponse } from "next/server";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import {
  getSEO,
  upsertSEO,
  fetchEntity,
  searchEntities,
  generateMetaTitle,
  generateMetaDescription,
  generateStructuredData,
  SEO_ENTITY_TYPES,
} from "@/lib/seo";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/seo — SEO metadata CRUD (P2-28)
   ------------------------------------------------------------
   GET  ?entityType=&entityId=            — get SEO for an entity
       ?search=&entityType=               — search entities for picker
   PUT  { entityType, entityId, ...seo }  — upsert SEO (admin only)
   ============================================================ */

async function authorizeAdmin(): Promise<boolean> {
  if (await isAuthenticated()) return true;
  const user = await getCurrentUser();
  if (!user) return false;
  return isAdmin(user.id);
}

function isValidEntityType(t: string): boolean {
  return (SEO_ENTITY_TYPES as readonly string[]).includes(t);
}

export async function GET(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const entityType = url.searchParams.get("entityType")?.trim() || "";
    const entityId = url.searchParams.get("entityId")?.trim() || "";
    const searchQ = url.searchParams.get("search")?.trim() || "";

    if (!isValidEntityType(entityType)) {
      return NextResponse.json(
        { error: "entityType نامعتبر است." },
        { status: 400 },
      );
    }

    // Entity search mode (for the admin picker).
    if (searchQ) {
      const results = await searchEntities(entityType, searchQ);
      return NextResponse.json({ ok: true, results });
    }

    if (!entityId) {
      return NextResponse.json(
        { error: "entityId الزامی است." },
        { status: 400 },
      );
    }

    const [seo, entity] = await Promise.all([
      getSEO(entityType, entityId),
      fetchEntity(entityType, entityId),
    ]);

    // Provide auto-generated defaults so the admin UI can offer
    // a "تولید خودکار" button even when no SEO row exists yet.
    const generated = entity
      ? {
          metaTitle: generateMetaTitle(entityType, entity),
          metaDescription: generateMetaDescription(entityType, entity),
          structuredData: generateStructuredData(entityType, entity),
        }
      : null;

    return NextResponse.json({
      ok: true,
      seo,
      entity: entity
        ? {
            id: entity.id,
            name:
              entity.name ??
              entity.title ??
              entity.canonicalName ??
              entity.slug ??
              entityId,
            slug: entity.slug ?? null,
          }
        : null,
      generated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => null);
    if (
      !body ||
      typeof body.entityType !== "string" ||
      typeof body.entityId !== "string"
    ) {
      return NextResponse.json(
        { error: "entityType و entityId الزامی هستند." },
        { status: 400 },
      );
    }
    if (!isValidEntityType(body.entityType)) {
      return NextResponse.json(
        { error: "entityType نامعتبر است." },
        { status: 400 },
      );
    }

    // Extract only the SEO fields from the body — ignore anything else.
    const fields: Record<string, unknown> = {};
    for (const k of [
      "metaTitle",
      "metaDescription",
      "keywords",
      "canonicalUrl",
      "ogImage",
      "ogTitle",
      "ogDescription",
      "structuredData",
      "robotsIndex",
      "robotsFollow",
      "sitemapPriority",
      "sitemapChangeFreq",
    ]) {
      if (k in body) fields[k] = body[k];
    }

    const seo = await upsertSEO(body.entityType, body.entityId, fields as any);

    await logAudit({
      actorId: null,
      actorType: "ADMIN",
      action: "seo.upsert",
      entityType: "SEOMetadata",
      entityId: seo.id,
      after: { entityType: body.entityType, entityId: body.entityId, fields },
      reason: `به‌روزرسانی SEO برای ${body.entityType} #${body.entityId}`,
    });

    return NextResponse.json({ ok: true, seo });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
