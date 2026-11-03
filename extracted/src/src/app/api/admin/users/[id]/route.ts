import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

/* ============================================================
   /api/admin/users/[id] — admin single-user management.

   GET    (admin) → full user profile + listings + offers + requests
   PATCH  (admin) → update role / status / verified / companyName
   DELETE (admin) → delete user (DOES NOT touch their listings — they
                    remain with sellerId pointing to a deleted user;
                    the relation uses onDelete: SetNull on Listing.seller
                    so listings survive with sellerId=null)
   ============================================================ */

function serializeUser(u: any) {
  return {
    ...u,
    passwordHash: undefined,
  };
}

/* GET /api/admin/users/[id] */
export async function GET(_req: Request, { params }: Args) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      include: {
        listings: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            brand: { select: { name: true } },
            category: { select: { name: true, icon: true } },
            _count: { select: { favorites: true, leads: true } },
          },
        },
        requests: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        offers: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            listing: { select: { id: true, title: true, slug: true } },
          },
        },
        notifications: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
        sessions: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, createdAt: true, expiresAt: true },
        },
        _count: {
          select: {
            listings: true,
            offers: true,
            requests: true,
            favorites: true,
            follows: true,
            notifications: true,
          },
        },
      },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Serialize BigInt prices in listings.
    const serialized = {
      ...user,
      passwordHash: undefined,
      listings: user.listings.map((l: any) => ({
        ...l,
        price: l.price ? l.price.toString() : null,
      })),
      offers: user.offers.map((o: any) => ({
        ...o,
        offerAmount: o.offerAmount ? o.offerAmount.toString() : null,
        counterAmount: o.counterAmount ? o.counterAmount.toString() : null,
      })),
    };

    return NextResponse.json({ success: true, data: serialized });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* PATCH /api/admin/users/[id] — update role/status/verified/companyName
   (P0-RBAC: requires user.suspend — covers role/status lifecycle operations) */
export async function PATCH(req: Request, { params }: Args) {
  // Authorization: legacy admin-cookie path OR user session with `user.suspend`.
  // The admin-cookie path is legacy (see src/app/admin/layout.tsx) and bypasses RBAC.
  const adminCookieOk = await isAuthenticated();
  const sessionUser = adminCookieOk ? null : await getCurrentUser();
  if (!adminCookieOk && !sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sessionUser && !(await hasPermission(sessionUser.id, "user.suspend"))) {
    return NextResponse.json(
      { error: "Forbidden: missing permission 'user.suspend'" },
      { status: 403 },
    );
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: any = {};
    const allowedFields = [
      "firstName",
      "lastName",
      "email",
      "mobile",
      "userType",
      "role",
      "status",
      "companyName",
      "emailVerified",
      "mobileVerified",
    ];
    for (const f of allowedFields) {
      if (f in body) {
        if (typeof body[f] === "boolean") {
          data[f] = body[f];
        } else {
          data[f] = body[f] === null ? null : String(body[f]);
        }
      }
    }

    // P0-2: if admin is changing the role, validate it against the enum.
    if (data.role) {
      const allowedRoles = ["ADMIN", "SELLER", "BUYER"];
      const r = data.role.toUpperCase();
      if (!allowedRoles.includes(r)) {
        return NextResponse.json(
          { error: "نقش نامعتبر است" },
          { status: 400 },
        );
      }
      data.role = r;
    }

    // Email/mobile uniqueness check on change
    if (data.email && data.email !== existing.email) {
      const dup = await db.user.findFirst({
        where: { email: data.email, NOT: { id } },
      });
      if (dup) {
        return NextResponse.json({ error: "ایمیل قبلاً ثبت شده" }, { status: 409 });
      }
    }
    if (data.mobile && data.mobile !== existing.mobile) {
      const dup = await db.user.findFirst({
        where: { mobile: data.mobile, NOT: { id } },
      });
      if (dup) {
        return NextResponse.json({ error: "موبایل قبلاً ثبت شده" }, { status: 409 });
      }
    }

    // Optional password reset (P0-1: bcrypt-hash the new password).
    if (body.password && String(body.password).length >= 6) {
      data.passwordHash = await hashPassword(String(body.password));
    }

    // Update lastLoginAt if requested (e.g. admin marking last known login)
    if (body.lastLoginAt !== undefined) {
      data.lastLoginAt = body.lastLoginAt === null ? null : new Date(body.lastLoginAt);
    }

    const updated = await db.user.update({
      where: { id },
      data,
      include: {
        _count: { select: { listings: true, offers: true, requests: true } },
      },
    });

    return NextResponse.json({ success: true, data: serializeUser(updated) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* DELETE /api/admin/users/[id] — delete user.
   Listings remain (onDelete: SetNull on Listing.seller relation),
   so historical data is preserved.
   (P0-RBAC: requires security.manage — destructive user deletion is reserved
    for security administrators; user.suspend covers the non-destructive case.)
*/
export async function DELETE(_req: Request, { params }: Args) {
  // Authorization: legacy admin-cookie path OR user session with `security.manage`.
  // The admin-cookie path is legacy (see src/app/admin/layout.tsx) and bypasses RBAC.
  const adminCookieOk = await isAuthenticated();
  const sessionUser = adminCookieOk ? null : await getCurrentUser();
  if (!adminCookieOk && !sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sessionUser && !(await hasPermission(sessionUser.id, "security.manage"))) {
    return NextResponse.json(
      { error: "Forbidden: missing permission 'security.manage'" },
      { status: 403 },
    );
  }
  try {
    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete the user. Cascade rules in the schema will handle:
    // - Session: onDelete: Cascade → sessions deleted
    // - VerificationCode: onDelete: Cascade → codes deleted
    // - Listing.seller: onDelete: SetNull → listings survive with sellerId=null
    // - BuyRequest.user: check schema (cascade) → may delete or set null
    // - Favorite.user: check schema
    // Most user-related tables use Cascade; the listing uses SetNull to preserve ad data.
    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
