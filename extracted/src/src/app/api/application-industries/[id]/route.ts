import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

/* PATCH /api/application-industries/[id] — admin update. */
export async function PATCH(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const existing = await db.applicationIndustry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data: any = {};
    const allowed = ["nameFa", "nameEn", "icon", "active", "sortOrder"];
    for (const k of allowed) {
      if (k in body) {
        if (k === "active") data[k] = Boolean(body[k]);
        else if (k === "sortOrder") data[k] = Number(body[k]) || 0;
        else data[k] = body[k] === undefined ? null : body[k];
      }
    }
    if (body.key && body.key !== existing.key) {
      const dup = await db.applicationIndustry.findUnique({
        where: { key: String(body.key) },
      });
      if (dup && dup.id !== id) {
        return NextResponse.json(
          { error: "key already exists" },
          { status: 409 },
        );
      }
      data.key = String(body.key);
    }
    const industry = await db.applicationIndustry.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true, industry });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/application-industries/[id] — admin delete. */
export async function DELETE(_req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await db.applicationIndustry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
