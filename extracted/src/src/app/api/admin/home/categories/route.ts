import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/admin/home/categories — read the HomeCategoryConfig
   row. Auth required. Returns { config: { generation, parentId } }
   and the list of L1 children of the machinery root (so the
   admin can pick a parent when generation=2).
   ============================================================ */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    let cfg = await db.homeCategoryConfig.findUnique({ where: { id: "main" } });
    if (!cfg) {
      cfg = await db.homeCategoryConfig.create({ data: { id: "main" } });
    }

    // L1 children of the machinery root — used to populate the
    // "select L1 parent" dropdown when generation=2.
    const machinery = await db.category.findFirst({
      where: { slug: "machinery", active: true },
      select: { id: true },
    });
    const l1Children = machinery
      ? await db.category.findMany({
          where: { parentId: machinery.id, active: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, nameEn: true, slug: true },
        })
      : [];

    return NextResponse.json({
      config: {
        generation: cfg.homeCategoryGeneration,
        parentId: cfg.homeCategoryParentId,
      },
      l1Children,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ============================================================
   PUT /api/admin/home/categories — upsert the HomeCategoryConfig.
   Body: { generation: 1|2, parentId?: string|null }
   ============================================================ */
export async function PUT(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const generation =
      Number(body.generation) === 2 ? 2 : 1; // 1 is default for any invalid input
    const parentId =
      typeof body.parentId === "string" && body.parentId.length > 0
        ? body.parentId
        : null;

    // If generation=2, validate that the parentId refers to an
    // existing L1 child of the machinery root.
    if (generation === 2 && parentId) {
      const parent = await db.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json(
          { error: "دسته والد یافت نشد." },
          { status: 400 },
        );
      }
    }

    const cfg = await db.homeCategoryConfig.upsert({
      where: { id: "main" },
      create: {
        id: "main",
        homeCategoryGeneration: generation,
        homeCategoryParentId: generation === 2 ? parentId : null,
      },
      update: {
        homeCategoryGeneration: generation,
        homeCategoryParentId: generation === 2 ? parentId : null,
      },
    });

    return NextResponse.json({
      ok: true,
      config: {
        generation: cfg.homeCategoryGeneration,
        parentId: cfg.homeCategoryParentId,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
