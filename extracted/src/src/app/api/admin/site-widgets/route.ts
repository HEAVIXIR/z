import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/site-widgets — list all widgets. */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const widgets = await db.siteWidget.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ widgets });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/site-widgets — create or update by key.
   Body: { key, title, content, active? }
*/
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.key || !body.title) {
      return NextResponse.json(
        { error: "key and title are required" },
        { status: 400 },
      );
    }
    const data: any = {
      title: String(body.title),
      content: String(body.content ?? ""),
      active: body.active !== false,
    };
    const widget = await db.siteWidget.upsert({
      where: { key: String(body.key) },
      create: { key: String(body.key), ...data },
      update: data,
    });
    return NextResponse.json({ ok: true, widget });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
