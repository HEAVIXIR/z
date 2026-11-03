import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseBig, parseNumber } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

const ALLOWED_STATUSES = ["OPEN", "QUOTING", "AWARDED", "CLOSED", "CANCELLED"];

function serialize(r: any) {
  return {
    ...r,
    budgetMin: r.budgetMin ? r.budgetMin.toString() : null,
    budgetMax: r.budgetMax ? r.budgetMax.toString() : null,
    deadline: r.deadline ? r.deadline.toISOString() : null,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
    _count: undefined,
  };
}

/* GET /api/admin/rfq/[id] */
export async function GET(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const rfq = await db.rFQ.findUnique({
      where: { id },
      include: {
        buyer: {
          select: { id: true, firstName: true, lastName: true, mobile: true, email: true },
        },
        _count: { select: { quotes: true } },
      },
    });
    if (!rfq) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: { ...serialize(rfq), quoteCount: rfq._count.quotes },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/admin/rfq/[id]
   Editable: title, description, machineType, brandPref, quantity, budgetMin,
   budgetMax, location, deadline, status, adminNotes.
*/
export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = await db.rFQ.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const data: any = {};

    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (!t) {
        return NextResponse.json({ success: false, error: "title cannot be empty" }, { status: 400 });
      }
      data.title = t;
    }
    if (body.description !== undefined) {
      data.description = body.description === null || body.description === "" ? null : String(body.description);
    }
    if (body.machineType !== undefined) {
      data.machineType = body.machineType === null || body.machineType === "" ? null : String(body.machineType);
    }
    if (body.brandPref !== undefined) {
      data.brandPref = body.brandPref === null || body.brandPref === "" ? null : String(body.brandPref);
    }
    if (body.quantity !== undefined) {
      const q = parseNumber(body.quantity);
      if (q === null || q < 1) {
        return NextResponse.json({ success: false, error: "invalid quantity" }, { status: 400 });
      }
      data.quantity = q;
    }
    if (body.budgetMin !== undefined) {
      data.budgetMin = parseBig(body.budgetMin);
    }
    if (body.budgetMax !== undefined) {
      data.budgetMax = parseBig(body.budgetMax);
    }
    if (body.location !== undefined) {
      data.location = body.location === null || body.location === "" ? null : String(body.location);
    }
    if (body.deadline !== undefined) {
      const d = body.deadline === null || body.deadline === "" ? null : new Date(body.deadline);
      if (d && isNaN(d.getTime())) {
        return NextResponse.json({ success: false, error: "invalid deadline" }, { status: 400 });
      }
      data.deadline = d;
    }
    if (body.adminNotes !== undefined) {
      data.adminNotes = body.adminNotes === null || body.adminNotes === "" ? null : String(body.adminNotes);
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

    const updated = await db.rFQ.update({
      where: { id },
      data,
      include: { _count: { select: { quotes: true } } },
    });

    try {
      await logAudit({
        actorType: "ADMIN",
        action: "rfq.update",
        entityType: "RFQ",
        entityId: id,
        before: serialize(existing),
        after: serialize(updated),
        reason: `ویرایش RFQ${data.status ? ` / تغییر وضعیت به ${data.status}` : ""}`,
      });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      success: true,
      data: { ...serialize(updated), quoteCount: updated._count.quotes },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/admin/rfq/[id] — RFQQuote has onDelete: Cascade. */
export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.rFQ.findUnique({
      where: { id },
      include: { _count: { select: { quotes: true } } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    await db.rFQ.delete({ where: { id } });

    try {
      await logAudit({
        actorType: "ADMIN",
        action: "rfq.delete",
        entityType: "RFQ",
        entityId: id,
        before: serialize({ ...existing, _count: undefined }),
        reason: `حذف RFQ و ${existing._count.quotes} پیشنهاد مرتبط`,
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
