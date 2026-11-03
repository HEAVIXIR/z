import { db } from "@/lib/db";
import { normalizeSearchQuery, buildSearchWhere } from "@/lib/search";
import { logAudit } from "@/lib/audit";

/* ============================================================
   HEAVIX — Alert Matcher (P1-5)
   ------------------------------------------------------------
   HEAVIX-P0-IMPLEMENTATION-PLAN.md P1-5 (Alert Matcher)

   Re-runs every active SavedSearch against the current PUBLISHED
   listing pool. For each saved search:
     • Build the same Prisma `where` clause the public search
       uses (text + category + brand + price range + condition +
       city) — so a "match" is identical to what the user would
       see if they re-ran the search in the UI.
     • Restrict to listings created AFTER lastNotifiedAt — i.e.
       only NEW matches since the previous run.
     • If ≥1 new listing matches, create ONE Notification per
       user (with the count + link to the search) and update
       SavedSearch.lastNotifiedAt + matchCount.

   Returns aggregate counts for the admin UI / audit log.
   Never throws — every per-search error is captured into
   `errors` and the loop continues.
   ============================================================ */

export interface AlertMatchResult {
  matched: number; // total SavedSearch rows that produced ≥1 new match
  notified: number; // total Notifications created
  errors: number;
  scanned: number; // total SavedSearch rows scanned
}

/**
 * Build a Prisma `where` clause for a SavedSearch row, mirroring
 * the public search semantics (text + category + brand + price +
 * condition + city). Returns the where + a flag indicating whether
 * the search had any meaningful criteria.
 */
function buildSavedSearchWhere(
  s: {
    query: string | null;
    categorySlug: string | null;
    brandSlug: string | null;
    minPrice: bigint | null;
    maxPrice: bigint | null;
    condition: string | null;
    city: string | null;
  },
  since: Date | null,
): { where: any; hasCriteria: boolean } {
  const where: any = { status: "PUBLISHED" };

  // Created-after-lastNotifiedAt — only NEW listings.
  if (since) {
    where.createdAt = { gt: since };
  }

  let hasCriteria = false;

  // Text query — normalize + OR across searchable fields.
  if (s.query && s.query.trim()) {
    const q = s.query.trim();
    const textClause = buildSearchWhere(["title", "shortDesc", "description"], q);
    if (textClause) {
      where.OR = textClause.OR;
      hasCriteria = true;
    }
  }

  // Category — by slug OR name contains.
  if (s.categorySlug && s.categorySlug.trim()) {
    const cat = normalizeSearchQuery(s.categorySlug);
    const catClause: any = {
      OR: [
        { category: { slug: cat } },
        { category: { name: { contains: normalizeSearchQuery(cat) } } },
      ],
    };
    where.OR = where.OR ? [...where.OR, ...catClause.OR] : catClause.OR;
    hasCriteria = true;
  }

  // Brand — by slug OR name contains.
  if (s.brandSlug && s.brandSlug.trim()) {
    const b = normalizeSearchQuery(s.brandSlug);
    const brandClause: any = [
      { brand: { slug: b } },
      { brand: { name: { contains: normalizeSearchQuery(b) } } },
      { brand: { nameEn: { contains: normalizeSearchQuery(b) } } },
    ];
    where.OR = where.OR ? [...where.OR, ...brandClause] : brandClause;
    hasCriteria = true;
  }

  // Price range
  if (s.minPrice != null || s.maxPrice != null) {
    const price: any = {};
    if (s.minPrice != null) price.gte = s.minPrice;
    if (s.maxPrice != null) price.lte = s.maxPrice;
    where.price = price;
    hasCriteria = true;
  }

  // Condition — exact match (matches Listing.condition String column).
  if (s.condition && s.condition.trim()) {
    where.condition = s.condition.trim();
    hasCriteria = true;
  }

  // City — contains (normalized) — city names vary in spelling.
  if (s.city && s.city.trim()) {
    where.city = { contains: normalizeSearchQuery(s.city) };
    hasCriteria = true;
  }

  return { where, hasCriteria };
}

/**
 * Run the alert-matcher pass over every active SavedSearch.
 *
 * For each SavedSearch:
 *   1. Build the where clause.
 *   2. Find PUBLISHED listings created AFTER lastNotifiedAt that
 *      match the where.
 *   3. If ≥1 match: create ONE Notification per user (title
 *      "آگهی جدید مطابق جستجوی ذخیره‌شده شما", body with the
 *      count + a deep-link to the search query).
 *   4. Update SavedSearch.lastNotifiedAt = now + matchCount += N.
 *
 * Returns aggregate counts for the admin UI / audit log.
 */
export async function matchSavedSearches(): Promise<AlertMatchResult> {
  const searches = await db.savedSearch.findMany({
    where: { active: true },
    take: 500, // safety cap — a single pass over more than this is
    // better split into separate job runs.
  });

  let scanned = 0;
  let matched = 0;
  let notified = 0;
  let errors = 0;
  const now = new Date();

  for (const s of searches) {
    scanned++;
    try {
      const { where, hasCriteria } = buildSavedSearchWhere(s, s.lastNotifiedAt);
      if (!hasCriteria) {
        // No criteria → can't match anything specific. Skip silently
        // (still update lastNotifiedAt so we don't keep re-evaluating
        // an empty search on every run).
        await db.savedSearch.update({
          where: { id: s.id },
          data: { lastNotifiedAt: now },
        });
        continue;
      }

      // Count new matches — we don't need the rows themselves, just
      // the count + the slug of the first new listing for the deep link.
      const newMatches = await db.listing.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          brand: { select: { name: true } },
        },
        take: 50, // cap so a single wildly-broad search doesn't
        // generate a giant notification list.
        orderBy: { createdAt: "desc" },
      });

      if (newMatches.length === 0) {
        // No new matches — but still bump lastNotifiedAt so the next
        // pass only considers listings created after this point.
        await db.savedSearch.update({
          where: { id: s.id },
          data: { lastNotifiedAt: now },
        });
        continue;
      }

      matched++;
      notified++;

      // Create ONE Notification per user (not per listing — the user
      // gets a digest link, not a flood of toasts).
      if (s.userId) {
        const count = newMatches.length;
        const firstTitle = newMatches[0]?.title ?? "";
        const firstSlug = newMatches[0]?.slug ?? "";
        const link = firstSlug
          ? `/listings/${firstSlug}?from=saved-search`
          : `/listings?q=${encodeURIComponent(s.query ?? "")}`;

        const body =
          count === 1
            ? `آگهی جدید «${firstTitle}» مطابق جستجوی ذخیره‌شدهٔ «${s.name}» یافت شد.`
            : `${count.toLocaleString("fa-IR")} آگهی جدید مطابق جستجوی ذخیره‌شدهٔ «${s.name}» یافت شد.`;

        await db.notification.create({
          data: {
            userId: s.userId,
            type: "SAVED_SEARCH_MATCH",
            title: "آگهی جدید مطابق جستجوی ذخیره‌شده شما",
            body,
            link,
            data: JSON.stringify({
              savedSearchId: s.id,
              savedSearchName: s.name,
              newCount: count,
              listingIds: newMatches.map((m) => m.id),
            }),
          },
        });
      }

      // Bump lastNotifiedAt + matchCount — matchCount is the
      // cumulative count of matches this search has ever surfaced
      // (handy for the admin SavedSearch dashboard).
      await db.savedSearch.update({
        where: { id: s.id },
        data: {
          lastNotifiedAt: now,
          matchCount: { increment: newMatches.length },
        },
      });
    } catch (err: unknown) {
      errors++;
      console.warn(
        `[alert-matcher] failed for saved search ${s.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  await logAudit({
    actorId: null,
    actorType: "SYSTEM",
    action: "alert.match_run",
    entityType: "SavedSearch",
    entityId: null,
    after: { scanned, matched, notified, errors },
    reason: `تطبیق هشدارها — ${scanned} جستجوی ذخیره‌شده اسکن شد (${matched} مطابقت، ${notified} اعلان، ${errors} خطا).`,
  });

  return { matched, notified, errors, scanned };
}
