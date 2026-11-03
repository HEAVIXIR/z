import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/homepage-sections */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const sections = await db.homePageSection.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ sections });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

function sectionData(body: any) {
  const data: any = {};
  const allowed = ["key", "title", "subtitle", "description", "order", "active", "config"];
  for (const k of allowed) if (k in body) data[k] = body[k];
  if (typeof data.active === "string")
    data.active = ["1", "true", "yes"].includes(data.active);
  if (typeof data.order === "string") data.order = Number(data.order) || 0;
  if (data.config && typeof data.config === "object")
    data.config = JSON.stringify(data.config);
  return data;
}

/* PUT /api/admin/homepage-sections — bulk update. */
export async function PUT(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body.sections)) {
      await Promise.all(
        body.sections.map((s: any) =>
          db.homePageSection.update({
            where: { id: String(s.id) },
            data: sectionData(s),
          }),
        ),
      );
      const sections = await db.homePageSection.findMany({
        orderBy: { order: "asc" },
      });
      return NextResponse.json({ ok: true, sections });
    }
    const data = sectionData(body);
    if (!data.key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }
    const section = await db.homePageSection.upsert({
      where: { key: data.key },
      create: data,
      update: data,
    });
    return NextResponse.json({ ok: true, section });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/homepage-sections — create new section. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const data = sectionData(body);
    if (!data.key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }
    const existing = await db.homePageSection.findUnique({
      where: { key: data.key },
    });
    if (existing) {
      return NextResponse.json(
        { error: "key already exists" },
        { status: 409 },
      );
    }
    const section = await db.homePageSection.create({ data });
    return NextResponse.json({ ok: true, section });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
