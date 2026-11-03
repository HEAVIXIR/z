import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { parseBig, parseNumber } from "@/lib/api-helpers";
import { scoreChecklist } from "@/lib/inspection-checklists";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(i: any) {
  return {
    ...i,
    price: i.price ? i.price.toString() : null,
    listing: i.listing
      ? {
          ...i.listing,
          price: i.listing.price ? i.listing.price.toString() : null,
        }
      : null,
    checklist: i.checklist ? JSON.parse(i.checklist) : null,
    photos: i.photos ? JSON.parse(i.photos) : null,
  };
}

/* GET /api/inspections/[id] — get inspection detail. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  // Allow authenticated users OR admins.
  const user = await getCurrentUser();
  const admin = await isAuthenticated();
  if (!user && !admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const inspection = await db.inspection.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            price: true,
            province: true,
            city: true,
            sellerId: true,
            images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
          },
        },
      },
    });
    if (!inspection) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Non-admins may only see their own inspections.
    if (!admin && user) {
      const isOwner = inspection.requestedBy === user.id || inspection.listing?.sellerId === user.id;
      if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    return NextResponse.json({ inspection: serialize(inspection) });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/inspections/[id] — admin/inspector updates the inspection. */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await isAuthenticated();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const body = await req.json().catch(() => ({}));
    const data: any = {};
    if (typeof body.status === "string") data.status = body.status;
    if (body.scheduledDate) data.scheduledDate = new Date(body.scheduledDate);
    if (body.completedAt) data.completedAt = new Date(body.completedAt);
    if (body.inspectorId !== undefined)
      data.inspectorId = body.inspectorId ? String(body.inspectorId) : null;
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes) : null;
    if (body.reportUrl !== undefined)
      data.reportUrl = body.reportUrl ? String(body.reportUrl) : null;
    if (body.photos !== undefined) {
      data.photos = Array.isArray(body.photos)
        ? JSON.stringify(body.photos)
        : body.photos
          ? String(body.photos)
          : null;
    }
    if (body.checklist !== undefined) {
      const checklist = Array.isArray(body.checklist) ? body.checklist : [];
      data.checklist = JSON.stringify(checklist);
      // Auto-compute the score when checklist is provided.
      data.score = scoreChecklist(checklist);
    }
    if (body.score !== undefined) {
      const s = parseNumber(body.score);
      if (s !== null) data.score = s;
    }
    if (body.price !== undefined) {
      data.price = parseBig(body.price);
    }
    // If status moved to COMPLETED, stamp completedAt.
    if (body.status === "COMPLETED" && !data.completedAt) {
      data.completedAt = new Date();
    }
    const updated = await db.inspection.update({
      where: { id },
      data,
      include: { listing: true },
    });
    return NextResponse.json({ inspection: serialize(updated) });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
