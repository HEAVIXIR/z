import { cookies } from "next/headers";
import crypto from "node:crypto";
import { db } from "@/lib/db";

/* ============================================================
   HEAVIX auth — cookie-based sessions for admin + users.

   P0-3 (Security Baseline V1):
   - Admin sessions are NO LONGER a forgeable base64 blob.
   - On login we mint a 32-byte CSPRNG token, store ONLY its
     SHA-256 hash in `AdminSession` (with expiry), and set the
     raw token in an HttpOnly + SameSite=Lax (+ Secure in prod)
     cookie.
   - `isAuthenticated()` hashes the incoming cookie and looks up
     the hash in the DB, rejecting expired / revoked sessions.
   - `destroySession()` deletes the row → immediate revocation.
   - Admin credentials (ADMIN_CREDENTIALS) are still used as the
     primary authenticator; they only ever issue a secure session
     token and are never stored in a cookie themselves.

   Users continue to use the server-side `Session` table.
   ============================================================ */

export const ADMIN_COOKIE = "heavix-admin";
export const USER_COOKIE = "heavix-user";

/** Admin session lifetime: 24 hours (in seconds). */
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24;
/** User session lifetime: 7 days (in seconds). */
const USER_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME ?? "09121404927",
  password: process.env.ADMIN_PASSWORD ?? "ZIASAMa6365N@",
};

/**
 * Constant-time-ish admin credential check.
 * NOTE: This is the PRIMARY authenticator only — on success it issues a
 * cryptographically secure session token (see `createSession`). The
 * password itself is NEVER put in a cookie.
 */
export function validateLogin(username: string, password: string): boolean {
  const expectedUser = ADMIN_CREDENTIALS.username;
  const expectedPass = ADMIN_CREDENTIALS.password;
  // Use timingSafeEqual to avoid trivial timing leaks on the comparison.
  try {
    const a = Buffer.from(String(username));
    const b = Buffer.from(expectedUser);
    const c = Buffer.from(String(password));
    const d = Buffer.from(expectedPass);
    if (a.length !== b.length || c.length !== d.length) return false;
    return (
      crypto.timingSafeEqual(a, b) && crypto.timingSafeEqual(c, d)
    );
  } catch {
    return false;
  }
}

/** SHA-256 hex of a token — what we persist in `AdminSession.tokenHash`. */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const isProd = process.env.NODE_ENV === "production";

/** Server-only: create a cryptographically secure admin session. */
export async function createSession(): Promise<void> {
  // 32 bytes of CSPRNG entropy → base64url (~43 chars). This is what we
  // hand to the client. We never persist the raw token.
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  const expiresAt = new Date(now + ADMIN_SESSION_MAX_AGE * 1000);

  // Best-effort cleanup of expired sessions on each new login so the
  // table doesn't grow without bound. Failure here is non-fatal.
  try {
    await db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
  } catch {
    /* ignore */
  }

  await db.adminSession.create({
    data: {
      tokenHash,
      username: ADMIN_CREDENTIALS.username,
      expiresAt,
    },
  });

  const store = await cookies();
  store.set(ADMIN_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: ADMIN_SESSION_MAX_AGE,
    path: "/",
  });
}

/** Server-only: revoke the current admin session (delete the DB row). */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const rawToken = store.get(ADMIN_COOKIE)?.value;
  if (rawToken) {
    try {
      const tokenHash = hashToken(rawToken);
      await db.adminSession.deleteMany({ where: { tokenHash } });
    } catch {
      /* ignore */
    }
  }
  store.delete(ADMIN_COOKIE);
}

/**
 * Server-only: check if the current request carries a valid, non-expired
 * admin session. Hashes the incoming cookie and looks it up in `AdminSession`.
 * Expired rows are pruned on read.
 */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const rawToken = store.get(ADMIN_COOKIE)?.value;
  if (!rawToken) return false;
  try {
    const tokenHash = hashToken(rawToken);
    const session = await db.adminSession.findUnique({ where: { tokenHash } });
    if (!session) return false;
    if (session.expiresAt.getTime() < Date.now()) {
      // Prune expired session on read.
      await db.adminSession.delete({ where: { id: session.id } }).catch(() => {});
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/* ── User sessions (cookie-based, server-side Session table) ── */

export async function createUserSession(userId: string): Promise<void> {
  // 32 bytes of CSPRNG entropy for user sessions too (was a weak
  // Math.random()-based token). The user `Session` table stores the raw
  // token in `token @unique`; we keep that contract but strengthen entropy.
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + USER_SESSION_MAX_AGE * 1000);
  await db.session.create({ data: { userId, token: rawToken, expiresAt } });
  const store = await cookies();
  store.set(USER_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: USER_SESSION_MAX_AGE,
    path: "/",
  });
}

export async function destroyUserSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(USER_COOKIE)?.value;
  if (token) {
    try {
      await db.session.deleteMany({ where: { token } });
    } catch {
      /* ignore */
    }
  }
  store.delete(USER_COOKIE);
}

/** Returns the current User record if the user cookie is a valid session. */
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(USER_COOKIE)?.value;
  if (!token) return null;
  try {
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }
    return session.user;
  } catch {
    return null;
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const u = await getCurrentUser();
  return u?.id ?? null;
}
