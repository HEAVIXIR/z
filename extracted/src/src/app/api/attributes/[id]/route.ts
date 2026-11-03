import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

/* ============================================================
   PATCH /api/attributes/[id] — ADMIN update.

   Body: any subset of AttributeDefinition scalar fields plus
   `options: [{ value, label?, sortOrder? }]`.

   Strategy for options: REPLACE — delete all existing options,
   then re-create from the payload. This keeps the editor simple
   and avoids the diff-dance for option id stability.
   ============================================================ */
export async function PATCH(req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = await db.attributeDefinition.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // key uniqueness check (if changing)
    if (body.key !== undefined && body.key !== existing.key) {
      if (body.key) {
        const dup = await db.attributeDefinition.findUnique({
          where: { key: String(body.key) },
        });
        if (dup && dup.id !== id) {
          return NextResponse.json(
            { error: "key already exists" },
            { status: 409 },
          );
        }
      }
    }

    const data: any = {};
    const scalarStrings = [
      "key",
      "labelFa",
      "labelEn",
      "type",
      "unit",
    ];
    for (const k of scalarStrings) {
      if (k in body) {
        data[k] = body[k] === undefined || body[k] === "" ? null : String(body[k]);
      }
    }
    // keep `name` / `nameEn` in sync with labelFa / labelEn (legacy compat)
    if ("labelFa" in body) data.name = body.labelFa ? String(body.labelFa) : existing.name;
    if ("nameEn" in body) data.nameEn = body.labelEn ? String(body.labelEn) : null;

    const scalarBools = [
      "required",
      "filterable",
      "searchable",
      "sortable",
      "visibleOnCard",
      "visibleOnDetail",
      "seoRelevant",
      "aiRelevant",
    ];
    for (const k of scalarBools) {
      if (k in body) data[k] = body[k] === true;
    }
    if ("sortOrder" in body) data.sortOrder = Number(body.sortOrder) || 0;

    // Options replace strategy (only when `options` key is present in body)
    const hasOptionsPayload = Array.isArray(body.options);

    if (hasOptionsPayload) {
      await db.$transaction([
        db.attributeOption.deleteMany({ where: { attributeId: id } }),
      ]);
      const optionsData = (body.options as any[])
        .filter((o) => o && String(o.value ?? "").trim() !== "")
        .map((o, idx) => ({
          attributeId: id,
          value: String(o.value),
          label: o.label ? String(o.label) : null,
          sortOrder: Number(o.sortOrder) || idx,
        }));
      if (optionsData.length) {
        await db.attributeOption.createMany({ data: optionsData });
      }
    }

    const attribute = await db.attributeDefinition.update({
      where: { id },
      data,
      include: {
        options: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] },
        categories: {
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
      },
    });

    return NextResponse.json({ ok: true, attribute });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ============================================================
   DELETE /api/attributes/[id] — ADMIN delete.

   Schema-level cascade handles:
   - AttributeOption (onDelete: Cascade)
   - CategoryAttribute (onDelete: Cascade)
   - ListingAttributeValue (onDelete: Cascade)
   ============================================================ */
export async function DELETE(_req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.attributeDefinition.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.attributeDefinition.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
