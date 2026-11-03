/* HEAVIX — Seed UserRole assignments (P0-RBAC enforcement).
   Companion to `prisma/seed-rbac.ts` (which created the Role/Permission/
   RolePermission catalog). That seed left UserRole EMPTY — only the
   backward-compat path granted ADMIN UserRole to legacy `User.role`-flagged
   admins (none existed in this DB). The result: `getUserPermissions()`
   returned [] for everyone and RBAC was theoretical.

   This script makes RBAC real by:
     1. Locating the admin user (mobile "09121404927" — the same mobile
        used as `ADMIN_CREDENTIALS.username` in `src/lib/auth.ts` — OR any
        user whose legacy `User.role` column is ADMIN/SUPERADMIN).
     2. If no such user exists, creating one with the admin mobile + a
        bcrypt hash of `ADMIN_CREDENTIALS.password` (so the username/password
        admin can ALSO log in via the user-session path and exercise RBAC).
     3. Upserting a UserRole(ADMIN) row for that user.
     4. Upserting a UserRole(BUYER) row for every OTHER user.
     5. Writing an AuditLog entry per assignment (actorType=SYSTEM) so the
        role-grant trail is visible in /admin/audit-log.

   Idempotent: safe to re-run. Uses upsert on @@unique([userId, roleId]).
   NEVER deletes existing UserRole rows — admin-granted one-off roles
   (e.g. a SUPPORT user promoted to MODERATOR) survive re-runs.

   Run:
     bunx tsx prisma/seed-user-roles.ts
   or:
     bun run db:seed-user-roles
*/
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

/** Mobile that doubles as the admin username (see src/lib/auth.ts). */
const ADMIN_MOBILE = process.env.ADMIN_USERNAME ?? "09121404927";
/** Password for a freshly-created admin user (see src/lib/auth.ts). */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ZIASAMa6365N@";

/** Append an AuditLog row. Failures are non-fatal (matches src/lib/audit.ts contract). */
async function writeAudit(params: {
  actorId?: string | null;
  actorType?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  after?: unknown;
}): Promise<void> {
  try {
    const afterJson =
      params.after === undefined || params.after === null
        ? null
        : typeof params.after === "string"
          ? params.after
          : JSON.stringify(params.after);
    await db.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorType: params.actorType ?? "SYSTEM",
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        afterJson,
        reason: params.reason ?? null,
      },
    });
  } catch (err: any) {
    // Audit failures must NEVER crash the seed.
    console.error("[seed-user-roles] audit write failed:", err?.message ?? err);
  }
}

async function main() {
  console.log("→ Seeding UserRole assignments …");

  // Resolve Role rows we care about.
  const adminRole = await db.role.findUnique({ where: { key: "ADMIN" } });
  const buyerRole = await db.role.findUnique({ where: { key: "BUYER" } });
  if (!adminRole) {
    throw new Error('Role "ADMIN" not found — run `bun run db:seed-rbac` first.');
  }
  if (!buyerRole) {
    throw new Error('Role "BUYER" not found — run `bun run db:seed-rbac` first.');
  }

  // 1. Locate the admin user (mobile match OR legacy User.role ADMIN/SUPERADMIN).
  let adminUser = await db.user.findFirst({
    where: {
      OR: [
        { mobile: ADMIN_MOBILE },
        { role: { in: ["ADMIN", "admin", "SUPERADMIN", "superadmin"] } },
      ],
    },
  });

  // 2. If none, create one so RBAC is exercisable through the user-session
  //    path too (the legacy admin-cookie path will keep working regardless).
  if (!adminUser) {
    console.log(`  • No admin user found; creating one with mobile ${ADMIN_MOBILE} …`);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    adminUser = await db.user.create({
      data: {
        firstName: "HEAVIX",
        lastName: "Admin",
        email: "admin@heavix.local",
        mobile: ADMIN_MOBILE,
        passwordHash,
        userType: "INDIVIDUAL",
        role: "ADMIN",
        status: "ACTIVE",
        emailVerified: true,
        mobileVerified: true,
      },
    });
    console.log(`    ✓ Created admin user ${adminUser.id} (${adminUser.email})`);
    await writeAudit({
      actorType: "SYSTEM",
      action: "user.create",
      entityType: "User",
      entityId: adminUser.id,
      reason: "RBAC seed: bootstrapped admin user (mobile matched ADMIN_CREDENTIALS.username)",
      after: { id: adminUser.id, mobile: adminUser.mobile, email: adminUser.email, role: adminUser.role },
    });
  } else {
    console.log(`  • Found existing admin user ${adminUser.id} (${adminUser.email}, role=${adminUser.role})`);
  }

  // 3. Grant ADMIN UserRole to the admin user (idempotent upsert).
  await db.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    create: { userId: adminUser.id, roleId: adminRole.id },
    update: {},
  });
  console.log(`  ✓ ADMIN UserRole ensured for ${adminUser.id}`);
  await writeAudit({
    actorType: "SYSTEM",
    action: "user.role.assign",
    entityType: "User",
    entityId: adminUser.id,
    reason: `RBAC seed: assigned ADMIN role (via seed-user-roles.ts)`,
    after: { userId: adminUser.id, roleKey: "ADMIN", roleId: adminRole.id },
  });

  // 4. Assign BUYER UserRole to every OTHER user.
  const otherUsers = await db.user.findMany({
    where: { id: { not: adminUser.id } },
    select: { id: true, email: true, mobile: true, role: true },
  });
  let buyerCount = 0;
  for (const u of otherUsers) {
    await db.userRole.upsert({
      where: { userId_roleId: { userId: u.id, roleId: buyerRole.id } },
      create: { userId: u.id, roleId: buyerRole.id },
      update: {},
    });
    buyerCount++;
    await writeAudit({
      actorType: "SYSTEM",
      action: "user.role.assign",
      entityType: "User",
      entityId: u.id,
      reason: `RBAC seed: assigned BUYER role (via seed-user-roles.ts)`,
      after: { userId: u.id, roleKey: "BUYER", roleId: buyerRole.id },
    });
  }
  if (otherUsers.length > 0) {
    console.log(`  ✓ BUYER UserRole ensured for ${buyerCount} other user(s)`);
  } else {
    console.log("  • No other users found — nothing to assign BUYER to.");
  }

  // 5. Summary.
  const totalUserRoles = await db.userRole.count();
  const adminRoleCount = await db.userRole.count({
    where: { roleId: adminRole.id },
  });
  const buyerRoleCount = await db.userRole.count({
    where: { roleId: buyerRole.id },
  });
  console.log("─".repeat(60));
  console.log(`✓ UserRole seed complete.`);
  console.log(`    total UserRole rows : ${totalUserRoles}`);
  console.log(`    ADMIN assignments   : ${adminRoleCount}`);
  console.log(`    BUYER assignments   : ${buyerRoleCount}`);
  console.log("─".repeat(60));
}

main()
  .catch((err) => {
    console.error("UserRole seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
