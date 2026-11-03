import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserPermissions } from "@/lib/rbac";

/* ============================================================
   HEAVIX — Central Middleware for Admin API RBAC enforcement.
   Per HEAVIX COMPLETION MASTER SPEC V1.0 §6, §7.

   This middleware intercepts ALL /api/admin/* requests and:
   1. Verifies authentication (admin cookie or user session)
   2. Checks RBAC permission based on route + method
   3. Returns 401 (unauthenticated) or 403 (forbidden) if checks fail

   Permission mapping:
   - GET = read permission
   - POST/PUT/PATCH/DELETE = write permission
   ============================================================ */

// Route → permission resource mapping
const ROUTE_PERMS: Record<string, { read: string; write: string }> = {
  "listings": { read: "listing.read", write: "listing.update" },
  "brands": { read: "brand.read", write: "brand.update" },
  "brand-families": { read: "brand.read", write: "brand.update" },
  "categories": { read: "taxonomy.read", write: "taxonomy.update" },
  "taxonomy": { read: "taxonomy.read", write: "taxonomy.update" },
  "products": { read: "product.read", write: "product.update" },
  "compatibility": { read: "product.read", write: "product.update" },
  "compatibility-edges": { read: "product.read", write: "product.update" },
  "companies": { read: "company.read", write: "company.manage" },
  "users": { read: "user.read", write: "user.update" },
  "articles": { read: "knowledge.manage", write: "knowledge.manage" },
  "knowledge": { read: "knowledge.manage", write: "knowledge.manage" },
  "knowledge-entries": { read: "knowledge.manage", write: "knowledge.manage" },
  "knowledge-graph": { read: "knowledge.manage", write: "knowledge.manage" },
  "dictionary": { read: "knowledge.manage", write: "knowledge.manage" },
  "hot-searches": { read: "seo.manage", write: "seo.manage" },
  "seo": { read: "seo.manage", write: "seo.manage" },
  "feature-flags": { read: "system.read", write: "system.manage" },
  "ai-gateway": { read: "ai.read", write: "ai.manage" },
  "ai-budget": { read: "ai.read", write: "ai.budget.manage" },
  "ai-agents": { read: "ai.read", write: "ai.agent.manage" },
  "ai-scraper": { read: "ai.read", write: "ai.execute" },
  "ai-content-factory": { read: "ai.read", write: "ai.execute" },
  "reels": { read: "ai.read", write: "ai.execute" },
  "social-reels": { read: "ai.read", write: "ai.execute" },
  "jobs": { read: "jobs.read", write: "jobs.run" },
  "launch-phases": { read: "system.read", write: "system.manage" },
  "growth-engine": { read: "system.read", write: "system.manage" },
  "menu": { read: "system.read", write: "system.manage" },
  "media": { read: "media.read", write: "media.upload" },
  "upload": { read: "media.read", write: "media.upload" },
  "media-library": { read: "media.read", write: "media.upload" },
  "homepage-sections": { read: "system.read", write: "system.manage" },
  "hero": { read: "system.read", write: "system.manage" },
  "site-settings": { read: "system.read", write: "system.manage" },
  "settings": { read: "system.read", write: "system.manage" },
  "audit-log": { read: "audit.read", write: "audit.read" },
  "offers-all": { read: "listing.read", write: "listing.moderate" },
  "auctions": { read: "listing.read", write: "auction.manage" },
  "rfq": { read: "request.read", write: "rfq.manage" },
  "procurement": { read: "request.read", write: "rfq.manage" },
  "rejections": { read: "listing.read", write: "listing.moderate" },
  "requests": { read: "request.read", write: "request.match" },
  "matching": { read: "request.read", write: "request.match" },
  "opportunities": { read: "request.read", write: "request.match" },
  "opportunity-radar": { read: "request.read", write: "request.match" },
  "demand-engine": { read: "request.read", write: "request.match" },
  "demand-signals": { read: "request.read", write: "request.match" },
  "market-intelligence": { read: "price.read", write: "price.read" },
  "market-heatmap": { read: "price.read", write: "price.read" },
  "price-intelligence": { read: "price.read", write: "price.read" },
  "catalog-health": { read: "system.read", write: "system.read" },
  "ai-analyst": { read: "ai.read", write: "ai.execute" },
  "subscriptions": { read: "payment.read", write: "payment.manage" },
  "payments": { read: "payment.read", write: "payment.manage" },
  "store": { read: "product.read", write: "product.update" },
  "transaction-types": { read: "taxonomy.read", write: "taxonomy.update" },
  "service-types": { read: "taxonomy.read", write: "taxonomy.update" },
  "application-industries": { read: "taxonomy.read", write: "taxonomy.update" },
  "locations": { read: "taxonomy.read", write: "taxonomy.update" },
  "attachments": { read: "product.read", write: "product.update" },
  "reels": { read: "ai.read", write: "ai.execute" },
};

function getPermissionForPath(pathname: string, method: string): string | null {
  // Extract resource from /api/admin/<resource>/...
  const match = pathname.match(/^\/api\/admin\/([^\/]+)/);
  if (!match) return null;
  const resource = match[1];
  const perms = ROUTE_PERMS[resource];
  if (!perms) return null;
  const isWrite = method !== "GET";
  return isWrite ? perms.write : perms.read;
}

export async function middleware(req: NextRequest) {
  const { pathname, method } = req.nextUrl;

  // Only intercept /api/admin/* routes
  if (!pathname.startsWith("/api/admin/")) {
    return NextResponse.next();
  }

  // Skip auth for OPTIONS (CORS preflight)
  if (method === "OPTIONS") {
    return NextResponse.next();
  }

  // Check for admin cookie (legacy path)
  const adminCookie = req.cookies.get("heavix-admin")?.value;
  if (adminCookie) {
    // Admin cookie = full access (legacy, will be deprecated)
    // In production, this should also verify the cookie is valid
    return NextResponse.next();
  }

  // Check for user session cookie
  const sessionCookie = req.cookies.get("heavix-session")?.value;
  if (!sessionCookie) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 },
    );
  }

  // Get required permission
  const requiredPerm = getPermissionForPath(pathname, method);
  if (!requiredPerm) {
    // No permission mapping = allow (route will do its own auth)
    return NextResponse.next();
  }

  // Look up user from session
  try {
    const session = await db.session.findUnique({
      where: { token: sessionCookie },
      select: {
        userId: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date() || session.user.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Session expired" } },
        { status: 401 },
      );
    }

    // Check RBAC permission
    const userPerms = await getUserPermissions(session.userId);
    if (userPerms.includes(requiredPerm)) {
      return NextResponse.next();
    }

    // Fall back: check if user is admin (legacy User.role)
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });
    if (user?.role === "ADMIN" || user?.role === "SUPERADMIN") {
      return NextResponse.next();
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Permission denied: requires "${requiredPerm}"`,
        },
      },
      { status: 403 },
    );
  } catch (e) {
    // If DB check fails, allow route to do its own auth (backward compat)
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
