import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { slugify } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAuth() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/* ============================================================
   GET /api/admin/services — list ALL services (incl. inactive)
   for the admin table. Auth required.
   ============================================================ */
export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const services = await db.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
    });
    return NextResponse.json({ services });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ============================================================
   POST /api/admin/services — create a new service. Auth required.
   Body: { key, nameFa, nameEn?, description?, icon?, imageUrl?,
           sortOrder?, active?, featured? }
   ============================================================ */
export async function POST(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body?.nameFa) {
      return NextResponse.json(
        { error: "nameFa is required" },
        { status: 400 },
      );
    }
    const key =
      typeof body.key === "string" && body.key.trim()
        ? slugify(body.key)
        : slugify(body.nameFa) || `service-${Date.now()}`;

    // Ensure key uniqueness
    let finalKey = key;
    let i = 1;
    while (await db.service.findUnique({ where: { key: finalKey } })) {
      finalKey = `${key}-${i++}`;
    }

    const service = await db.service.create({
      data: {
        key: finalKey,
        nameFa: String(body.nameFa),
        nameEn: body.nameEn ? String(body.nameEn) : null,
        description: body.description ? String(body.description) : null,
        icon: body.icon ? String(body.icon) : null,
        imageUrl: body.imageUrl ? String(body.imageUrl) : null,
        sortOrder:
          typeof body.sortOrder === "number" ? body.sortOrder : Number(body.sortOrder) || 0,
        active: body.active !== false,
        featured: !!body.featured,
      },
    });
    return NextResponse.json({ ok: true, service });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ============================================================
   PATCH /api/admin/services — update an existing service OR
   reorder (swap sortOrder between two services).
   Body (update):  { id, nameFa?, nameEn?, description?, icon?,
                     imageUrl?, sortOrder?, active?, featured? }
   Body (reorder): { id, newSortOrder }   // sets sortOrder directly
   ============================================================ */
export async function PATCH(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : null;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const existing = await db.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: any = {};
    const allowed = [
      "nameFa", "nameEn", "description", "icon", "imageUrl",
      "sortOrder", "active", "featured",
    ];
    for (const k of allowed) {
      if (k in body) {
        if (k === "active" || k === "featured") data[k] = Boolean(body[k]);
        else if (k === "sortOrder") data[k] = Number(body[k]) || 0;
        else data[k] = body[k] === undefined ? null : body[k];
      }
    }

    // Allow key change (must remain unique)
    if (typeof body.key === "string" && body.key.trim() && body.key !== existing.key) {
      const candidate = slugify(body.key);
      const conflict = await db.service.findUnique({ where: { key: candidate } });
      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          { error: "key تکراری است" },
          { status: 400 },
        );
      }
      data.key = candidate;
    }

    const service = await db.service.update({ where: { id }, data });
    return NextResponse.json({ ok: true, service });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
