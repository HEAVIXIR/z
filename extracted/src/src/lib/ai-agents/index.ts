import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { runModerationBatch } from "@/lib/moderation";
import type { AIAgent } from "@prisma/client";

/* ============================================================
   HEAVIX — AI Agents Platform (P2-26)
   HEAVIX-P0-IMPLEMENTATION-PLAN.md P2-26
   HEAVIX-CORRECTED-REFERENCE-V1.1.md §13 (AI Authority)
   ------------------------------------------------------------
   AI SUGGESTS — admin APPROVES (HBR-1.0 law 8 / AI Untrusted).
   Every agent writes its proposals as AI_SUGGESTED rows with
   `verified = false`; nothing the agent does is promoted to
   DB truth without an explicit admin action.

   This module is intentionally lightweight:
     • `registerAgent(key, runner)` — register a runner fn.
     • `runAgent(key)` — execute the runner for the agent row,
       update lastRunAt/lastStatus, log to AuditLog.
     • `listAgents()` — return all agent rows.
     • `ensureBuiltInAgents()` — seed the 5 built-in agent rows
       if missing (idempotent — safe on every cold start).

   Built-in agents (registered by side-effect at import time):
     • listing-enricher        — extract attribute values from
                                 PUBLISHED listing descriptions
                                 (e.g. operating weight, hours).
                                 Writes ListingAttributeValue rows
                                 with sourceType=AI_EXTRACTION,
                                 verified=false.
     • brand-researcher        — for brands missing logo/description,
                                 use image-search to surface logo
                                 candidates and LLM to draft a
                                 short Persian description. Writes
                                 suggestions to KnowledgeEntry
                                 (source=AI, aiSuggested=true,
                                 verified=false).
     • category-image-gen      — batches the existing
                                 /api/admin/categories/[id]/generate-image
                                 logic for categories missing
                                 imageUrl. Generates one image per
                                 category (max N per run).
     • stale-listing-detector  — finds listings not updated in 60+
                                 days, flags them via AuditLog +
                                 returns a summary count.
     • Every runner is defensive (try/catch). AI failures are
       reported in the summary but do NOT crash the agent.

   z-ai-web-dev-sdk is server-only. This module is server-only.
   ============================================================ */

export type AgentRunResult = {
  ok: boolean;
  summary: string;
  error?: string;
  /** Optional structured details for the admin UI / audit log. */
  details?: any;
};

export type AgentRunner = (agent: AIAgent) => Promise<AgentRunResult>;

/* ── Agent registry (in-process) ──────────────────────────── */
const RUNNERS = new Map<string, AgentRunner>();

export function registerAgent(key: string, runner: AgentRunner): void {
  RUNNERS.set(key, runner);
}

export function listRegisteredAgentKeys(): string[] {
  return Array.from(RUNNERS.keys());
}

export async function listAgents(): Promise<AIAgent[]> {
  await ensureBuiltInAgents();
  return db.aIAgent.findMany({ orderBy: { createdAt: "asc" } });
}

/**
 * Execute the runner registered under `key`. Updates the agent row
 * (lastRunAt, lastStatus) and writes an AuditLog entry. AI failures
 * are caught and reported in the summary — they NEVER throw.
 */
export async function runAgent(key: string): Promise<AgentRunResult> {
  await ensureBuiltInAgents();

  const agent = await db.aIAgent.findUnique({ where: { key } });
  if (!agent) {
    return {
      ok: false,
      summary: `ایجنت با کلید «${key}» یافت نشد.`,
      error: "AGENT_NOT_FOUND",
    };
  }
  if (!agent.active) {
    return {
      ok: false,
      summary: `ایجنت «${agent.nameFa}» غیرفعال است.`,
      error: "AGENT_INACTIVE",
    };
  }

  const runner = RUNNERS.get(key);
  if (!runner) {
    return {
      ok: false,
      summary: `runner برای ایجنت «${key}» ثبت نشده است.`,
      error: "RUNNER_NOT_REGISTERED",
    };
  }

  // Mark RUNNING
  try {
    await db.aIAgent.update({
      where: { id: agent.id },
      data: { lastRunAt: new Date(), lastStatus: "RUNNING" },
    });
  } catch {
    /* non-fatal */
  }

  let result: AgentRunResult;
  try {
    result = await runner(agent);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    result = {
      ok: false,
      summary: `اجرای ایجنت با خطا مواجه شد: ${msg}`,
      error: msg,
    };
  }

  const status: "SUCCESS" | "FAILED" = result.ok ? "SUCCESS" : "FAILED";
  try {
    await db.aIAgent.update({
      where: { id: agent.id },
      data: { lastRunAt: new Date(), lastStatus: status },
    });
  } catch {
    /* non-fatal */
  }

  // Audit log — actorType="AI" per HEAVIX-CORRECTED-REFERENCE §13.
  await logAudit({
    actorId: null,
    actorType: "AI",
    action: `ai.agent.${status.toLowerCase()}`,
    entityType: "AIAgent",
    entityId: agent.id,
    after: {
      key: agent.key,
      ok: result.ok,
      summary: result.summary,
      error: result.error ?? null,
      details: result.details ?? null,
    },
    reason: result.ok
      ? `اجرای ایجنت «${agent.nameFa}»`
      : `اجرای ایجنت «${agent.nameFa}» ناموفق بود`,
  });

  return result;
}

/* ============================================================
   Built-in agent definitions (declarative metadata only —
   the runner fns are registered separately below).
   ============================================================ */
type BuiltInAgentDef = {
  key: string;
  nameFa: string;
  nameEn: string;
  description: string;
  taskType: string;
  config?: any;
};

const BUILT_IN_AGENTS: BuiltInAgentDef[] = [
  {
    key: "listing-enricher",
    nameFa: "تکمیل‌کننده آگهی",
    nameEn: "Listing Enricher",
    description:
      "آگهی‌های منتشرشده بدون ویژگی‌ها را پیدا کرده و با استفاده از LLM مقادیر ویژگی‌ها (مثل وزن، توان، سال) را از توضیحات استخراج می‌کند. پیشنهادها به‌عنوان AI_EXTRACTION و verified=false ذخیره می‌شوند — تأیید نهایی با ادمین است.",
    taskType: "LISTING_BUILDER",
    config: { maxListingsPerRun: 2 },
  },
  {
    key: "brand-researcher",
    nameFa: "پژوهشگر برند",
    nameEn: "Brand Researcher",
    description:
      "برندهای بدون لوگو یا توضیحات را پیدا می‌کند، با جستجوی تصویر لوگوهای پیشنهادی و با LLM توضیح کوتاه فارسی می‌نویسد. نتایج به‌عنوان پیشنهاد در پایهٔ دانش ثبت می‌شوند — ادمین تأیید می‌کند.",
    taskType: "MARKET_ANALYST",
    config: { maxBrandsPerRun: 2 },
  },
  {
    key: "category-image-gen",
    nameFa: "تولید تصویر دسته",
    nameEn: "Category Image Generator",
    description:
      "دسته‌های بدون imageUrl را پیدا کرده و با هوش مصنوعی تصویر صنعتی تولید می‌کند. تصاویر روی دیسک ذخیره و در category.imageUrl قرار می‌گیرند — ادمین در پنل دسته‌ها بازبینی و در صورت لزوم جایگزین می‌کند.",
    taskType: "LISTING_BUILDER",
    config: { maxCategoriesPerRun: 2 },
  },
  {
    key: "stale-listing-detector",
    nameFa: "آشکارساز آگهی‌های قدیمی",
    nameEn: "Stale Listing Detector",
    description:
      "آگهی‌های منتشرشده‌ای که بیش از ۶۰ روز به‌روز نشده‌اند را پیدا کرده و در گزارش و لاگ ممیزی علامت می‌زند تا ادمین برای به‌روزرسانی یا منقضی‌سازی آن‌ها تصمیم بگیرد.",
    taskType: "MODERATION",
    config: { staleDays: 60 },
  },
  {
    key: "moderation-agent",
    nameFa: "نظارت‌گر محتوا",
    nameEn: "Content Moderation Agent",
    description:
      "آگهی‌های منتشرشده را با هوش مصنوعی اسکن می‌کند و موارد مشکوک (اسپم، آگهی جعلی، قیمت مشکوک، تکراری، محتوای توهین‌آمیز، سوءاستفاده از برند) را علامت می‌زند. آگهی‌های پرمخاطره به‌صورت خودکار به PENDING تبدیل می‌شوند تا ادمین بازبینی کند — اصل ۸ HBR-1.0.",
    taskType: "MODERATION",
    config: { maxListingsPerRun: 20 },
  },
];

/**
 * Idempotent — ensures the 5 built-in agent rows exist in the DB
 * (creates them if missing, does NOT touch existing rows on
 * re-runs). Safe to call on every cold start.
 */
let ensurePromise: Promise<void> | null = null;
export function ensureBuiltInAgents(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = doEnsureBuiltInAgents().catch((err) => {
      console.error("[ai-agents] ensureBuiltInAgents failed:", err);
      // Reset so a future call can retry.
      ensurePromise = null;
    });
  }
  return ensurePromise;
}

async function doEnsureBuiltInAgents(): Promise<void> {
  for (const def of BUILT_IN_AGENTS) {
    try {
      const existing = await db.aIAgent.findUnique({ where: { key: def.key } });
      if (!existing) {
        await db.aIAgent.create({
          data: {
            key: def.key,
            nameFa: def.nameFa,
            nameEn: def.nameEn,
            description: def.description,
            taskType: def.taskType,
            config: def.config ? JSON.stringify(def.config) : null,
            active: true,
          },
        });
      }
    } catch (err) {
      console.error(`[ai-agents] failed to ensure agent ${def.key}:`, err);
    }
  }
}

/* ============================================================
   Built-in runners.
   Each runner is defensive — wrapped in try/catch — so AI / DB
   failures become part of the result summary, never an exception.
   ============================================================ */

function parseAgentConfig(agent: AIAgent): any {
  try {
    if (!agent.config) return {};
    return JSON.parse(agent.config) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/* ── 1. listing-enricher ──────────────────────────────────── */
async function listingEnricherRunner(agent: AIAgent): Promise<AgentRunResult> {
  const cfg = parseAgentConfig(agent);
  const maxListings =
    typeof cfg.maxListingsPerRun === "number" && cfg.maxListingsPerRun > 0
      ? Math.min(10, cfg.maxListingsPerRun)
      : 2;

  // Find PUBLISHED listings that have a description but no attribute values.
  const listings = await db.listing.findMany({
    where: {
      status: "PUBLISHED",
      description: { not: null },
      attributeValues: { none: {} },
    },
    take: maxListings,
    select: {
      id: true,
      title: true,
      description: true,
      categoryId: true,
      brandId: true,
    },
  });

  if (listings.length === 0) {
    return {
      ok: true,
      summary: "هیچ آگهی بدون ویژگی یافت نشد — همهٔ آگهی‌ها تکمیل‌اند.",
    };
  }

  // Determine candidate attribute keys to extract from description.
  // We target the small set of high-value, commonly-mentioned specs.
  const ATTR_KEYS = [
    "operating_weight",
    "engine_power",
    "bucket_capacity",
    "operating_hours",
    "manufacture_year",
  ];
  const attrDefs = await db.attributeDefinition.findMany({
    where: { key: { in: ATTR_KEYS } },
    select: { id: true, key: true, name: true, unit: true, type: true },
  });
  const attrByKey = new Map(
    attrDefs
      .filter((a) => a.key !== null)
      .map((a) => [a.key as string, a]),
  );

  let enriched = 0;
  let failed = 0;
  const errors: string[] = [];

  // Lazy-load ZAI so the module imports cleanly even if the SDK
  // is not used (e.g. in tests).
  let zai: any = null;
  try {
    const ZAIModule = await import("z-ai-web-dev-sdk");
    const ZAI = (ZAIModule as any).default ?? ZAIModule;
    zai = await ZAI.create();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      summary: `سرویس هوش مصنوعی در دسترس نیست — اجرای ایجنت متوقف شد.`,
      error: msg,
      details: { listingsFound: listings.length },
    };
  }

  for (const listing of listings) {
    try {
      const prompt = `You are HEAVIX listing attribute extractor. From the following Persian heavy-machinery listing description, extract these fields as a JSON object (omit any field you cannot confidently identify):
{
  "operating_weight": <number in tons>,
  "engine_power": <number in kW>,
  "bucket_capacity": <number in m³>,
  "operating_hours": <integer>,
  "manufacture_year": <integer 4-digit>
}
Return ONLY the JSON, no prose.

Description:
"""
${(listing.description ?? "").slice(0, 1500)}
"""`;

      const completion = await zai.chat.completions.create({
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: listing.title || "extract" },
        ],
        thinking: { type: "disabled" },
      });
      const raw = completion?.choices?.[0]?.message?.content ?? "";
      const jsonStr = raw.replace(/```json|```/g, "").trim();
      const start = jsonStr.indexOf("{");
      const end = jsonStr.lastIndexOf("}");
      const extracted: Record<string, number> =
        start >= 0 && end > start
          ? JSON.parse(jsonStr.slice(start, end + 1))
          : {};

      let addedForThisListing = 0;
      for (const [key, value] of Object.entries(extracted)) {
        if (typeof value !== "number" || !Number.isFinite(value)) continue;
        const attr = attrByKey.get(key);
        if (!attr) continue;

        // AI SUGGESTS — write as AI_EXTRACTION, verified=false.
        // The unique [listingId, attributeId] constraint means a
        // re-run on the same listing will conflict — skip in that case.
        try {
          await db.listingAttributeValue.create({
            data: {
              listingId: listing.id,
              attributeId: attr.id,
              numberValue: value,
              unit: attr.unit ?? null,
              sourceType: "AI_EXTRACTION",
              confidence: 0.7,
              sourceReference: "ai-agent:listing-enricher",
              verifiedAt: null,
              verifiedBy: null,
            },
          });
          addedForThisListing++;
        } catch {
          /* already exists — skip */
        }
      }

      if (addedForThisListing > 0) enriched++;
    } catch (err: unknown) {
      failed++;
      errors.push(
        `${listing.title}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  return {
    ok: true,
    summary: `از ${listings.length} آگهی بدون ویژگی، ${enriched} آگهی با پیشنهادهای AI تکمیل شد${
      failed > 0 ? ` (${failed} مورد با خطا)` : ""
    }.`,
    details: { enriched, failed, errors: errors.slice(0, 5) },
  };
}

/* ── 2. brand-researcher ──────────────────────────────────── */
async function brandResearcherRunner(agent: AIAgent): Promise<AgentRunResult> {
  const cfg = parseAgentConfig(agent);
  const maxBrands =
    typeof cfg.maxBrandsPerRun === "number" && cfg.maxBrandsPerRun > 0
      ? Math.min(10, cfg.maxBrandsPerRun)
      : 2;

  // Find active brands missing either logo or description.
  const brands = await db.brand.findMany({
    where: {
      active: true,
      OR: [{ logoUrl: null }, { description: null }],
    },
    take: maxBrands,
    select: { id: true, name: true, nameEn: true, slug: true },
  });

  if (brands.length === 0) {
    return {
      ok: true,
      summary: "همهٔ برندها لوگو و توضیحات دارند.",
    };
  }

  let zai: any = null;
  try {
    const ZAIModule = await import("z-ai-web-dev-sdk");
    const ZAI = (ZAIModule as any).default ?? ZAIModule;
    zai = await ZAI.create();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      summary: `سرویس هوش مصنوعی در دسترس نیست.`,
      error: msg,
      details: { brandsFound: brands.length },
    };
  }

  let processed = 0;
  let logosFound = 0;
  let descriptionsDrafted = 0;
  const errors: string[] = [];

  for (const brand of brands) {
    try {
      // 1. Image-search for logo candidates (admin approves later).
      let logoCandidates: string[] = [];
      try {
        const resp = await zai.images.search.create({
          query: `${brand.nameEn ?? brand.name} official logo transparent png`,
          count: 3,
          rank: true,
        });
        const results = Array.isArray(resp?.results) ? resp.results : [];
        logoCandidates = results
          .map((r: any) => r?.original_url ?? r?.url ?? "")
          .filter((u: string) => typeof u === "string" && u.length > 0);
      } catch (err: unknown) {
        errors.push(
          `logo-search ${brand.name}: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
      if (logoCandidates.length > 0) logosFound++;

      // 2. LLM drafts a short Persian description.
      let description: string | null = null;
      try {
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "You are HEAVIX brand writer. Write ONE short Persian paragraph (max 60 words) describing the industrial brand. Factual tone. Do NOT invent financials or awards. Return only the paragraph, no preamble.",
            },
            {
              role: "user",
              content: `Brand: ${brand.name}${brand.nameEn ? ` (${brand.nameEn})` : ""}`,
            },
          ],
          thinking: { type: "disabled" },
        });
        description =
          (completion?.choices?.[0]?.message?.content ?? "").trim() || null;
        if (description) descriptionsDrafted++;
      } catch (err: unknown) {
        errors.push(
          `description ${brand.name}: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }

      // 3. Store as KnowledgeEntry suggestions (source=AI,
      //    aiSuggested=true, verified=false). Admin will review and
      //    either copy the description to Brand.description or
      //    dismiss the suggestion.
      try {
        if (description) {
          await db.knowledgeEntry.upsert({
            where: {
              entityType_entityId_key: {
                entityType: "BRAND",
                entityId: brand.id,
                key: "ai_description_suggestion",
              },
            },
            create: {
              entityType: "BRAND",
              entityId: brand.id,
              title: brand.name,
              key: "ai_description_suggestion",
              value: description,
              source: "AI",
              aiSuggested: true,
              verified: false,
            },
            update: {
              value: description,
              source: "AI",
              aiSuggested: true,
              verified: false,
            },
          });
        }
        if (logoCandidates.length > 0) {
          await db.knowledgeEntry.upsert({
            where: {
              entityType_entityId_key: {
                entityType: "BRAND",
                entityId: brand.id,
                key: "ai_logo_candidates",
              },
            },
            create: {
              entityType: "BRAND",
              entityId: brand.id,
              title: brand.name,
              key: "ai_logo_candidates",
              value: JSON.stringify(logoCandidates),
              source: "AI",
              aiSuggested: true,
              verified: false,
            },
            update: {
              value: JSON.stringify(logoCandidates),
              source: "AI",
              aiSuggested: true,
              verified: false,
            },
          });
        }
      } catch (err: unknown) {
        errors.push(
          `save ${brand.name}: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }

      processed++;
    } catch (err: unknown) {
      errors.push(
        `${brand.name}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  return {
    ok: true,
    summary: `${processed} برند پردازش شد — ${logosFound} لوگوی پیشنهادی، ${descriptionsDrafted} توضیح پیشنهادی. پیشنهادها در پایهٔ دانش با aiSuggested=true ثبت شدند.`,
    details: {
      processed,
      logosFound,
      descriptionsDrafted,
      errors: errors.slice(0, 5),
    },
  };
}

/* ── 3. category-image-gen ────────────────────────────────── */
async function categoryImageGenRunner(agent: AIAgent): Promise<AgentRunResult> {
  const cfg = parseAgentConfig(agent);
  const maxCategories =
    typeof cfg.maxCategoriesPerRun === "number" && cfg.maxCategoriesPerRun > 0
      ? Math.min(10, cfg.maxCategoriesPerRun)
      : 2;

  const categories = await db.category.findMany({
    where: { active: true, imageUrl: null },
    take: maxCategories,
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      description: true,
      domain: true,
    },
  });

  if (categories.length === 0) {
    return { ok: true, summary: "همهٔ دسته‌ها imageUrl دارند." };
  }

  let zai: any = null;
  try {
    const ZAIModule = await import("z-ai-web-dev-sdk");
    const ZAI = (ZAIModule as any).default ?? ZAIModule;
    zai = await ZAI.create();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      summary: `سرویس هوش مصنوعی تصویرسازی در دسترس نیست.`,
      error: msg,
      details: { categoriesFound: categories.length },
    };
  }

  // Inline the prompt-building logic from
  // /api/admin/categories/[id]/generate-image so this agent is
  // self-contained (no HTTP roundtrip needed).
  function buildPrompt(c: {
    name: string;
    nameEn: string | null;
    description: string | null;
    domain: string | null;
  }): string {
    const subject = c.nameEn?.trim() || c.name?.trim() || "industrial machinery";
    const desc = (c.description ?? "").trim();
    const domainHint = (() => {
      switch ((c.domain ?? "").toUpperCase()) {
        case "MACHINE":
          return "heavy machinery on a construction site";
        case "VEHICLE":
          return "commercial truck or off-highway vehicle";
        case "PART":
          return "industrial spare part, macro product photography";
        case "ATTACHMENT":
          return "industrial attachment accessory for heavy equipment";
        case "MINERAL":
          return "mined mineral raw material, geological close-up";
        case "MATERIAL":
          return "bulk industrial material on site";
        default:
          return "heavy industrial equipment at work";
      }
    })();
    const base = `Professional industrial photography of ${subject}, ${domainHint}`;
    const tail =
      ", golden hour lighting, sharp focus, high detail, clean composition, professional commercial photograph, wide angle, no text, no watermark";
    if (desc) {
      const d = desc.replace(/\s+/g, " ").slice(0, 180);
      return `${base}. Context: ${d}.${tail}`;
    }
    return `${base}.${tail}`;
  }

  // Import fs / path / crypto lazily — only when actually generating.
  const path = await import("node:path");
  const fs = await import("node:fs/promises");
  const crypto = await import("node:crypto");

  let generated = 0;
  let failed = 0;
  const errors: string[] = [];
  const generatedUrls: string[] = [];

  for (const cat of categories) {
    try {
      const prompt = buildPrompt(cat);
      const resp = await zai.images.generations.create({
        prompt,
        size: "1344x768",
      });
      const base64 = resp?.data?.[0]?.base64 ?? null;
      if (!base64) {
        failed++;
        continue;
      }

      const slugPart =
        (cat.slug || "category")
          .toString()
          .replace(/[^\w\-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60) || "category";
      const rand = crypto.randomBytes(4).toString("hex");
      const filename = `${slugPart}-${rand}.png`;
      const dirAbs = path.join(
        process.cwd(),
        "public",
        "uploads",
        "categories",
      );
      await fs.mkdir(dirAbs, { recursive: true });
      await fs.writeFile(
        path.join(dirAbs, filename),
        Buffer.from(base64, "base64"),
      );
      const imageUrl = `/uploads/categories/${filename}`;

      // AI SUGGESTS — set the imageUrl directly. Admin reviews via
      // the category admin UI and can replace / remove it.
      await db.category.update({
        where: { id: cat.id },
        data: { imageUrl },
      });
      generated++;
      generatedUrls.push(imageUrl);
    } catch (err: unknown) {
      failed++;
      errors.push(
        `${cat.name}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  return {
    ok: true,
    summary: `${generated} تصویر برای دسته‌های بدون تصویر تولید شد${
      failed > 0 ? ` (${failed} مورد با خطا)` : ""
    }. ادمین باید تصاویر را در پنل دسته‌ها بازبینی کند.`,
    details: {
      generated,
      failed,
      urls: generatedUrls,
      errors: errors.slice(0, 5),
    },
  };
}

/* ── 4. stale-listing-detector ────────────────────────────── */
async function staleListingDetectorRunner(
  agent: AIAgent,
): Promise<AgentRunResult> {
  const cfg = parseAgentConfig(agent);
  const staleDays =
    typeof cfg.staleDays === "number" && cfg.staleDays > 0
      ? Math.min(365, cfg.staleDays)
      : 60;

  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
  const stale = await db.listing.findMany({
    where: {
      status: "PUBLISHED",
      updatedAt: { lt: cutoff },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      updatedAt: true,
      sellerPhone: true,
    },
    take: 200,
    orderBy: { updatedAt: "asc" },
  });

  if (stale.length === 0) {
    return {
      ok: true,
      summary: `هیچ آگهی قدیمی‌تر از ${staleDays} روز یافت نشد.`,
    };
  }

  // Log a single batched audit entry so the ops team can see the
  // list of stale listings in the audit log. We don't change the
  // listing status — that decision is the admin's (HBR-1.0 law 8).
  await logAudit({
    actorId: null,
    actorType: "AI",
    action: "listing.stale_flag",
    entityType: "Listing",
    entityId: null,
    after: {
      staleDays,
      count: stale.length,
      listingIds: stale.map((l) => l.id),
      sample: stale.slice(0, 10).map((l) => ({
        id: l.id,
        title: l.title,
        updatedAt: l.updatedAt?.toISOString(),
      })),
    },
    reason: `آشکارسازی آگهی‌های قدیمی‌تر از ${staleDays} روز`,
  });

  return {
    ok: true,
    summary: `${stale.length} آگهی قدیمی‌تر از ${staleDays} روز پیدا شد و در لاگ ممیزی ثبت شد.`,
    details: {
      staleDays,
      count: stale.length,
      oldestUpdatedAt: stale[0]?.updatedAt ?? null,
    },
  };
}

/* ── 5. moderation-agent ──────────────────────────────────── */
/* P1-3 — runs the moderation batch (LLM-based content scan) on
   PUBLISHED listings that haven't been scanned in the last 7 days.
   AI SUGGESTS — high-risk listings are flagged for human review;
   the final APPROVE / REJECT decision is always the admin's
   (HBR-1.0 law 8 / AI Untrusted). */
async function moderationAgentRunner(agent: AIAgent): Promise<AgentRunResult> {
  const cfg = parseAgentConfig(agent);
  const limit =
    typeof cfg.maxListingsPerRun === "number" && cfg.maxListingsPerRun > 0
      ? Math.min(100, cfg.maxListingsPerRun)
      : 20;

  try {
    const result = await runModerationBatch(limit);
    return {
      ok: true,
      summary: `اسکن محتوا انجام شد — ${result.scanned} آگهی اسکن شد${
        result.flagged > 0
          ? `، ${result.flagged} آگهی پرچم شد (نیازمند بازبینی ادمین)`
          : ""
      }${result.approved > 0 ? `، ${result.approved} آگهی پاک تأیید شد` : ""}${
        result.errors > 0 ? ` (${result.errors} مورد با خطا)` : ""
      }.`,
      details: result,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      summary: `اسکن محتوا با خطا مواجه شد: ${msg}`,
      error: msg,
    };
  }
}

/* ── Register built-in runners (idempotent) ───────────────── */
let registered = false;
export function registerBuiltInAgentRunners(): void {
  if (registered) return;
  registered = true;
  registerAgent("listing-enricher", listingEnricherRunner);
  registerAgent("brand-researcher", brandResearcherRunner);
  registerAgent("category-image-gen", categoryImageGenRunner);
  registerAgent("stale-listing-detector", staleListingDetectorRunner);
  registerAgent("moderation-agent", moderationAgentRunner);
}

registerBuiltInAgentRunners();
