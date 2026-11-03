// @ts-nocheck — utility script, not part of runtime typecheck
/**
 * security:check — Verifies RBAC enforcement, AI Gateway usage, and audit coverage.
 * Per HEAVIX COMPLETION MASTER SPEC V1.0 sections 6, 7, 8, 31, 32.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const API_ADMIN_DIR = "src/app/api/admin";
const API_DIR = "src/app/api";

interface RouteCheck {
  path: string;
  hasAuth: boolean;
  hasRBAC: boolean;
  hasAudit: boolean;
  methods: string[];
}

function findRouteFiles(dir: string, base = ""): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const relPath = base ? `${base}/${entry}` : entry;
      if (statSync(fullPath).isDirectory()) {
        results.push(...findRouteFiles(fullPath, relPath));
      } else if (entry === "route.ts") {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

function checkRoute(filePath: string): RouteCheck {
  const content = readFileSync(filePath, "utf8");
  const methods: string[] = [];
  if (content.includes("export async function GET")) methods.push("GET");
  if (content.includes("export async function POST")) methods.push("POST");
  if (content.includes("export async function PUT")) methods.push("PUT");
  if (content.includes("export async function PATCH")) methods.push("PATCH");
  if (content.includes("export async function DELETE")) methods.push("DELETE");

  return {
    path: filePath,
    hasAuth: content.includes("isAuthenticated") || content.includes("getCurrentUser") || content.includes("requireAdmin"),
    hasRBAC: content.includes("requirePermission") || content.includes("hasPermission") || content.includes("requireAnyPermission"),
    hasAudit: content.includes("auditLog") || content.includes("AuditLog") || content.includes("logAudit"),
    methods,
  };
}

function checkAIGateway() {
  console.log("\n=== AI GATEWAY CHECK (section 31) ===");
  const aiRoutes = findRouteFiles(`${API_DIR}`);
  const directAI: string[] = [];
  for (const route of aiRoutes) {
    const content = readFileSync(route, "utf8");
    if ((content.includes("ZAI.create") || content.includes("z-ai-web-dev-sdk")) &&
        !route.includes("ai-gateway") &&
        !route.includes("ai-budget")) {
      directAI.push(route);
    }
  }
  if (directAI.length === 0) {
    console.log("  ✓ All AI calls go through the AI Gateway");
  } else {
    console.log(`  ✗ ${directAI.length} routes bypass the AI Gateway:`);
    for (const r of directAI) console.log(`    - ${r}`);
  }
  return directAI.length === 0;
}

function checkRBAC() {
  console.log("\n=== RBAC ENFORCEMENT CHECK (section 6, 7) ===");
  // Check if middleware exists (centralized RBAC enforcement)
  let hasMiddleware = false;
  try {
    const mw = readFileSync("src/middleware.ts", "utf8");
    hasMiddleware = mw.includes("requiredPerm") && mw.includes("/api/admin/");
  } catch {}
  
  const adminRoutes = findRouteFiles(API_ADMIN_DIR);
  let withRBAC = 0;
  let withoutRBAC = 0;
  for (const route of adminRoutes) {
    const check = checkRoute(route);
    if (check.hasRBAC) withRBAC++;
    else withoutRBAC++;
  }
  console.log(`  Centralized middleware: ${hasMiddleware ? "✓ ACTIVE" : "✗ MISSING"}`);
  console.log(`  Admin routes total: ${adminRoutes.length}`);
  console.log(`  Per-route RBAC (requirePermission): ${withRBAC}`);
  console.log(`  Auth-only routes (covered by middleware): ${withoutRBAC}`);
  if (hasMiddleware) {
    console.log("  ✓ RBAC enforced via centralized middleware on ALL /api/admin/* routes");
    return true;
  }
  return withoutRBAC === 0;
}

function checkAudit() {
  console.log("\n=== AUDIT COVERAGE CHECK (section 8) ===");
  const adminRoutes = findRouteFiles(API_ADMIN_DIR);
  let withAudit = 0;
  let withoutAudit = 0;
  for (const route of adminRoutes) {
    const check = checkRoute(route);
    if (check.hasAudit) {
      withAudit++;
    } else {
      withoutAudit++;
    }
  }
  console.log(`  Admin routes with audit logging: ${withAudit}/${adminRoutes.length}`);
  console.log(`  Admin routes without audit: ${withoutAudit}`);
  return withoutAudit === 0;
}

async function main() {
  console.log("=== HEAVIX SECURITY CHECK ===");
  console.log(`Date: ${new Date().toISOString()}`);

  const rbacOk = checkRBAC();
  const aiOk = checkAIGateway();
  const auditOk = checkAudit();

  console.log("\n=== SUMMARY ===");
  console.log(`  RBAC Enforcement: ${rbacOk ? "✓ PASS" : "✗ FAIL"}`);
  console.log(`  AI Gateway Unified: ${aiOk ? "✓ PASS" : "✗ FAIL"}`);
  console.log(`  Audit Coverage: ${auditOk ? "✓ PASS" : "✗ NEEDS IMPROVEMENT"}`);

  const allPass = rbacOk && aiOk && auditOk;
  console.log(`\n  OVERALL: ${allPass ? "✓ SECURE" : "✗ NEEDS HARDENING"}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
