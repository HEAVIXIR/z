/* HEAVIX — AI Task Policy + Budget Seed (P0-7)
   HEAVIX-SECURITY-BASELINE-V1.md §8
   HEAVIX-P0-IMPLEMENTATION-PLAN.md STEP 7

   Idempotent: safe to re-run. Uses upsert-by-taskType for policies
   and upsert-by-id("main") for the budget singleton. Existing policy
   rows keep their admin-tweaked limits — only the seed defaults are
   re-applied EXCEPT for fields the admin may have legitimately
   customised, which we leave untouched on update (we only fill them
   in on first create).

   Run:
     bunx tsx prisma/seed-ai-policies.ts
   or:
     bun run db:seed-ai-policies
*/
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/* ───────────── Default AI task policies ───────────── */

type PolicySeed = {
  taskType: string;
  allowedRoles: string;
  hourlyLimit: number;
  dailyLimit: number;
  maxInputChars: number;
  maxOutputTokens: number;
  model: string;
  timeoutMs: number;
  costCeilingUsd: number;
};

const POLICIES: PolicySeed[] = [
  {
    taskType: "SEARCH",
    allowedRoles: "*", // all roles
    hourlyLimit: 30,
    dailyLimit: 100,
    maxInputChars: 1000,
    maxOutputTokens: 500,
    model: "default",
    timeoutMs: 15000,
    costCeilingUsd: 0.01,
  },
  {
    taskType: "LISTING_BUILDER",
    allowedRoles: "ADMIN,SELLER",
    hourlyLimit: 20,
    dailyLimit: 50,
    maxInputChars: 5000,
    maxOutputTokens: 1500,
    model: "default",
    timeoutMs: 30000,
    costCeilingUsd: 0.05,
  },
  {
    taskType: "PRICE_ANALYSIS",
    allowedRoles: "ADMIN,SELLER",
    hourlyLimit: 10,
    dailyLimit: 30,
    maxInputChars: 3000,
    maxOutputTokens: 1500,
    model: "default",
    timeoutMs: 30000,
    costCeilingUsd: 0.02,
  },
  {
    taskType: "MARKET_ANALYST",
    allowedRoles: "ADMIN", // admin only
    hourlyLimit: 10,
    dailyLimit: 30,
    maxInputChars: 5000,
    maxOutputTokens: 2000,
    model: "default",
    timeoutMs: 45000,
    costCeilingUsd: 0.05,
  },
  {
    taskType: "SELLER_ASSISTANT",
    allowedRoles: "ADMIN,SELLER",
    hourlyLimit: 20,
    dailyLimit: 50,
    maxInputChars: 3000,
    maxOutputTokens: 1500,
    model: "default",
    timeoutMs: 30000,
    costCeilingUsd: 0.02,
  },
  {
    taskType: "SCRAPER",
    allowedRoles: "ADMIN", // admin only
    hourlyLimit: 5,
    dailyLimit: 20,
    maxInputChars: 5000,
    maxOutputTokens: 3000,
    model: "default",
    timeoutMs: 60000,
    costCeilingUsd: 0.1,
  },
  {
    taskType: "MODERATION",
    allowedRoles: "ADMIN", // admin only (also callable by system)
    hourlyLimit: 20,
    dailyLimit: 100,
    maxInputChars: 5000,
    maxOutputTokens: 500,
    model: "default",
    timeoutMs: 20000,
    costCeilingUsd: 0.01,
  },
  {
    taskType: "SEMANTIC_SEARCH",
    allowedRoles: "*", // all roles
    hourlyLimit: 30,
    dailyLimit: 100,
    maxInputChars: 1000,
    maxOutputTokens: 500,
    model: "default",
    timeoutMs: 15000,
    costCeilingUsd: 0.01,
  },
];

/* ───────────── Budget singleton ───────────── */

const BUDGET = {
  id: "main",
  dailyLimitUsd: 10.0,
  monthlyLimitUsd: 200.0,
  dailySpendUsd: 0.0,
  monthlySpendUsd: 0.0,
  active: true,
};

/* ───────────── Run ───────────── */

async function main() {
  console.log("→ Seeding AI task policies + budget singleton …");

  // 1. Policies — upsert by taskType. On first create we apply all
  //    defaults; on update we leave admin-customised limits alone
  //    and only re-assert the `active=true` flag + ensure the row
  //    still exists for any newly added task types.
  for (const p of POLICIES) {
    await db.aITaskPolicy.upsert({
      where: { taskType: p.taskType },
      create: { ...p, active: true },
      update: {
        // Re-assert active state (admin may have toggled it; we do
        // NOT clobber the other fields — admin tweaks survive).
        // (Intentionally empty update means: do nothing on conflict.)
      },
    });
  }
  console.log(`  ✓ ${POLICIES.length} AI task policies ensured`);

  // 2. Budget singleton — upsert by id="main". Same idea: only
  //    create with defaults; never clobber admin-tuned limits or
  //    current spend counters.
  await db.aIBudget.upsert({
    where: { id: BUDGET.id },
    create: {
      id: BUDGET.id,
      dailyLimitUsd: BUDGET.dailyLimitUsd,
      monthlyLimitUsd: BUDGET.monthlyLimitUsd,
      dailySpendUsd: BUDGET.dailySpendUsd,
      monthlySpendUsd: BUDGET.monthlySpendUsd,
      dailyResetAt: new Date(),
      monthlyResetAt: new Date(),
      active: BUDGET.active,
    },
    update: {},
  });
  console.log("  ✓ AI budget singleton ensured (id=main)");

  console.log("✓ AI policy seed complete.");
}

main()
  .catch((err) => {
    console.error("AI policy seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
