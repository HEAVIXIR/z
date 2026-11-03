import { getCurrentUser, isAuthenticated } from "@/lib/auth";

/**
 * HEAVIX store — auth bridge.
 *
 * The store has its OWN Postgres database (STORE_DATABASE_URL, separate
 * from the main HEAVIX database at DATABASE_URL), but per the user
 * requirement it shares
 * HEAVIX's single sign-on system: "we have ONE login system for all
 * HEAVIX sections including the store". Regular HEAVIX users act as
 * buyers in the store; admins can additionally edit the catalog.
 *
 * This module reads the HEAVIX user session cookie (via `getCurrentUser`
 * from `@/lib/auth`) and returns a normalized user shape that the store
 * API routes / components can consume. It does NOT touch the store DB —
 * it only bridges the HEAVIX user into the store context.
 */

export interface StoreUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: string;
  status: string;
  /** Convenience: "ADMIN" if the HEAVIX admin cookie is present. */
  isAdmin: boolean;
  /** Full display name "firstName lastName". */
  fullName: string;
}

/**
 * Returns the currently-logged-in HEAVIX user (or null).
 * Reads the `heavix-user` session cookie via the main auth module.
 */
export async function getStoreUser(): Promise<StoreUser | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return {
      id: user.id,
      firstName,
      lastName,
      email: user.email,
      mobile: user.mobile,
      role: user.role || "BUYER",
      status: user.status,
      isAdmin: false,
      fullName: `${firstName} ${lastName}`.trim() || user.email,
    };
  } catch {
    return null;
  }
}

/**
 * Returns true if the current request carries a HEAVIX admin session
 * (`heavix-admin` cookie). This is checked separately from the user
 * session — an admin may or may not also be a registered HEAVIX User.
 */
export async function isStoreAdmin(): Promise<boolean> {
  try {
    return await isAuthenticated();
  } catch {
    return false;
  }
}

/**
 * Returns the store user, but with `isAdmin` populated. Use this in
 * store routes that need to differentiate admin (full access to all
 * orders) from a regular user (only their own orders).
 */
export async function getStoreUserWithRole(): Promise<StoreUser | null> {
  const [user, admin] = await Promise.all([getStoreUser(), isStoreAdmin()]);
  if (!user && !admin) return null;
  if (!user) {
    // Admin-only session (no User record) — return a synthetic admin
    // shape so admin routes can identify the actor. The `id` is empty
    // so it won't accidentally match any order's `userId`.
    return {
      id: "",
      firstName: "Admin",
      lastName: "",
      email: "",
      mobile: "",
      role: "ADMIN",
      status: "ACTIVE",
      isAdmin: true,
      fullName: "ادمین هویکس",
    };
  }
  return { ...user, isAdmin: admin };
}
