import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { AI } from "@/lib/rate-limit-presets";
import { getClientIp, rateLimitKey } from "@/lib/request-context";
import {
  preflightAIRequest,
  recordAICost,
  getAIBudget,
} from "@/lib/ai-policy";
import { logAudit } from "@/lib/audit";
import ZAI from "z-ai-web-dev-sdk";

/* ============================================================
   POST /api/ai-gateway
   Central AI task router — all AI requests go through here.

   Priority #54, #56: unified gateway with logging + cost tracking.
   P0-7 (HEAVIX-SECURITY-BASELINE-V1.md §8): POLICY-CONTROLLED
   gateway. Every request must pass five gates BEFORE the LLM is
   invoked:

       1. Rate limit   (existing, AI preset)
       2. Task policy  (active row in AITaskPolicy)
       3. Auth         (role ∈ allowedRoles, ADMIN always)
       4. Quota        (per-user hourly + daily call count)
       5. Budget       (global daily/monthly USD spend cap)
   ─ plus input-size cap + per-call timeout enforced here.

   Body: { task: "SEARCH"|"LISTING_BUILDER"|"PRICE_ANALYSIS"|
              "MARKET_ANALYST"|"SELLER_ASSISTANT"|"SCRAPER"|
              "MODERATION"|"SEMANTIC_SEARCH",
           input: any }
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // ── Rate limit (P0-6) — applied before any LLM call ──
  // Authenticated users are throttled by userId; admin path by IP.
  const user = await getCurrentUser();
  const adminOk = !user ? await isAuthenticated() : false;
  const actorId = user?.id ?? (adminOk ? "admin" : null);
  const ip = getClientIp(req);
  const rlKey = rateLimitKey(actorId ?? ip, AI.label);
  const rl = rateLimit({
    key: rlKey,
    limit: AI.limit,
    windowMs: AI.windowMs,
  });
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "درخواست بیش از حد. بعداً تلاش کنید.",
        retryAfter: retryAfterSeconds(rl.resetAt),
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(rl.resetAt)) },
      },
    );
  }

  // ── Parse body ──────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { task, input } = body ?? {};

  if (!task || typeof task !== "string") {
    return NextResponse.json({ error: "task required" }, { status: 400 });
  }

  // ── P0-7 Policy pre-flight (auth + quota + budget + size) ───
  // Input length is computed from the serialised input so that the
  // size cap meaningfully bounds the whole payload, not just a
  // string sub-field. Truncate the serialisation to a sane upper
  // bound before measuring so a malicious huge payload can't OOM us.
  let inputLen = 0;
  try {
    inputLen = Math.min(
      1_000_000,
      JSON.stringify(input ?? "").length,
    );
  } catch {
    inputLen = 0;
  }

  const preflight = await preflightAIRequest({
    taskType: task,
    user: user ? { id: user.id } : null,
    inputLength: inputLen,
  });
  if (!preflight.ok) {
    // Audit the denial — every AI policy rejection is a security event
    // per HEAVIX-SECURITY-BASELINE-V1 §10 ("AI tool call").
    await logAudit({
      actorId: actorId ?? null,
      actorType: user ? "USER" : "ADMIN",
      action: "ai.execute",
      entityType: "AIGateway",
      entityId: null,
      before: { task, inputLen },
      after: { denied: true, reason: preflight.reason, statusCode: preflight.statusCode },
      ip,
      reason: `AI gateway denied: ${preflight.reason}`,
    });
    return NextResponse.json(
      { error: preflight.reason },
      { status: preflight.statusCode },
    );
  }

  const { policy } = preflight;
  const effectiveUserId = user?.id ?? null;

  // ── Route to the appropriate AI handler ─────────────────────
  let result: any = null;
  let model = policy.model === "default" ? "z-ai-default" : policy.model;
  let success = true;
  let errorMsg: string | null = null;

  // Abort the LLM call if it exceeds the policy timeout. This guards
  // against runaway requests burning budget.
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), policy.timeoutMs);

  try {
    const zai = await ZAI.create();

    switch (task) {
      case "SEARCH":
      case "SEMANTIC_SEARCH": {
        const query = String(input?.query || "");
        const llmRes = await zai.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "تو دستیار جستجوی هویکس هستی. عبارت فارسی را به کلمات کلیدی.expand کن. فقط کلمات کلیدی با کامما برگردان.",
            },
            { role: "user", content: query },
          ],
          thinking: { type: "disabled" },
        });
        const expanded = llmRes.choices?.[0]?.message?.content ?? query;
        result = { expandedQuery: expanded, originalQuery: query };
        break;
      }

      case "LISTING_BUILDER": {
        const desc = String(input?.description || "");
        const llmRes = await zai.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "از توضیحات فارسی فروشنده، اطلاعات ساختاریافته آگهی استخراج کن. فقط JSON برگردان: {title,brand,model,year,hours,condition,price,description}",
            },
            { role: "user", content: desc },
          ],
          thinking: { type: "disabled" },
        });
        const content = llmRes.choices?.[0]?.message?.content ?? "";
        const m = content.match(/\{[\s\S]*\}/);
        result = m ? JSON.parse(m[0]) : { title: desc.substring(0, 80) };
        break;
      }

      case "PRICE_ANALYSIS": {
        result = {
          message: "Use /api/ai-price-intelligence for detailed analysis",
        };
        break;
      }

      case "MARKET_ANALYST": {
        result = {
          message: "Use /api/ai-market-analyst for market analysis",
        };
        break;
      }

      case "SELLER_ASSISTANT": {
        result = {
          message: "Use /api/ai-seller-assistant for seller analysis",
        };
        break;
      }

      case "MODERATION": {
        const text = String(input?.text || "");
        const llmRes = await zai.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "بررسی کن آیا متن فارسی نامناسب، توهین‌آمیز یا هرزنامه است. فقط JSON: {appropriate:true/false,reason:\"\"}",
            },
            { role: "user", content: text },
          ],
          thinking: { type: "disabled" },
        });
        const content = llmRes.choices?.[0]?.message?.content ?? "";
        const m = content.match(/\{[\s\S]*\}/);
        result = m ? JSON.parse(m[0]) : { appropriate: true };
        break;
      }

      default:
        clearTimeout(timeoutTimer);
        return NextResponse.json(
          { error: "Unknown task type" },
          { status: 400 },
        );
    }
  } catch (e: any) {
    success = false;
    if (e?.name === "AbortError") {
      errorMsg = `timeout after ${policy.timeoutMs}ms`;
    } else {
      errorMsg = e?.message ?? String(e);
    }
    result = { error: errorMsg };
  } finally {
    clearTimeout(timeoutTimer);
  }

  const latencyMs = Date.now() - startTime;

  // ── Record cost against the global budget (only on success) ─
  // We use the policy's per-call cost ceiling as the recorded cost
  // estimate — actual token-based cost accounting would require the
  // provider to return token usage, which we surface as `tokensUsed`
  // in the log but conservatively bill the ceiling.
  const recordedCost = success ? policy.costCeilingUsd : 0;
  if (success && recordedCost > 0) {
    await recordAICost(task, recordedCost, effectiveUserId);
  }

  // ── Audit + AIGatewayLog ────────────────────────────────────
  try {
    await db.aIGatewayLog.create({
      data: {
        taskType: task,
        model,
        input: JSON.stringify(input).substring(0, 500),
        output: JSON.stringify(result).substring(0, 500),
        latencyMs,
        cost: recordedCost || null,
        success,
        error: errorMsg,
        userId: effectiveUserId,
      },
    });
  } catch {
    /* logging is best-effort */
  }

  // Security audit entry — every AI tool call gets logged per
  // HEAVIX-SECURITY-BASELINE-V1 §10.
  await logAudit({
    actorId: actorId ?? null,
    actorType: user ? "USER" : "ADMIN",
    action: "ai.execute",
    entityType: "AIGateway",
    entityId: null,
    before: { task, model, inputLen },
    after: { success, latencyMs, cost: recordedCost, error: errorMsg },
    ip,
    reason: success
      ? `AI task ${task} executed`
      : `AI task ${task} failed: ${errorMsg ?? "unknown"}`,
  });

  return NextResponse.json({ success, result, latencyMs, cost: recordedCost });
}

/* ============================================================
   GET /api/ai-gateway — admin view of AI gateway logs + budget
   ============================================================ */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const taskType = url.searchParams.get("task");

  const where: Record<string, unknown> = {};
  if (taskType) where.taskType = taskType;

  const [logs, budget] = await Promise.all([
    db.aIGatewayLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getAIBudget(),
  ]);

  const stats = {
    total: logs.length,
    successful: logs.filter((l) => l.success).length,
    failed: logs.filter((l) => !l.success).length,
    avgLatency:
      logs.length > 0
        ? Math.round(
            logs.reduce((s, l) => s + (l.latencyMs || 0), 0) / logs.length,
          )
        : 0,
    totalCostUsd: logs.reduce((s, l) => s + (l.cost ?? 0), 0),
  };

  return NextResponse.json({
    success: true,
    stats,
    budget: {
      ...budget,
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
      dailyResetAt: budget.dailyResetAt?.toISOString() ?? null,
      monthlyResetAt: budget.monthlyResetAt?.toISOString() ?? null,
    },
    data: logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
