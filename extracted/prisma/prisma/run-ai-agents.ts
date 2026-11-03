/* HEAVIX — AI Agents Runner (P0-AI-TEST · Task 2)
   -------------------------------------------------
   Runs every built-in AI agent via the in-process registry
   `src/lib/ai-agents` and verifies each one wrote its bookkeeping
   (AIAgent.lastRunAt + AuditLog entry).

   Agents exercised (in order):
     1. listing-enricher         — LLM extraction of attributes from
                                   PUBLISHED listings without attribute
                                   values. Writes ListingAttributeValue
                                   rows (sourceType=AI_EXTRACTION,
                                   verified=false).
     2. brand-researcher         — for brands missing logo/description,
                                   uses image-search to surface logo
                                   candidates and LLM to draft a
                                   Persian description. Writes
                                   KnowledgeEntry suggestions.
     3. category-image-gen       — for categories missing imageUrl,
                                   uses image generation. Writes the
                                   generated image to disk and updates
                                   category.imageUrl (admin reviews).
     4. stale-listing-detector   — finds PUBLISHED listings not
                                   updated in 60+ days, logs them to
                                   AuditLog, returns a count.

   Resilience:
     • Each agent is run independently — a single agent failure
       (rate-limit, SDK error, timeout) does NOT abort the others.
     • The runner writes AIAgent.lastRunAt + lastStatus on every
       attempt (SUCCESS or FAILED).
     • Each agent also writes an AuditLog entry (actorType=AI,
       action=ai.agent.success|ai.agent.failed).

   Run:
     bunx tsx prisma/run-ai-agents.ts
   or:
     bun run run:ai-agents
*/
import { PrismaClient } from "@prisma/client";
import {
  runAgent,
  listAgents,
  listRegisteredAgentKeys,
  type AgentRunResult,
} from "@/lib/ai-agents";

/* We use a separate PrismaClient for the verification queries so
   the script is independent of the dev server's singleton. The
   agents themselves use `@/lib/db` (the singleton) — both clients
   point at the same SQLite file, so writes from one are visible to
   the other on the next query. */
const db = new PrismaClient();

const AGENT_KEYS = [
  "listing-enricher",
  "brand-researcher",
  "category-image-gen",
  "stale-listing-detector",
] as const;

type AgentReport = {
  key: string;
  ok: boolean;
  summary: string;
  error?: string;
  details?: Record<string, unknown>;
  durationMs: number;
};

function line(char = "─", n = 56) {
  return char.repeat(n);
}

async function runOne(key: string): Promise<AgentReport> {
  const t0 = Date.now();
  try {
    const result: AgentRunResult = await runAgent(key);
    return {
      key,
      ok: result.ok,
      summary: result.summary,
      error: result.error,
      details: result.details,
      durationMs: Date.now() - t0,
    };
  } catch (err: unknown) {
    // runAgent already catches its own errors, but defend against
    // anything that escaped (e.g. import-time failures).
    const msg = err instanceof Error ? err.message : String(err);
    return {
      key,
      ok: false,
      summary: `Runner crashed: ${msg}`,
      error: msg,
      durationMs: Date.now() - t0,
    };
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  HEAVIX — AI Agents Runner (P0-AI-TEST Task 2)     ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  console.log("  Registered runners:", listRegisteredAgentKeys());
  console.log("");

  // ── Baseline ─────────────────────────────────────────────────
  const agentsBefore = await listAgents();
  console.log("  ── Agents BEFORE ──────────────────────────────────");
  for (const a of agentsBefore) {
    console.log(
      `    ${a.key.padEnd(24)} active=${a.active} lastRunAt=${
        a.lastRunAt ? a.lastRunAt.toISOString() : "(never)"
      } lastStatus=${a.lastStatus ?? "(none)"}`,
    );
  }
  console.log("");

  const auditBefore = await db.auditLog.count({
    where: { actorType: "AI" },
  });
  console.log(`  AuditLog(AI) BEFORE = ${auditBefore}`);
  console.log("");

  // ── Run each agent ───────────────────────────────────────────
  const reports: AgentReport[] = [];
  for (const key of AGENT_KEYS) {
    console.log(line("═"));
    console.log(`  ▶ Running agent: ${key}`);
    console.log(line("═"));
    const report = await runOne(key);
    reports.push(report);
    const tag = report.ok ? "✓ SUCCESS" : "✗ FAILED ";
    console.log(`  ${tag}  ${key}  (${report.durationMs}ms)`);
    console.log(`    summary : ${report.summary}`);
    if (report.error) console.log(`    error   : ${report.error}`);
    if (report.details && Object.keys(report.details).length > 0) {
      console.log(
        `    details : ${JSON.stringify(report.details).slice(0, 400)}`,
      );
    }
    console.log("");
  }

  // ── Verification ─────────────────────────────────────────────
  console.log(line("═"));
  console.log("  ── Verification ───────────────────────────────────");
  console.log(line("═"));

  const agentsAfter = await listAgents();
  console.log("");
  console.log("  Agents AFTER:");
  for (const a of agentsAfter) {
    console.log(
      `    ${a.key.padEnd(24)} lastRunAt=${
        a.lastRunAt ? a.lastRunAt.toISOString() : "(never)"
      } lastStatus=${a.lastStatus ?? "(none)"}`,
    );
  }
  console.log("");

  const auditAfter = await db.auditLog.count({
    where: { actorType: "AI" },
  });
  console.log(`  AuditLog(AI) AFTER = ${auditAfter} (Δ=${auditAfter - auditBefore})`);
  console.log("");

  // Per-agent audit-log breakdown
  const auditByAction = await db.auditLog.groupBy({
    by: ["action"],
    where: {
      actorType: "AI",
      action: { startsWith: "ai.agent." },
    },
    _count: { _all: true },
    orderBy: { action: "asc" },
  });
  console.log("  AuditLog(AI) by agent action:");
  for (const g of auditByAction) {
    console.log(`    ${g.action.padEnd(28)} = ${g._count._all}`);
  }
  console.log("");

  // Side-effects from each agent (informational)
  const [listAttrVals, knowledgeEntries, categoriesWithImg, staleFlagAudits] =
    await Promise.all([
      db.listingAttributeValue.count({
        where: { sourceType: "AI_EXTRACTION" },
      }),
      db.knowledgeEntry.count({
        where: { source: "AI", aiSuggested: true },
      }),
      db.category.count({
        where: { active: true, NOT: { imageUrl: null } },
      }),
      db.auditLog.count({ where: { action: "listing.stale_flag" } }),
    ]);
  console.log("  Agent side-effects:");
  console.log(
    `    ListingAttributeValue(AI_EXTRACTION) = ${listAttrVals}`,
  );
  console.log(
    `    KnowledgeEntry(AI, aiSuggested)       = ${knowledgeEntries}`,
  );
  console.log(
    `    Category.imageUrl set                 = ${categoriesWithImg}`,
  );
  console.log(
    `    AuditLog(listing.stale_flag)          = ${staleFlagAudits}`,
  );
  console.log("");

  // ── Summary ──────────────────────────────────────────────────
  console.log(line("═"));
  console.log("  ── Summary ────────────────────────────────────────");
  console.log(line("═"));
  const successes = reports.filter((r) => r.ok).length;
  const failures = reports.length - successes;
  console.log(`  Ran ${reports.length} agents: ${successes} ok, ${failures} failed.`);
  for (const r of reports) {
    const tag = r.ok ? "✓" : "✗";
    console.log(`    ${tag} ${r.key.padEnd(24)} ${r.summary.slice(0, 80)}`);
  }
  console.log("");
  if (failures > 0) {
    console.log(
      "  NOTE: agent failures are usually caused by rate-limits or",
    );
    console.log(
      "  AI budget caps — re-run later or adjust the budget from",
    );
    console.log("  /admin/ai-budget. The AIAgent.lastRunAt column is");
    console.log("  updated regardless of success/failure.");
  }
  console.log("");
  console.log("  Done.");
}

main()
  .catch((err) => {
    console.error("AI agents runner crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
