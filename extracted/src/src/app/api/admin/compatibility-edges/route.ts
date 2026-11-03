import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENTITY_TYPES = ["Product", "Machine", "Part", "Attachment", "Model"];
const RELATION_TYPES = ["COMPATIBLE_WITH", "FITS", "REPLACES", "UPGRADES", "REQUIRES"];
const SOURCES = ["MANUAL", "AI_SUGGESTED", "OEM_DOCUMENT"];

/* GET /api/admin/compatibility-edges — list edges, optionally filtered by entity. */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const entityType = url.searchParams.get("entityType") || undefined;
    const entityId = url.searchParams.get("entityId") || undefined;
    const relationType = url.searchParams.get("relationType") || undefined;
    const verified = url.searchParams.get("verified");
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 200, 1), 500);

    const where: any = {};
    if (entityType && entityId) {
      where.OR = [
        { sourceEntityType: entityType, sourceEntityId: entityId },
        { targetEntityType: entityType, targetEntityId: entityId },
      ];
    } else {
      if (entityType) {
        where.OR = [
          { sourceEntityType: entityType },
          { targetEntityType: entityType },
        ];
      }
    }
    if (relationType) where.relationType = relationType;
    if (verified !== null && verified !== undefined && verified !== "") {
      where.verified = ["1", "true", "yes"].includes(verified);
    }

    const edges = await db.compatibilityEdge.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ edges });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/compatibility-edges — create new edge. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));

    if (!body.sourceEntityType || !body.sourceEntityId) {
      return NextResponse.json(
        { error: "sourceEntityType and sourceEntityId are required" },
        { status: 400 },
      );
    }
    if (!body.targetEntityType || !body.targetEntityId) {
      return NextResponse.json(
        { error: "targetEntityType and targetEntityId are required" },
        { status: 400 },
      );
    }
    if (!body.relationType) {
      return NextResponse.json(
        { error: "relationType is required" },
        { status: 400 },
      );
    }
    if (!ENTITY_TYPES.includes(String(body.sourceEntityType))) {
      return NextResponse.json(
        { error: `sourceEntityType must be one of: ${ENTITY_TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    if (!ENTITY_TYPES.includes(String(body.targetEntityType))) {
      return NextResponse.json(
        { error: `targetEntityType must be one of: ${ENTITY_TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    if (!RELATION_TYPES.includes(String(body.relationType))) {
      return NextResponse.json(
        { error: `relationType must be one of: ${RELATION_TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    // No self-edge
    if (
      body.sourceEntityType === body.targetEntityType &&
      body.sourceEntityId === body.targetEntityId
    ) {
      return NextResponse.json(
        { error: "Cannot create a self-referential compatibility edge" },
        { status: 400 },
      );
    }

    const source =
      body.source && SOURCES.includes(String(body.source)) ? String(body.source) : "MANUAL";

    // Idempotent upsert — if the exact edge already exists, update verification fields
    const edge = await db.compatibilityEdge.upsert({
      where: {
        sourceEntityType_sourceEntityId_targetEntityType_targetEntityId_relationType: {
          sourceEntityType: String(body.sourceEntityType),
          sourceEntityId: String(body.sourceEntityId),
          targetEntityType: String(body.targetEntityType),
          targetEntityId: String(body.targetEntityId),
          relationType: String(body.relationType),
        },
      },
      create: {
        sourceEntityType: String(body.sourceEntityType),
        sourceEntityId: String(body.sourceEntityId),
        targetEntityType: String(body.targetEntityType),
        targetEntityId: String(body.targetEntityId),
        relationType: String(body.relationType),
        confidence:
          body.confidence === undefined || body.confidence === null
            ? null
            : Number(body.confidence),
        source,
        verified: Boolean(body.verified),
        verifiedBy: body.verifiedBy ?? null,
        verifiedAt: body.verified ? new Date() : (body.verifiedAt ? new Date(body.verifiedAt) : null),
      },
      update: {
        confidence:
          body.confidence === undefined || body.confidence === null
            ? null
            : Number(body.confidence),
        source,
        verified: Boolean(body.verified),
        verifiedBy: body.verifiedBy ?? null,
        verifiedAt: body.verified ? new Date() : (body.verifiedAt ? new Date(body.verifiedAt) : null),
      },
    });

    return NextResponse.json({ ok: true, edge });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
