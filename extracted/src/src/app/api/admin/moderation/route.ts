import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { runModerationBatch } from "@/lib/moderation";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/moderation — moderation loop control (P1-3).
   ------------------------------------------------------------
   GET  — list flagged listings (riskScore > 0.5 in their latest
          ModerationLog) + the moderation stats summary.

   POST — three actions, dispatched by `body.action`:
     • { action: "scan", limit? }      — run moderation batch.
     • { action: "approve", listingId, reason? }
                                        — human approves a flagged listing.
     • { action: "reject", listingId, reason? }
                                        — human rejects a flagged listing
                                          (sets status to REJECTED).

   Admin-only. Uses the dual-path authorization pattern: legacy
   admin-cookie OR user session with ADMIN role.
   ============================================================ */

async function authorizeAdmin(): Promise<boolean> {
  if (await isAuthenticated()) return true;
  const user = await getCurrentUser();
  if (!user) return false;
  return isAdmin(user.id);
}

export async function GET(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const limit = Math.min(
      200,
      Math.max(1, Number(url.searchParams.get("limit")) || 50),
    );

    // Stats: total scans, flagged, approved, rejected across all time.
    const [scanCount, flagCount, approveCount, rejectCount] = await Promise.all([
      db.moderationLog.count({ where: { action: "AI_SCAN" } }),
      db.moderationLog.count({ where: { action: "FLAG" } }),
      db.moderationLog.count({ where: { action: "APPROVE" } }),
      db.moderationLog.count({ where: { action: "REJECT" } }),
    ]);

    // Flagged listings — surface the most-recent FLAG entry per listing
    // plus the listing itself (title, status, brand, category, riskScore).
    // We treat "flagged" as: has ANY ModerationLog with riskScore > 0.5
    // (FLAG or AI_SCAN band) that hasn't been subsequently APPROVE/REJECT'd.
    const flaggedLogs = await db.moderationLog.findMany({
      where: { riskScore: { gt: 0.5 } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            price: true,
            createdAt: true,
            brand: { select: { name: true } },
            category: { select: { name: true } },
          },
        },
      },
    });

    // De-duplicate by listingId — keep only the latest log per listing.
    const seenListingIds = new Set<string>();
    const flagged = flaggedLogs.filter((row) => {
      const lid = row.listing?.id ?? row.listingId;
      if (seenListingIds.has(lid)) return false;
      seenListingIds.add(lid);
      return true;
    });

    return NextResponse.json({
      ok: true,
      stats: {
        scanned: scanCount,
        flagged: flagCount,
        approved: approveCount,
        rejected: rejectCount,
      },
      flagged: flagged.map((row) => ({
        logId: row.id,
        action: row.action,
        reason: row.reason,
        riskScore: row.riskScore,
        flaggedIssues: row.flaggedIssues
          ? safeParseJsonArray(row.flaggedIssues)
          : [],
        createdAt: row.createdAt.toISOString(),
        listing: row.listing
          ? {
              id: row.listing.id,
              title: row.listing.title,
              slug: row.listing.slug,
              status: row.listing.status,
              price: row.listing.price
                ? row.listing.price.toString()
                : null,
              createdAt: row.listing.createdAt.toISOString(),
              brandName: row.listing.brand?.name ?? null,
              categoryName: row.listing.category?.name ?? null,
            }
          : null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const action = String((body as any).action ?? "").trim().toLowerCase();

    /* ── action: scan ── */
    if (action === "scan") {
      const limitRaw = (body as any).limit;
      const limit =
        typeof limitRaw === "number" && limitRaw > 0
          ? Math.min(100, Math.floor(limitRaw))
          : undefined;
      const result = await runModerationBatch(limit);

      await logAudit({
        actorId: null,
        actorType: "ADMIN",
        action: "moderation.scan_run",
        entityType: "ModerationLog",
        entityId: null,
        after: result,
        reason: `اجرای دستی اسکن دسته‌ای محتوا — ${result.scanned} آگهی اسکن شد.`,
      });

      return NextResponse.json({ ok: true, ...result });
    }

    /* ── action: approve | reject ── */
    if (action === "approve" || action === "reject") {
      const listingId = String((body as any).listingId ?? "").trim();
      const reason =
        typeof (body as any).reason === "string"
          ? String((body as any).reason).trim().slice(0, 1000) || null
          : null;

      if (!listingId) {
        return NextResponse.json(
          { error: "listingId is required" },
          { status: 400 },
        );
      }

      const listing = await db.listing.findUnique({
        where: { id: listingId },
        select: { id: true, title: true, status: true, slug: true },
      });
      if (!listing) {
        return NextResponse.json(
          { error: "Listing not found" },
          { status: 404 },
        );
      }

      // Persist the human-review ModerationLog row.
      const log = await db.moderationLog.create({
        data: {
          listingId,
          action: action.toUpperCase(), // APPROVE | REJECT
          reason: reason ?? (action === "approve"
            ? "تأیید توسط ادمین"
            : "رد توسط ادمین"),
          riskScore: null, // human review — no AI score
          flaggedIssues: null,
        },
      });

      // Apply the status transition:
      //  approve → PUBLISHED (re-publish if it was flagged to PENDING)
      //  reject  → REJECTED
      const newStatus = action === "approve" ? "PUBLISHED" : "REJECTED";
      await db.listing.update({
        where: { id: listingId },
        data: { status: newStatus },
      });

      const user = await getCurrentUser().catch(() => null);

      await logAudit({
        actorId: user?.id ?? null,
        actorType: "ADMIN",
        action: `moderation.${action}`,
        entityType: "Listing",
        entityId: listingId,
        before: { status: listing.status },
        after: { status: newStatus, reason, logId: log.id },
        reason: `${action === "approve" ? "تأیید" : "رد"} آگهی «${listing.title}» توسط ادمین.`,
      });

      return NextResponse.json({
        ok: true,
        logId: log.id,
        listingId,
        newStatus,
      });
    }

    return NextResponse.json(
      { error: `Unknown action "${action}". Use scan | approve | reject.` },
      { status: 400 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

function safeParseJsonArray(s: string): string[] {
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      return parsed.map((x) => String(x)).slice(0, 20);
    }
    return [];
  } catch {
    return [];
  }
}
