/**
 * Phase 3B: Seller / Company Domain — fill gaps
 * Per HEAVIX Master Execution Plan V2.0 §3.3.
 *
 * Gaps:
 * 1. Only 1 company — seed 4 more (different seller types)
 * 2. 0 users linked to companies — link them
 * 3. Need variety: Dealer, Manufacturer, Rental Company, Service Provider
 */
import { db } from "../src/lib/db";

async function main() {
  console.log("=== PHASE 3B: SELLER / COMPANY DOMAIN FILL GAPS ===\n");

  const users = await db.user.findMany();
  const adminUser = users[0];
  const regularUser = users[1] || users[0];

  // 1. Seed 4 more companies (different types)
  console.log("1. Seeding companies...");
  const companies = [
    {
      name: "آریا ماشین جم",
      slug: "aria-machine-jam",
      description: "نمایندگی رسمی ماشین‌آلات سنگین — خرید، فروش، اجاره",
      phone: "021-88106385",
      email: "info@ariamj.ir",
      city: "تهران",
      province: "تهران",
      verified: true,
      premium: true,
      website: "https://ariamj.ir",
    },
    {
      name: "صنایع سنگین پارس",
      slug: "pars-heavy-industries",
      description: "تأمین‌کننده ماشین‌آلات معدنی و راهسازی — واردات و فروش",
      phone: "031-36774521",
      email: "sales@parshi.ir",
      city: "اصفهان",
      province: "اصفهان",
      verified: true,
      premium: false,
      website: "https://parshi.ir",
    },
    {
      name: "اجاره ماشین‌آلات البرز",
      slug: "alborz-rental",
      description: "اجاره بیل مکانیکی، لودر، بلدوزر با اپراتور — سراسر کشور",
      phone: "026-34567890",
      email: "rent@alborzrent.ir",
      city: "کرج",
      province: "البرز",
      verified: false,
      premium: false,
    },
    {
      name: "فنی کاران جنوب",
      slug: "south-technicians",
      description: "خدمات فنی، تعمیرات و نگهداری ماشین‌آلات سنگین — خوزستان",
      phone: "061-33345678",
      email: "service@southtech.ir",
      city: "اهواز",
      province: "خوزستان",
      verified: false,
      premium: false,
    },
  ];

  let companyCount = 0;
  for (const c of companies) {
    const existing = await db.company.findFirst({ where: { slug: c.slug } });
    if (!existing) {
      await db.company.create({ data: { ...c, status: "ACTIVE" } });
      companyCount++;
    }
  }
  console.log(`  ✓ ${companyCount} companies created`);

  // 2. Link users to companies
  console.log("\n2. Linking users to companies...");
  const allCompanies = await db.company.findMany();
  let userLinkCount = 0;
  for (let i = 0; i < users.length && i < allCompanies.length; i++) {
    await db.user.update({
      where: { id: users[i].id },
      data: { companyId: allCompanies[i].id },
    });
    userLinkCount++;
  }
  console.log(`  ✓ ${userLinkCount} users linked to companies`);

  // 3. Add company branches
  console.log("\n3. Adding company branches...");
  const tehranProv = await db.province.findFirst({ where: { name: "تهران" } });
  const tehranCity = await db.city.findFirst({ where: { provinceId: tehranProv?.id, name: "تهران" } });
  const isfahanProv = await db.province.findFirst({ where: { name: "اصفهان" } });
  const isfahanCity = await db.city.findFirst({ where: { provinceId: isfahanProv?.id, name: "اصفهان" } });

  let branchCount = 0;
  for (const company of allCompanies) {
    const existingBranch = await db.companyBranch.findFirst({ where: { companyId: company.id } });
    if (!existingBranch) {
      const city = company.city === "اصفهان" ? isfahanCity : tehranCity;
      await db.companyBranch.create({
        data: {
          companyId: company.id,
          name: `شعبه ${company.name}`,
          cityId: city?.id || tehranCity?.id || "",
          address: company.city ? `${company.city}، شهرک صنعتی` : "تهران، شهرک صنعتی",
          phone: company.phone || "021-00000000",
        },
      });
      branchCount++;
    }
  }
  console.log(`  ✓ ${branchCount} branches created`);

  // 4. Add company verifications for unverified companies
  console.log("\n4. Adding verifications...");
  let verifCount = 0;
  for (const company of allCompanies) {
    const existingVerif = await db.companyVerification.findFirst({ where: { companyId: company.id } });
    if (!existingVerif) {
      await db.companyVerification.create({
        data: {
          companyId: company.id,
          status: company.verified ? "VERIFIED" : "PENDING",
          reviewedAt: company.verified ? new Date() : null,
          reviewedBy: company.verified ? "admin" : null,
          notes: company.verified ? "مدارک تأیید شد" : "در انتظار بررسی",
        },
      });
      verifCount++;
    }
  }
  console.log(`  ✓ ${verifCount} verifications created`);

  // 5. Verify
  console.log("\n5. VERIFICATION:");
  const finalCompanies = await db.company.count();
  const finalVerified = await db.company.count({ where: { verified: true } });
  const finalUsersWithCompany = await db.user.count({ where: { companyId: { not: null } } });
  const finalBranches = await db.companyBranch.count();
  const finalVerifs = await db.companyVerification.count();
  const companiesWithListings = await db.company.count({ where: { listings: { some: {} } } });
  console.log(`  Companies: ${finalCompanies} (verified: ${finalVerified})`);
  console.log(`  Users with companyId: ${finalUsersWithCompany}`);
  console.log(`  Branches: ${finalBranches}`);
  console.log(`  Verifications: ${finalVerifs}`);
  console.log(`  Companies with listings: ${companiesWithListings}`);

  console.log("\n=== PHASE 3B COMPLETE ===");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
}).finally(() => db.$disconnect());
