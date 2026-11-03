import { db } from "@/lib/db";
import ModerationAdminClient from "./ModerationAdminClient";

export const dynamic = "force-dynamic";

/* ============================================================
   /admin/moderation — Moderation loop admin page (P1-3).
   ------------------------------------------------------------
   Server-rendered shell that fetches the initial flagged-list
   snapshot + stats, then hands off to the client component for
   interactivity (scan button + approve/reject actions).
   ============================================================ */

type FlaggedItem = {
  logId: string;
  action: string;
  reason: string | null;
  riskScore: number | null;
  flaggedIssues: string[];
  createdAt: string;
  listing: {
    id: string;
    title: string;
    slug: string;
    status: string;
    price: string | null;
    createdAt: string;
    brandName: string | null;
    categoryName: string | null;
  } | null;
};

export default async function ModerationAdminPage() {
  // Stats
  const [scanCount, flagCount, approveCount, rejectCount] = await Promise.all([
    db.moderationLog.count({ where: { action: "AI_SCAN" } }),
    db.moderationLog.count({ where: { action: "FLAG" } }),
    db.moderationLog.count({ where: { action: "APPROVE" } }),
    db.moderationLog.count({ where: { action: "REJECT" } }),
  ]);

  // Flagged-list snapshot — same query as the GET endpoint so the
  // initial SSR paint matches what the client refreshes to.
  const flaggedLogs = await db.moderationLog.findMany({
    where: { riskScore: { gt: 0.5 } },
    orderBy: { createdAt: "desc" },
    take: 50,
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
  const flagged: FlaggedItem[] = [];
  for (const row of flaggedLogs) {
    const lid = row.listing?.id ?? row.listingId;
    if (seenListingIds.has(lid)) continue;
    seenListingIds.add(lid);
    flagged.push({
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
            price: row.listing.price ? row.listing.price.toString() : null,
            createdAt: row.listing.createdAt.toISOString(),
            brandName: row.listing.brand?.name ?? null,
            categoryName: row.listing.category?.name ?? null,
          }
        : null,
    });
  }

  return (
    <ModerationAdminClient
      initialFlagged={flagged}
      initialStats={{
        scanned: scanCount,
        flagged: flagCount,
        approved: approveCount,
        rejected: rejectCount,
      }}
    />
  );
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
