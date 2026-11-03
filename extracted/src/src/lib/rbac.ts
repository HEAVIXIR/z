import { db } from "@/lib/db";

/* ============================================================
   HEAVIX — RBAC helpers (P0-5)
   HEAVIX-SECURITY-BASELINE-V1.md §3, §5
   HEAVIX-P0-IMPLEMENTATION-PLAN.md STEP 3

   Permission resolution path:
       User → UserRole → Role → RolePermission → Permission.key

   Naming convention: `resource.action`
     • taxonomy.read      • brand.publish
     • listing.moderate   • user.suspend
     • security.manage    • ai.execute

   NOTE on backward compatibility:
     The legacy `User.role` String column ("ADMIN" | "SELLER" | "BUYER")
     predates RBAC. To avoid locking out existing admins that haven't been
     migrated to UserRole yet, `isAdmin()` falls back to checking the
     `User.role` column for "ADMIN"/"SUPERADMIN". Once the data migration
     is complete the fallback can be removed.
   ============================================================ */

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Returns all permission keys for the user, de-duplicated.
 * Resolves through UserRole → RolePermission → Permission.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const userRoles = await db.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            permissions: {
              select: { permission: { select: { key: true } } },
            },
          },
        },
      },
    });

    const set = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.permissions) {
        set.add(rp.permission.key);
      }
    }
    return Array.from(set);
  } catch (err) {
    console.error("[rbac] getUserPermissions failed:", err);
    return [];
  }
}

/**
 * True if the user has the given permission key.
 */
export async function hasPermission(
  userId: string,
  permissionKey: string,
): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  return perms.includes(permissionKey);
}

/**
 * Throws ForbiddenError (HTTP 403) if the user lacks the permission.
 * Use in API routes / server actions:
 *
 *     await requirePermission(user.id, "listing.publish");
 */
export async function requirePermission(
  userId: string,
  permissionKey: string,
): Promise<void> {
  const ok = await hasPermission(userId, permissionKey);
  if (!ok) {
    throw new ForbiddenError(
      `Permission denied: requires "${permissionKey}"`,
    );
  }
}

/**
 * True if the user has the ADMIN role (via UserRole).
 *
 * Falls back to the legacy `User.role` String column ("ADMIN" | "SUPERADMIN")
 * so existing admins that haven't been migrated to UserRole are not locked
 * out. This fallback can be removed once the data migration is verified.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    // 1. RBAC path — user has a UserRole with role.key === "ADMIN"
    const adminRole = await db.userRole.findFirst({
      where: {
        userId,
        role: { key: "ADMIN" },
      },
      select: { id: true },
    });
    if (adminRole) return true;

    // 2. Legacy fallback — User.role column.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) return false;
    const r = (user.role ?? "").toUpperCase();
    return r === "ADMIN" || r === "SUPERADMIN";
  } catch (err) {
    console.error("[rbac] isAdmin failed:", err);
    return false;
  }
}

/**
 * True if the user has any of the given role keys (via UserRole).
 * Does NOT consult the legacy User.role column — role keys are exact.
 */
export async function hasRole(
  userId: string,
  roleKey: string | string[],
): Promise<boolean> {
  const keys = Array.isArray(roleKey) ? roleKey : [roleKey];
  if (keys.length === 0) return false;
  try {
    const found = await db.userRole.findFirst({
      where: { userId, role: { key: { in: keys } } },
      select: { id: true },
    });
    return Boolean(found);
  } catch (err) {
    console.error("[rbac] hasRole failed:", err);
    return false;
  }
}
