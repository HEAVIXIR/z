/* HEAVIX — RBAC Seed (P0-5)
   HEAVIX-SECURITY-BASELINE-V1.md §3, §5
   HEAVIX-P0-IMPLEMENTATION-PLAN.md STEP 3

   Idempotent: safe to re-run. Uses upsert-by-key for Role/Permission and
   @@unique([roleId, permissionId]) / @@unique([userId, roleId]) for joins.

   Run:
     bunx tsx prisma/seed-rbac.ts
   or:
     bun run db:seed-rbac
*/
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/* ───────────── Roles ───────────── */

type RoleSeed = {
  key: string;
  nameFa: string;
  nameEn: string;
  description: string;
};

const ROLES: RoleSeed[] = [
  {
    key: "ADMIN",
    nameFa: "مدیر",
    nameEn: "Administrator",
    description: "دسترسی کامل به همه منابع و عملیات",
  },
  {
    key: "SELLER",
    nameFa: "فروشنده",
    nameEn: "Seller",
    description: "آگهی‌گذار ماشین‌آلات صنعتی",
  },
  {
    key: "BUYER",
    nameFa: "خریدار",
    nameEn: "Buyer",
    description: "کاربر عادی مرورگر/خریدار",
  },
  {
    key: "MODERATOR",
    nameFa: "ناظر",
    nameEn: "Moderator",
    description: "ناظر محتوا و آگهی‌ها",
  },
  {
    key: "SUPPORT",
    nameFa: "پشتیبان",
    nameEn: "Support",
    description: "تیم پشتیبانی کاربران",
  },
];

/* ───────────── Permissions (20+) ───────────── */

type PermissionSeed = {
  key: string;
  nameFa: string;
  nameEn: string;
  resource: string;
  description: string;
};

const PERMISSIONS: PermissionSeed[] = [
  // taxonomy
  { key: "taxonomy.read",  nameFa: "مشاهده تاکسونومی",   nameEn: "Read taxonomy",   resource: "taxonomy", description: "دیده‌ن دسته‌ها، ویژگی‌ها، برندها" },
  { key: "taxonomy.write", nameFa: "ویرایش تاکسونومی",   nameEn: "Write taxonomy",  resource: "taxonomy", description: "ساخت/ویرایش/حذف دسته‌ها و ویژگی‌ها" },
  // brand
  { key: "brand.read",     nameFa: "مشاهده برند",         nameEn: "Read brand",      resource: "brand",    description: "مشاهده رکورد برند" },
  { key: "brand.publish",  nameFa: "انتشار برند",         nameEn: "Publish brand",   resource: "brand",    description: "تأیید/انتشار برند" },
  { key: "brand.update",   nameFa: "ویرایش برند",         nameEn: "Update brand",    resource: "brand",    description: "ویرایش اطلاعات برند" },
  // listing
  { key: "listing.read",   nameFa: "مشاهده آگهی",         nameEn: "Read listing",    resource: "listing",  description: "مشاهده آگهی‌ها" },
  { key: "listing.publish", nameFa: "انتشار آگهی",        nameEn: "Publish listing", resource: "listing",  description: "انتشار/تمدید آگهی" },
  { key: "listing.moderate", nameFa: "میانجی‌گری آگهی",   nameEn: "Moderate listing", resource: "listing", description: "تأیید/رد/مسدود کردن آگهی" },
  { key: "listing.delete", nameFa: "حذف آگهی",            nameEn: "Delete listing",  resource: "listing",  description: "حذف دائمی آگهی" },
  // user
  { key: "user.read",      nameFa: "مشاهده کاربر",         nameEn: "Read user",       resource: "user",     description: "مشاهده اطلاعات کاربران" },
  { key: "user.suspend",   nameFa: "تعلیق کاربر",         nameEn: "Suspend user",    resource: "user",     description: "مسدودسازی/تعلیق کاربر" },
  { key: "user.delete",    nameFa: "حذف کاربر",           nameEn: "Delete user",     resource: "user",     description: "حذف کاربر" },
  // security
  { key: "security.manage", nameFa: "مدیریت امنیت",       nameEn: "Manage security", resource: "security", description: "مدیریت نقش‌ها، دسترسی‌ها، لاگ ممیزی" },
  // ai
  { key: "ai.execute",     nameFa: "اجرای هوش مصنوعی",    nameEn: "Execute AI",      resource: "ai",       description: "اجرای ابزارهای هوش مصنوعی" },
  // audit
  { key: "audit.read",     nameFa: "مشاهده لاگ ممیزی",   nameEn: "Read audit log",  resource: "audit",    description: "مشاهده لاگ ممیزی سیستم" },
  // media
  { key: "media.upload",   nameFa: "بارگذاری رسانه",      nameEn: "Upload media",    resource: "media",    description: "بارگذاری تصاویر/رسانه" },
  // review
  { key: "review.moderate", nameFa: "میانجی‌گری نظر",     nameEn: "Moderate review", resource: "review",   description: "تأیید/رد نظرات کاربران" },
  // rfq
  { key: "rfq.manage",     nameFa: "مدیریت RFQ",          nameEn: "Manage RFQ",      resource: "rfq",      description: "مدیریت درخواست‌های خرید B2B" },
  // auction
  { key: "auction.manage", nameFa: "مدیریت مزایده",       nameEn: "Manage auction",  resource: "auction",  description: "مدیریت مزایده‌های ماشین‌آلات" },
  // settings
  { key: "settings.manage", nameFa: "مدیریت تنظیمات",     nameEn: "Manage settings", resource: "settings", description: "ویرایش تنظیمات سایت" },
];

/* ───────────── Role → Permission matrix ───────────── */

const ROLE_PERMISSIONS: Record<string, string[]> = {
  // ADMIN — all permissions
  ADMIN: PERMISSIONS.map((p) => p.key),

  // MODERATOR — content moderation tools
  MODERATOR: [
    "taxonomy.read",
    "brand.read",
    "listing.read",
    "listing.moderate",
    "review.moderate",
    "user.suspend",
    "audit.read",
    "media.upload",
  ],

  // SELLER — manage own listings + media
  SELLER: [
    "listing.read",
    "listing.publish",
    "media.upload",
    "rfq.manage",
    "brand.read",
  ],

  // BUYER — browse + upload
  BUYER: [
    "listing.read",
    "media.upload",
  ],

  // SUPPORT — read-only + suspend
  SUPPORT: [
    "user.read",
    "user.suspend",
    "listing.read",
    "audit.read",
  ],
};

/* ───────────── Run ───────────── */

async function main() {
  console.log("→ Seeding RBAC roles + permissions …");

  // 1. Roles (upsert by key)
  const roleIdByKey = new Map<string, string>();
  for (const r of ROLES) {
    const role = await db.role.upsert({
      where: { key: r.key },
      create: { key: r.key, nameFa: r.nameFa, nameEn: r.nameEn, description: r.description },
      update: { nameFa: r.nameFa, nameEn: r.nameEn, description: r.description },
    });
    roleIdByKey.set(role.key, role.id);
  }
  console.log(`  ✓ ${ROLES.length} roles ensured`);

  // 2. Permissions (upsert by key)
  const permIdByKey = new Map<string, string>();
  for (const p of PERMISSIONS) {
    const perm = await db.permission.upsert({
      where: { key: p.key },
      create: { key: p.key, nameFa: p.nameFa, nameEn: p.nameEn, description: p.description, resource: p.resource },
      update: { nameFa: p.nameFa, nameEn: p.nameEn, description: p.description, resource: p.resource },
    });
    permIdByKey.set(perm.key, perm.id);
  }
  console.log(`  ✓ ${PERMISSIONS.length} permissions ensured`);

  // 3. RolePermission joins — ensure, never delete existing extras
  //    (so admin-granted one-off permissions survive re-runs).
  let assigned = 0;
  for (const [roleKey, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIdByKey.get(roleKey);
    if (!roleId) continue;
    for (const permKey of permKeys) {
      const permissionId = permIdByKey.get(permKey);
      if (!permissionId) continue;
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        create: { roleId, permissionId },
        update: {},
      });
      assigned++;
    }
  }
  console.log(`  ✓ ${assigned} role-permission assignments ensured`);

  // 4. Backward-compat: assign ADMIN UserRole to existing users whose
  //    legacy `User.role` column says ADMIN/SUPERADMIN, so they continue
  //    to pass the new isAdmin() check.
  const adminRoleId = roleIdByKey.get("ADMIN");
  if (adminRoleId) {
    const legacyAdmins = await db.user.findMany({
      where: { role: { in: ["ADMIN", "admin", "SUPERADMIN", "superadmin"] } },
      select: { id: true, email: true, role: true },
    });
    let promoted = 0;
    for (const u of legacyAdmins) {
      await db.userRole.upsert({
        where: { userId_roleId: { userId: u.id, roleId: adminRoleId } },
        create: { userId: u.id, roleId: adminRoleId },
        update: {},
      });
      promoted++;
    }
    if (promoted > 0) {
      console.log(`  ✓ ${promoted} legacy admin(s) granted ADMIN UserRole`);
    }
  }

  console.log("✓ RBAC seed complete.");
}

main()
  .catch((err) => {
    console.error("RBAC seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
