import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/wanted/[id] — get a single wanted request. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const request = await db.buyRequest.findUnique({
      where: { id },
      select: {
        id: true, title: true, description: true, category: true, brandPref: true,
        transaction: true, budgetMin: true, budgetMax: true, city: true, province: true,
        deadline: true, status: true, verified: true, createdAt: true, userId: true,
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      request: {
        ...request,
        budgetMin: request.budgetMin ? request.budgetMin.toString() : null,
        budgetMax: request.budgetMax ? request.budgetMax.toString() : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* PATCH /api/wanted/[id] — update own request (only if ACTIVE). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await db.buyRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (existing.status !== "ACTIVE") return NextResponse.json({ error: "Only ACTIVE requests can be edited" }, { status: 409 });

    const body = await req.json().catch(() => ({}));
    const updateData: any = {};
    if (body.title) updateData.title = String(body.title).slice(0, 200);
    if (body.description !== undefined) updateData.description = body.description ? String(body.description).slice(0, 2000) : null;
    if (body.category) updateData.category = String(body.category);
    if (body.brandPref !== undefined) updateData.brandPref = body.brandPref ? String(body.brandPref) : null;
    if (body.transaction) updateData.transaction = String(body.transaction);
    if (body.budgetMin !== undefined) updateData.budgetMin = body.budgetMin ? BigInt(String(body.budgetMin).replace(/[^\d]/g, "")) : null;
    if (body.budgetMax !== undefined) updateData.budgetMax = body.budgetMax ? BigInt(String(body.budgetMax).replace(/[^\d]/g, "")) : null;
    if (body.city !== undefined) updateData.city = body.city ? String(body.city) : null;
    if (body.province !== undefined) updateData.province = body.province ? String(body.province) : null;
    if (body.status) updateData.status = String(body.status);

    const updated = await db.buyRequest.update({ where: { id }, data: updateData });
    return NextResponse.json({ ok: true, id: updated.id, status: updated.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* DELETE /api/wanted/[id] — cancel own request. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await db.buyRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.buyRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
