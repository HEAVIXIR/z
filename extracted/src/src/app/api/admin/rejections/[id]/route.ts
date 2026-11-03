import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

const ALLOWED_STATUSES = ["OPEN", "RESOLVED", "IGNORED", "REOPENED", "PENDING"];
const ALLOWED_REASONS = [
  "NO_IMAGE",
  "NO_PRICE",
  "NO_BRAND",
  "NO_CATEGORY",
  "NO_DESCRIPTION",
  "INCOMPLETE",
  "INAPPROPRIATE",
  "DUPLICATE",
  "OTHER",
];

function serialize(r: any) {
  return {
    ...r,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
    messages: (r.messages ?? []).map((m: any) => ({
      ...m,
      createdAt: m.createdAt ? m.createdAt.toISOString() : null,
    })),
  };
}

/* GET /api/admin/rejections/[id] */
export async function GET(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const rejection = await db.listingRejection.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            sellerName: true,
            sellerPhone: true,
            status: true,
          },
        },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!rejection) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: serialize(rejection) });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/admin/rejections/[id]
   Editable: reason, reasonLabel, adminNote, status (OPEN | RESOLVED | IGNORED | REOPENED | PENDING).
*/
export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = await db.listingRejection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const data: any = {};

    if (body.reason !== undefined) {
      const reason = String(body.reason).trim();
      if (!reason) {
        return NextResponse.json({ success: false, error: "reason cannot be empty" }, { status: 400 });
      }
      // Allow free-form reason but validate against the standard set when it matches.
      data.reason = ALLOWED_REASONS.includes(reason.toUpperCase()) ? reason.toUpperCase() : reason;
    }
    if (body.reasonLabel !== undefined) {
      data.reasonLabel = body.reasonLabel === null || body.reasonLabel === "" ? null : String(body.reasonLabel);
    }
    if (body.adminNote !== undefined) {
      data.adminNote = body.adminNote === null || body.adminNote === "" ? "" : String(body.adminNote);
    }
    if (body.status !== undefined) {
      const status = String(body.status).trim().toUpperCase();
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: `status must be one of ${ALLOWED_STATUSES.join(", ")}` },
          { status: 400 },
        );
      }
      data.status = status;
    }

    const updated = await db.listingRejection.update({
      where: { id },
      data,
      include: {
        listing: { select: { id: true, title: true, slug: true } },
      },
    });

    try {
      await logAudit({
        actorType: "ADMIN",
        action: "rejection.update",
        entityType: "ListingRejection",
        entityId: id,
        before: serialize({ ...existing, messages: [] }),
        after: serialize({ ...updated, messages: [] }),
        reason: `ویرایش رد آگهی${data.status ? ` / تغییر وضعیت به ${data.status}` : ""}`,
      });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      success: true,
      data: serialize({ ...updated, messages: [] }),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/admin/rejections/[id]
   RejectionMessage has onDelete: Cascade → messages removed automatically.
*/
export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.listingRejection.findUnique({
      where: { id },
      include: { _count: { select: { messages: true } } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    await db.listingRejection.delete({ where: { id } });

    try {
      await logAudit({
        actorType: "ADMIN",
        action: "rejection.delete",
        entityType: "ListingRejection",
        entityId: id,
        before: serialize({ ...existing, messages: [] }),
        reason: `حذف رکورد رد آگهی و ${existing._count.messages} پیام مرتبط`,
      });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
