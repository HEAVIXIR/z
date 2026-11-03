import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseBool, parseNumber } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/ai-policies/[taskType]
   ------------------------------------------------------------
   P0-7 (HEAVIX-SECURITY-BASELINE-V1.md §8): Admin editor for a
   single AITaskPolicy row.

   PATCH — updates any subset of the editable fields:
            allowedRoles, hourlyLimit, dailyLimit,
            maxInputChars, maxOutputTokens, model, timeoutMs,
            costCeilingUsd, active

   The taskType itself is immutable (it's the @unique key).
   ============================================================ */

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ taskType: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { taskType } = await ctx.params;
  const policy = await db.aITaskPolicy.findUnique({ where: { taskType } });
  if (!policy) {
    return NextResponse.json({ error: "policy not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, policy });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ taskType: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { taskType } = await ctx.params;
  const before = await db.aITaskPolicy.findUnique({ where: { taskType } });
  if (!before) {
    return NextResponse.json({ error: "policy not found" }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};

    if (typeof body.allowedRoles === "string") {
      // Normalise: trim, uppercase, comma-join. Empty → "*".
      const cleaned = body.allowedRoles
        .split(",")
        .map((r: string) => r.trim().toUpperCase())
        .filter(Boolean)
        .join(",");
      patch.allowedRoles = cleaned || "*";
    }
    const hourly = parseNumber(body.hourlyLimit);
    const daily = parseNumber(body.dailyLimit);
    const maxIn = parseNumber(body.maxInputChars);
    const maxOut = parseNumber(body.maxOutputTokens);
    const timeout = parseNumber(body.timeoutMs);
    const ceiling = parseNumber(body.costCeilingUsd);
    if (hourly !== null && hourly >= 0) patch.hourlyLimit = Math.floor(hourly);
    if (daily !== null && daily >= 0) patch.dailyLimit = Math.floor(daily);
    if (maxIn !== null && maxIn >= 0) patch.maxInputChars = Math.floor(maxIn);
    if (maxOut !== null && maxOut >= 0)
      patch.maxOutputTokens = Math.floor(maxOut);
    if (timeout !== null && timeout >= 1000) patch.timeoutMs = Math.floor(timeout);
    if (ceiling !== null && ceiling >= 0) patch.costCeilingUsd = ceiling;
    if (typeof body.model === "string" && body.model.trim()) {
      patch.model = body.model.trim();
    }
    if (typeof body.active === "boolean") patch.active = body.active;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "no fields to update" }, { status: 400 });
    }

    const updated = await db.aITaskPolicy.update({
      where: { taskType },
      data: patch,
    });

    await logAudit({
      actorType: "ADMIN",
      action: "ai.policy.update",
      entityType: "AITaskPolicy",
      entityId: updated.id,
      before,
      after: updated,
      reason: `Admin updated AI policy for ${taskType}`,
    });

    return NextResponse.json({ success: true, policy: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
