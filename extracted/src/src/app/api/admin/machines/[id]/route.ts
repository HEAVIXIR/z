import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

/* GET /api/admin/machines/[id] */
export async function GET(_req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const machine = await db.machine.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, canonicalName: true, slug: true },
          include: { brand: { select: { id: true, name: true } } },
        },
        listing: { select: { id: true, slug: true, title: true, status: true } },
      },
    });
    if (!machine) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ machine });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/admin/machines/[id] */
export async function PATCH(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const existing = await db.machine.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: any = {};
    const allowed = [
      "serialNumber", "condition", "ownershipHistory", "status",
    ];
    for (const k of allowed) {
      if (k in body) data[k] = body[k] === undefined ? null : body[k];
    }
    if ("productId" in body) {
      data.productId = body.productId === null || body.productId === "" ? null : String(body.productId);
    }
    if ("listingId" in body) {
      data.listingId = body.listingId === null || body.listingId === "" ? null : String(body.listingId);
    }
    if ("manufactureYear" in body) {
      data.manufactureYear =
        body.manufactureYear === null || body.manufactureYear === ""
          ? null
          : Number(body.manufactureYear);
    }
    if ("hours" in body) {
      data.hours = body.hours === null || body.hours === "" ? null : Number(body.hours);
    }

    const machine = await db.machine.update({ where: { id }, data });
    return NextResponse.json({ ok: true, machine });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/admin/machines/[id] */
export async function DELETE(_req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await db.machine.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
