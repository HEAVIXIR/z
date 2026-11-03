import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseBool } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/dictionary — Industrial Persian Dictionary
   GET  — list all terms with aliases
   POST — create term with aliases
   ============================================================ */

const ENTITY_LABELS: Record<string, string> = {
  MACHINE: "ماشین‌آلات",
  BRAND: "برند",
  MODEL: "مدل",
  PART: "قطعه",
  CATEGORY: "دسته‌بندی",
};

const ALIAS_LABELS: Record<string, string> = {
  SYNONYM: "مترادف",
  COMMON_NAME: "نام رایج",
  ENGLISH: "انگلیسی",
  ABBREVIATION: "اختصار",
  MISSPELLING: "املای غلط",
};

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const terms = await db.industrialTerm.findMany({
      orderBy: { createdAt: "desc" },
      include: { aliases: { orderBy: { aliasType: "asc" } } },
    });

    const totalAliases = await db.termAlias.count();

    return NextResponse.json({
      success: true,
      data: terms.map((t) => ({
        ...t,
        entityLabel: t.entityType ? ENTITY_LABELS[t.entityType] ?? t.entityType : null,
        aliases: t.aliases.map((a) => ({
          ...a,
          aliasLabel: ALIAS_LABELS[a.aliasType] ?? a.aliasType,
        })),
      })),
      stats: {
        totalTerms: terms.length,
        totalAliases,
        activeTerms: terms.filter((t) => t.active).length,
        byEntityType: Object.keys(ENTITY_LABELS).map((k) => ({
          type: k,
          label: ENTITY_LABELS[k],
          count: terms.filter((t) => t.entityType === k).length,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const canonical = String(body.canonical ?? "").trim();
    if (!canonical) {
      return NextResponse.json(
        { error: "canonical is required" },
        { status: 400 },
      );
    }

    const aliases: Array<{ alias: string; aliasType: string }> = Array.isArray(
      body.aliases,
    )
      ? body.aliases
          .map((a: any) => ({
            alias: String(a?.alias ?? "").trim(),
            aliasType: String(a?.aliasType ?? "SYNONYM").toUpperCase(),
          }))
          .filter((a: { alias: string }) => a.alias.length > 0)
      : [];

    const term = await db.industrialTerm.create({
      data: {
        canonical,
        entityType: body.entityType ? String(body.entityType) : null,
        entityId: body.entityId ? String(body.entityId) : null,
        description: body.description ? String(body.description) : null,
        active: parseBool(body.active ?? true),
        aliases: {
          create: aliases.map((a) => ({
            alias: a.alias,
            aliasType: a.aliasType,
          })),
        },
      },
      include: { aliases: true },
    });

    return NextResponse.json({ success: true, data: term });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
