import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/users — admin user management.

   GET  (admin)  → list users with filters + counts
   POST (admin)  → create a new user (admin-created)
   ============================================================ */

function serialize(u: any) {
  return {
    ...u,
    passwordHash: undefined, // never leak
    listingsCount: u._count?.listings ?? 0,
    offersCount: u._count?.offers ?? 0,
    requestsCount: u._count?.requests ?? 0,
    _count: undefined,
  };
}

/* GET /api/admin/users?q=&role=&status=&emailVerified=&sort=&limit=&offset= */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const role = (url.searchParams.get("role") ?? "").trim();
    const status = (url.searchParams.get("status") ?? "").trim();
    const emailVerified = url.searchParams.get("emailVerified");
    const mobileVerified = url.searchParams.get("mobileVerified");
    const sort = url.searchParams.get("sort") ?? "createdAt";
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

    const where: any = {};
    if (q) {
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { email: { contains: q } },
        { mobile: { contains: q } },
        { companyName: { contains: q } },
      ];
    }
    if (role) where.userType = role.toUpperCase();
    if (status) where.status = status.toUpperCase();
    if (emailVerified === "true") where.emailVerified = true;
    if (emailVerified === "false") where.emailVerified = false;
    if (mobileVerified === "true") where.mobileVerified = true;
    if (mobileVerified === "false") where.mobileVerified = false;

    const orderBy: any =
      sort === "name"
        ? [{ firstName: "asc" }, { lastName: "asc" }]
        : sort === "lastLoginAt"
          ? { lastLoginAt: "desc" }
          : sort === "listings"
            ? { listings: { _count: "desc" } }
            : { createdAt: "desc" };

    // SQLite doesn't support relation-based orderBy sugar for some operations;
    // if "listings" sort was requested, fall back to in-memory sort.
    let users: any[];
    let total: number;
    if (sort === "listings") {
      total = await db.user.count({ where });
      users = await db.user.findMany({
        where,
        include: {
          _count: { select: { listings: true, offers: true, requests: true } },
        },
        take: 1000, // fetch then sort in-memory
      });
      users.sort(
        (a, b) =>
          (b._count?.listings ?? 0) - (a._count?.listings ?? 0) ||
          a.firstName.localeCompare(b.firstName, "fa"),
      );
      users = users.slice(offset, offset + limit);
    } else {
      [users, total] = await Promise.all([
        db.user.findMany({
          where,
          orderBy,
          skip: offset,
          take: limit,
          include: {
            _count: { select: { listings: true, offers: true, requests: true } },
          },
        }),
        db.user.count({ where }),
      ]);
    }

    return NextResponse.json({
      success: true,
      total,
      data: users.map(serialize),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* POST /api/admin/users — admin creates a user.
   (P0-RBAC: requires user.suspend — covers role/status lifecycle operations) */
export async function POST(req: Request) {
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
    const body = await req.json().catch(() => ({}));
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const mobile = String(body.mobile ?? "").trim();
    const password = String(body.password ?? "").trim();

    if (!firstName || !lastName || !email || !mobile) {
      return NextResponse.json(
        { error: "نام، نام خانوادگی، ایمیل و موبایل الزامی هستند" },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "رمز عبور باید حداقل ۶ نویسه باشد" },
        { status: 400 },
      );
    }

    // Uniqueness check
    const existing = await db.user.findFirst({
      where: { OR: [{ email }, { mobile }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: "ایمیل یا موبایل قبلاً ثبت شده است" },
        { status: 409 },
      );
    }

    // P0-1: bcrypt-hash the password (cost 10). The previous base64
    // obfuscation was NOT a hash and was trivially reversible — replaced.
    const passwordHash = await hashPassword(password);

    // P0-2: admin CAN set the role (admin-gated endpoint). Validate it
    // against the allowed enum; default to BUYER. Public registration does
    // NOT get this privilege.
    const allowedRoles = ["ADMIN", "SELLER", "BUYER"];
    const role = allowedRoles.includes(String(body.role ?? "").toUpperCase())
      ? String(body.role).toUpperCase()
      : "BUYER";

    const user = await db.user.create({
      data: {
        firstName,
        lastName,
        email,
        mobile,
        passwordHash,
        userType: String(body.userType ?? "INDIVIDUAL").toUpperCase(),
        role,
        status: String(body.status ?? "ACTIVE").toUpperCase(),
        companyName: body.companyName ? String(body.companyName) : null,
        emailVerified: Boolean(body.emailVerified),
        mobileVerified: Boolean(body.mobileVerified),
      },
      include: {
        _count: { select: { listings: true, offers: true, requests: true } },
      },
    });

    return NextResponse.json({ success: true, data: serialize(user) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
