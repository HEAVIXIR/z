import { db } from "@/lib/db";
import { isAdmin, hasRole } from "@/lib/rbac";

/* ============================================================
   HEAVIX — AI Gateway Policy Engine (P0-7)
   ------------------------------------------------------------
   HEAVIX-SECURITY-BASELINE-V1.md §8  (AI Security)
   HEAVIX-P0-IMPLEMENTATION-PLAN.md   STEP 7 (AI Gateway)

   The AI Gateway is a Policy-Controlled gateway. Every task must
   pass FIVE independent gates BEFORE the LLM is invoked:

       1. getTaskPolicy    — task must have an ACTIVE policy row
                             (deny-by-default; tasks with no row
                             or active=false are rejected)
       2. checkAIAuth      — actor's role must be in allowedRoles
                             (ADMIN always passes; "*" = everyone)
       3. checkAIQuota     — per-user hourly + daily call counts
                             (from AIGatewayLog) must be under the
                             policy's limits
       4. checkAIBudget    — global daily/monthly USD spend (from
                             AIBudget singleton, auto-reset on
                             window rollover) must be under caps
                             AND the per-call cost ceiling
       5. (caller)         — max input size + timeout enforced in
                             the route handler itself

   After a successful call, `recordAICost` increments the budget
   counters. Failures do NOT consume budget.

   All checks are SERVER-SIDE. The client never gets to influence
   them. AI is untrusted automation (HEAVIX Principle 6).
   ============================================================ */

export type AIPolicyCheckResult = {
  ok: boolean;
  reason?: string;
};

/** Roles recognised by the policy engine. */
export type AIRole = "ADMIN" | "SELLER" | "BUYER" | "MODERATOR" | "SUPPORT";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
// Approximate month length. We reset the monthly counter 30 days
// after the last reset, which is good enough for budget tracking —
// exact calendar months would need a cron + per-month rows.
const MONTH_MS = 30 * DAY_MS;

/* ────────────────────────────────────────────────────────────
   1. Task policy lookup
   ──────────────────────────────────────────────────────────── */

/**
 * Fetch the policy for a task type. Returns null when the task has
 * no policy row OR the row is inactive — in both cases the caller
 * must DENY the request (deny-by-default).
 */
export async function getTaskPolicy(taskType: string) {
  try {
    const row = await db.aITaskPolicy.findUnique({
      where: { taskType },
    });
    if (!row) return null;
    if (!row.active) return null;
    return row;
  } catch (err) {
    console.error("[ai-policy] getTaskPolicy failed:", err);
    return null;
  }
}

/* ────────────────────────────────────────────────────────────
   2. Auth check — actor's role must be in allowedRoles
   ──────────────────────────────────────────────────────────── */

/** True if the user has at least one of the given role keys. */
async function userHasAnyRole(
  userId: string,
  roles: string[],
): Promise<boolean> {
  // Try the new RBAC UserRole table first.
  if (await hasRole(userId, roles)) return true;
  // Fall back to the legacy User.role column so existing users
  // that haven't been migrated to UserRole aren't locked out.
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) return false;
    const r = (user.role ?? "").toUpperCase();
    return roles.includes(r);
  } catch {
    return false;
  }
}

/**
 * Check whether the caller is authorised to invoke `taskType`.
 *
 * `user` may be null when the request comes through the admin-cookie
 * path (legacy admin). In that case we only allow it if ADMIN is in
 * the policy's allowedRoles — the admin cookie IS the admin identity.
 *
 * ADMIN always passes (subject to the policy existing at all).
 */
export async function checkAIAuth(
  user: { id: string } | null,
  policy: { allowedRoles: string },
): Promise<AIPolicyCheckResult> {
  const raw = (policy.allowedRoles ?? "").trim();
  if (!raw) return { ok: false, reason: "policy has no allowedRoles" };

  const roles = raw === "*"
    ? ["ADMIN", "SELLER", "BUYER", "MODERATOR", "SUPPORT"]
    : raw.split(",").map((r) => r.trim().toUpperCase()).filter(Boolean);

  // No user → only the admin-cookie path can satisfy this, and only
  // if ADMIN is in the allow-list. (The route handler is responsible
  // for verifying the admin cookie before reaching this point.)
  if (!user) {
    return roles.includes("ADMIN")
      ? { ok: true }
      : { ok: false, reason: "authentication required" };
  }

  // ADMIN always passes (least surprise for super-users).
  if (await isAdmin(user.id)) return { ok: true };

  const ok = await userHasAnyRole(user.id, roles);
  return ok
    ? { ok: true }
    : { ok: false, reason: "role not allowed for this AI task" };
}

/* ────────────────────────────────────────────────────────────
   3. Per-user quota — counts AIGatewayLog rows in the window
   ──────────────────────────────────────────────────────────── */

/**
 * Check the per-user hourly + daily call count for `taskType`
 * against the policy limits. Anonymous (admin-cookie) callers are
 * counted under the synthetic userId `"admin"`.
 */
export async function checkAIQuota(
  userId: string,
  taskType: string,
  policy: { hourlyLimit: number; dailyLimit: number },
): Promise<AIPolicyCheckResult> {
  try {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - HOUR_MS);
    const dayAgo = new Date(now.getTime() - DAY_MS);

    // Count both windows in one round-trip using Promise.all.
    // Index on (userId, taskType, createdAt) makes these cheap.
    const [hourlyCount, dailyCount] = await Promise.all([
      db.aIGatewayLog.count({
        where: {
          userId,
          taskType,
          createdAt: { gte: hourAgo },
        },
      }),
      db.aIGatewayLog.count({
        where: {
          userId,
          taskType,
          createdAt: { gte: dayAgo },
        },
      }),
    ]);

    if (hourlyCount >= policy.hourlyLimit) {
      return {
        ok: false,
        reason: `hourly quota exceeded (${hourlyCount}/${policy.hourlyLimit})`,
      };
    }
    if (dailyCount >= policy.dailyLimit) {
      return {
        ok: false,
        reason: `daily quota exceeded (${dailyCount}/${policy.dailyLimit})`,
      };
    }
    return { ok: true };
  } catch (err) {
    console.error("[ai-policy] checkAIQuota failed:", err);
    // Fail closed — if we can't verify the quota, deny.
    return { ok: false, reason: "quota check failed" };
  }
}

/* ────────────────────────────────────────────────────────────
   4. Global budget check + auto-reset
   ──────────────────────────────────────────────────────────── */

/**
 * Get the singleton AIBudget row, creating it if missing.
 * Always returns a row (never null) so callers can rely on the
 * shape. Auto-resets the daily/monthly counters when their window
 * has elapsed.
 */
export async function getAIBudget() {
  const now = new Date();
  // Ensure the singleton exists.
  const existing = await db.aIBudget.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      dailyLimitUsd: 10.0,
      monthlyLimitUsd: 200.0,
      dailySpendUsd: 0.0,
      monthlySpendUsd: 0.0,
      dailyResetAt: now,
      monthlyResetAt: now,
      active: true,
    },
    update: {},
  });

  // Auto-reset windows if elapsed.
  const dayExpired =
    !existing.dailyResetAt ||
    existing.dailyResetAt.getTime() + DAY_MS <= now.getTime();
  const monthExpired =
    !existing.monthlyResetAt ||
    existing.monthlyResetAt.getTime() + MONTH_MS <= now.getTime();

  if (dayExpired || monthExpired) {
    const patch: Record<string, unknown> = {};
    if (dayExpired) {
      patch.dailySpendUsd = 0.0;
      patch.dailyResetAt = now;
    }
    if (monthExpired) {
      patch.monthlySpendUsd = 0.0;
      patch.monthlyResetAt = now;
    }
    try {
      return await db.aIBudget.update({
        where: { id: "main" },
        data: patch,
      });
    } catch (err) {
      console.error("[ai-policy] budget auto-reset failed:", err);
      return existing;
    }
  }
  return existing;
}

/**
 * Check the global budget. `estimatedCostUsd` is the per-call cost
 * ceiling from the task policy — we pre-flight it so a single call
 * cannot blow the entire daily budget.
 */
export async function checkAIBudget(
  estimatedCostUsd: number,
  budget: {
    dailyLimitUsd: number;
    monthlyLimitUsd: number;
    dailySpendUsd: number;
    monthlySpendUsd: number;
    active: boolean;
  },
): Promise<AIPolicyCheckResult> {
  if (!budget.active) {
    return { ok: false, reason: "AI budget is disabled" };
  }
  if (budget.dailySpendUsd + estimatedCostUsd > budget.dailyLimitUsd) {
    return {
      ok: false,
      reason: `daily budget exceeded ($${budget.dailySpendUsd.toFixed(4)} + $${estimatedCostUsd.toFixed(4)} > $${budget.dailyLimitUsd})`,
    };
  }
  if (budget.monthlySpendUsd + estimatedCostUsd > budget.monthlyLimitUsd) {
    return {
      ok: false,
      reason: `monthly budget exceeded ($${budget.monthlySpendUsd.toFixed(4)} + $${estimatedCostUsd.toFixed(4)} > $${budget.monthlyLimitUsd})`,
    };
  }
  return { ok: true };
}

/* ────────────────────────────────────────────────────────────
   5. Record actual cost after a successful call
   ──────────────────────────────────────────────────────────── */

/**
 * Increment the global budget counters by `costUsd`. Called only
 * after a successful AI call. Failures here are swallowed (the
 * user already got their answer) but logged.
 */
export async function recordAICost(
  _taskType: string,
  costUsd: number,
  _userId: string | null,
): Promise<void> {
  if (!isFinite(costUsd) || costUsd <= 0) return;
  try {
    await db.aIBudget.update({
      where: { id: "main" },
      data: {
        dailySpendUsd: { increment: costUsd },
        monthlySpendUsd: { increment: costUsd },
      },
    });
  } catch (err) {
    console.error("[ai-policy] recordAICost failed:", err);
  }
}

/* ────────────────────────────────────────────────────────────
   Convenience: full pre-flight check for the route handler
   ──────────────────────────────────────────────────────────── */

/**
 * Run the full policy pre-flight for an AI gateway request.
 *
 * Returns `{ ok: true, policy, budget }` on success, or
 * `{ ok: false, statusCode, reason }` on failure with the
 * appropriate HTTP status code and a Persian `reason` for the
 * client.
 */
export async function preflightAIRequest(params: {
  taskType: string;
  user: { id: string } | null;
  inputLength: number;
}): Promise<
  | {
      ok: true;
      policy: NonNullable<Awaited<ReturnType<typeof getTaskPolicy>>>;
      budget: Awaited<ReturnType<typeof getAIBudget>>;
      actorId: string;
    }
  | { ok: false; statusCode: number; reason: string }
> {
  const { taskType, user, inputLength } = params;
  const actorId = user?.id ?? "admin";

  // 1. Policy exists & active — deny by default.
  const policy = await getTaskPolicy(taskType);
  if (!policy) {
    return {
      ok: false,
      statusCode: 403,
      reason: "این عملیات هوش مصنوعی مجاز نیست.",
    };
  }

  // 2. Auth — role in allowedRoles (admin always passes).
  const auth = await checkAIAuth(user, policy);
  if (!auth.ok) {
    return { ok: false, statusCode: 403, reason: "دسترسی غیرمجاز." };
  }

  // 3. Per-user quota.
  const quota = await checkAIQuota(actorId, taskType, policy);
  if (!quota.ok) {
    return { ok: false, statusCode: 429, reason: "سهمیه شما تمام شده." };
  }

  // 4. Global budget (auto-resets windows first).
  const budget = await getAIBudget();
  const budgetCheck = await checkAIBudget(policy.costCeilingUsd, budget);
  if (!budgetCheck.ok) {
    return {
      ok: false,
      statusCode: 429,
      reason: "بودجه هوش مصنوعی روزانه/ماهانه تمام شده.",
    };
  }

  // 5. Input size — enforced here too so the route stays simple.
  if (inputLength > policy.maxInputChars) {
    return {
      ok: false,
      statusCode: 400,
      reason: "ورودی بیش از حد طولانی.",
    };
  }

  return { ok: true, policy, budget, actorId };
}
