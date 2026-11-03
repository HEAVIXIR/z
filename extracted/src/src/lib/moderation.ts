import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/* ============================================================
   HEAVIX — Moderation Loop (P1-3)
   ------------------------------------------------------------
   HEAVIX-P0-IMPLEMENTATION-PLAN.md P1-3 (Moderation Loop)
   HBR-1.0 law 8 — AI SUGGESTS, admin APPROVES.

   Two entry points:
     • moderateListing(listingId) — LLM scan of one listing.
       Returns risk score (0..1) + flagged issues array +
       recommendation (APPROVE / REVIEW / REJECT). Does NOT
       mutate the listing. The caller decides whether to write a
       ModerationLog row (the batch helper does) or surface the
       result to an admin.

     • runModerationBatch(limit?) — find PUBLISHED listings that
       have not been scanned in the last 7 days, run
       `moderateListing` on each, persist a ModerationLog row
       (action=AI_SCAN), and apply the risk policy:
         - riskScore > 0.7  → listing.status = "PENDING" (flag
                              for human review).
         - riskScore < 0.3  → ModerationLog action=APPROVE
                              (auto-clear — does NOT change
                              listing.status; just records a
                              clean scan).
         - in between        → ModerationLog action=AI_SCAN
                              (no status change; the listing
                              remains visible but the scan is
                              on the record for future audits).

   z-ai-web-dev-sdk is server-only. This module is server-only.
   ============================================================ */

export interface ModerationResult {
  riskScore: number; // 0..1
  flaggedIssues: string[];
  recommendation: "APPROVE" | "REVIEW" | "REJECT";
  rationale?: string;
}

export interface ModerationBatchResult {
  scanned: number;
  flagged: number;
  approved: number;
  errors: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Scan a single listing with the LLM and return a moderation
 * verdict. Does NOT mutate the listing or write a ModerationLog
 * row — the caller is responsible for persistence (the batch
 * helper does both).
 *
 * The LLM is asked to check for:
 *   spam, fake listing, suspicious price, duplicate,
 *   offensive content, brand misuse
 *
 * Failures (LLM unavailable / parse error) return a SAFE-DEFAULT
 * verdict: riskScore=0.5, recommendation=REVIEW, flaggedIssues
 * contains the failure reason — never throws, never blocks the
 * batch loop.
 */
export async function moderateListing(
  listingId: string,
): Promise<ModerationResult> {
  try {
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        description: true,
        shortDesc: true,
        price: true,
        priceType: true,
        condition: true,
        city: true,
        province: true,
        year: true,
        workingHours: true,
        sellerName: true,
        sellerPhone: true,
        createdAt: true,
        brand: { select: { name: true, nameEn: true, slug: true } },
        category: { select: { name: true, slug: true } },
        images: { select: { url: true, alt: true }, take: 5 },
      },
    });

    if (!listing) {
      return {
        riskScore: 0,
        flaggedIssues: [],
        recommendation: "APPROVE",
        rationale: "Listing not found — nothing to moderate.",
      };
    }

    // Lazy-load ZAI so the module imports cleanly even if the SDK
    // is never used (e.g. tests that mock the LLM).
    let zai: any = null;
    try {
      const ZAIModule = await import("z-ai-web-dev-sdk");
      const ZAI = (ZAIModule as any).default ?? ZAIModule;
      zai = await ZAI.create();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // SAFE-DEFAULT — surface as REVIEW so the operator can look.
      return {
        riskScore: 0.5,
        flaggedIssues: ["AI_UNAVAILABLE"],
        recommendation: "REVIEW",
        rationale: `AI service unavailable: ${msg}`,
      };
    }

    const prompt = `You are HEAVIX content moderation. Score the listing below for marketplace safety.
Return ONLY a JSON object with this exact shape:
{
  "riskScore": <number 0..1>,
  "flaggedIssues": [<string>...],
  "recommendation": "APPROVE" | "REVIEW" | "REJECT",
  "rationale": "<short Persian or English explanation>"
}

Check for ALL of these issues. Each detected issue MUST appear in flaggedIssues using one of these canonical keys:
- SPAM                — promotional keywords / URL spam / repeated phrases
- FAKE_LISTING        — title/description mismatch, implausible combination of brand+model+year
- SUSPICIOUS_PRICE    — price is null with no CALL_FOR_PRICE rationale, or implausibly low/high vs the category norm
- DUPLICATE           — same title repeated, copy-pasted boilerplate, "کپی" markers
- OFFENSIVE_CONTENT   — profanity, discrimination, political/religious provocation
- BRAND_MISUSE        — brand name wrong vs category (e.g. "Caterpillar" on a passenger car), or spoofed/misspelled brand
- CONTACT_INFO_LEAK   — phone number inside the description (should be in sellerPhone)
- MISLEADING_PHOTOS   — image URLs look like stock photos or unrelated to the category

Recommendation rules:
- riskScore < 0.3 → APPROVE
- 0.3 ≤ riskScore ≤ 0.7 → REVIEW
- riskScore > 0.7 → REJECT

Return ONLY the JSON — no prose, no markdown fences.

Listing to moderate:
"""
Title: ${listing.title}
Short desc: ${listing.shortDesc ?? "(none)"}
Description: ${(listing.description ?? "").slice(0, 2000)}
Price: ${listing.price ? listing.price.toString() + " IRR" : "(null)"}
Price type: ${listing.priceType}
Condition: ${listing.condition ?? "(none)"}
Location: ${listing.city ?? "?"}, ${listing.province ?? "?"}
Year: ${listing.year ?? "?"}
Working hours: ${listing.workingHours ?? "?"}
Brand: ${listing.brand?.name ?? "?"} (${listing.brand?.nameEn ?? "?"})
Category: ${listing.category?.name ?? "?"}
Images: ${listing.images.length} image(s) — first URL: ${listing.images[0]?.url ?? "(none)"}
Seller: ${listing.sellerName ?? "?"} / ${listing.sellerPhone ?? "?"}
Created at: ${listing.createdAt.toISOString()}
"""`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Moderate this listing." },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) {
      return {
        riskScore: 0.5,
        flaggedIssues: ["AI_PARSE_ERROR"],
        recommendation: "REVIEW",
        rationale: "LLM response was not valid JSON.",
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        riskScore: 0.5,
        flaggedIssues: ["AI_PARSE_ERROR"],
        recommendation: "REVIEW",
        rationale: `JSON parse failed: ${msg}`,
      };
    }

    let risk = Number(parsed.riskScore);
    if (!Number.isFinite(risk)) risk = 0.5;
    risk = Math.max(0, Math.min(1, risk));

    const flaggedIssues = Array.isArray(parsed.flaggedIssues)
      ? parsed.flaggedIssues
          .map((x: any) => String(x))
          .filter((x: string) => x.length > 0)
          .slice(0, 10)
      : [];

    let recommendation: ModerationResult["recommendation"] = "REVIEW";
    const recRaw = String(parsed.recommendation ?? "").toUpperCase();
    if (recRaw === "APPROVE" || recRaw === "REJECT") recommendation = recRaw;
    // Override with the rule if the LLM mis-stated it.
    if (risk < 0.3) recommendation = "APPROVE";
    else if (risk > 0.7) recommendation = "REJECT";
    else recommendation = "REVIEW";

    return {
      riskScore: risk,
      flaggedIssues,
      recommendation,
      rationale:
        typeof parsed.rationale === "string"
          ? parsed.rationale.slice(0, 500)
          : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      riskScore: 0.5,
      flaggedIssues: ["MODERATION_ERROR"],
      recommendation: "REVIEW",
      rationale: `moderateListing threw: ${msg}`,
    };
  }
}

/**
 * Find PUBLISHED listings without a recent (last 7 days)
 * ModerationLog entry, run `moderateListing` on each, and persist
 * the result. Applies the risk policy described in the file
 * header. Returns aggregate counts for the admin UI / audit log.
 *
 * Never throws — every per-listing error is captured into the
 * `errors` count.
 */
export async function runModerationBatch(
  limit?: number,
): Promise<ModerationBatchResult> {
  const max =
    typeof limit === "number" && limit > 0 ? Math.min(100, Math.floor(limit)) : 20;

  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);

  // Listings that have NOT been scanned in the last 7 days.
  // We find this by checking that no ModerationLog with action
  // AI_SCAN + createdAt >= cutoff exists for that listing.
  const listingsToScan = await db.listing.findMany({
    where: {
      status: "PUBLISHED",
      moderationLogs: {
        none: {
          action: "AI_SCAN",
          createdAt: { gte: cutoff },
        },
      },
    },
    select: { id: true, title: true },
    take: max,
    orderBy: { createdAt: "asc" },
  });

  let scanned = 0;
  let flagged = 0;
  let approved = 0;
  let errors = 0;

  for (const l of listingsToScan) {
    try {
      const verdict = await moderateListing(l.id);

      // Persist a ModerationLog row for every scan — this becomes
      // the audit trail + drives the "scanned in last 7 days"
      // filter on the next batch run.
      await db.moderationLog.create({
        data: {
          listingId: l.id,
          action: "AI_SCAN",
          reason: verdict.rationale ?? null,
          riskScore: verdict.riskScore,
          flaggedIssues:
            verdict.flaggedIssues.length > 0
              ? JSON.stringify(verdict.flaggedIssues)
              : null,
        },
      });

      scanned++;

      if (verdict.riskScore > 0.7) {
        // Flag for human review — set listing status to PENDING so
        // it disappears from the public feed until an admin looks.
        await db.listing.update({
          where: { id: l.id },
          data: { status: "PENDING" },
        });
        // Also write a FLAG entry so the moderation queue surfaces it.
        await db.moderationLog.create({
          data: {
            listingId: l.id,
            action: "FLAG",
            reason: `Auto-flagged by AI scan — risk ${verdict.riskScore.toFixed(2)}`,
            riskScore: verdict.riskScore,
            flaggedIssues: JSON.stringify(verdict.flaggedIssues),
          },
        });
        flagged++;
      } else if (verdict.riskScore < 0.3) {
        // Clean scan — record an APPROVE log so the moderation
        // queue knows this listing was scanned and cleared.
        await db.moderationLog.create({
          data: {
            listingId: l.id,
            action: "APPROVE",
            reason: "Auto-approved by AI scan — risk below threshold.",
            riskScore: verdict.riskScore,
            flaggedIssues: null,
          },
        });
        approved++;
      }
      // REVIEW band (0.3–0.7) — the AI_SCAN log is enough; the
      // listing stays PUBLISHED but the scan is on the record.
    } catch (err: unknown) {
      errors++;
      console.warn(
        `[moderation] failed for listing ${l.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  await logAudit({
    actorId: null,
    actorType: "AI",
    action: "moderation.batch",
    entityType: "ModerationLog",
    entityId: null,
    after: { scanned, flagged, approved, errors, limit: max },
    reason: `اسکن دسته‌ای محتوا — ${scanned} آگهی اسکن شد (${flagged} پرچم، ${approved} تأیید، ${errors} خطا).`,
  });

  return { scanned, flagged, approved, errors };
}
