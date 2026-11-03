import { NextResponse } from "next/server";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/rbac";

/* ============================================================
   HEAVIX — Central Admin API Guard.
   Per HEAVIX COMPLETION MASTER SPEC V1.0 §7 (Admin API Security).

   Usage in any /api/admin/* route:

     import { adminGuard, requirePerm } from "@/lib/admin-guard";

     export async function GET(req: Request) {
       const user = await adminGuard(req);
       if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
       await requirePerm(user.id, "brand.read");
       // ... route logic
     }

   Or for permission-gated routes:

     export async function PATCH(req: Request) {
       const user = await adminGuard(req, "brand.update");
       if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
       // ... route logic
     }
   ============================================================ */

/**
 * Checks admin authentication via legacy admin cookie OR user session.
 * If `permissionKey` is provided, also checks RBAC permission.
 * Returns the user object (if session-based) or null (if admin cookie).
 * Returns `false` if auth/permission fails — caller should return 401/403.
 */
export async function adminGuard(
  permissionKey?: string,
): Promise<{ id: string; firstName?: string } | null | false> {
  // 1. Try legacy admin cookie (backward compat)
  const adminCookieOk = await isAuthenticated();
  if (adminCookieOk) {
    // Admin cookie = full admin access (legacy, will be deprecated)
    return { id: "admin-cookie" };
  }

  // 2. Try user session
  const user = await getCurrentUser();
  if (!user) return null; // Not authenticated

  // 3. If permission required, check RBAC
  if (permissionKey) {
    const hasPerm = await hasPermission(user.id, permissionKey);
    if (!hasPerm) {
      // Fall back to isAdmin check (for users not yet migrated to UserRole)
      const admin = await isAdmin(user.id);
      if (!admin) return false; // Forbidden
    }
  }

  return { id: user.id, firstName: user.firstName };
}

/**
 * Convenience wrapper: returns the user or a NextResponse error.
 * Usage:
 *   const [user, error] = await requireAdmin("brand.update");
 *   if (error) return error;
 */
export async function requireAdmin(
  permissionKey?: string,
): Promise<[{ id: string; firstName?: string } | null, NextResponse | null]> {
  const result = await adminGuard(permissionKey);
  if (result === null) {
    return [null, NextResponse.json({ error: "Unauthorized" }, { status: 401 })];
  }
  if (result === false) {
    return [null, NextResponse.json(
      { error: `Forbidden: requires "${permissionKey}" permission` },
      { status: 403 },
    )];
  }
  return [result, null];
}

/**
 * Checks if the user owns a resource (for object-level authorization §28).
 */
export async function requireOwnership(
  userId: string,
  resourceOwnerId: string | null | undefined,
): Promise<boolean> {
  if (!resourceOwnerId) return false;
  if (userId === "admin-cookie") return true; // Admin can access all
  if (userId === resourceOwnerId) return true;
  // Check if user is admin
  return await isAdmin(userId);
}
