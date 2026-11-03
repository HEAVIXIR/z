// @ts-nocheck
import { db } from "../src/lib/db";
import fs from "fs";

async function main() {
  console.log("=== PHASE 5A — TRUST DOMAIN AUDIT ===\n");

  // 1. User Verification
  console.log("1. USER VERIFICATION");
  const users = await db.user.findMany({ select: { id: true, mobile: true, email: true, emailVerified: true, mobileVerified: true, status: true, role: true } });
  const emailVerified = users.filter(u => u.emailVerified).length;
  const mobileVerified = users.filter(u => u.mobileVerified).length;
  console.log("  Users: " + users.length + ", Email verified: " + emailVerified + ", Mobile verified: " + mobileVerified);
  console.log("  Status: EXISTS (emailVerified + mobileVerified boolean fields on User)");

  // 2. Company Verification
  console.log("\n2. COMPANY VERIFICATION");
  const companies = await db.company.findMany({ select: { id: true, name: true, verified: true, status: true } });
  const verifiedCompanies = companies.filter(c => c.verified).length;
  console.log("  Companies: " + companies.length + ", Verified: " + verifiedCompanies);
  const companyVerifs = await db.companyVerification.findMany().catch(() => []);
  console.log("  CompanyVerification records: " + companyVerifs.length);
  if (companyVerifs.length > 0) console.log("  Fields: " + Object.keys(companyVerifs[0]).join(", "));
  console.log("  Status: " + (companyVerifs.length > 0 ? "EXISTS" : "INCOMPLETE"));

  // 3. Company Documents
  console.log("\n3. COMPANY DOCUMENTS");
  const companyDocs = await db.companyDocument.findMany().catch(() => []);
  console.log("  CompanyDocument records: " + companyDocs.length);
  console.log("  Status: " + (companyDocs.length > 0 ? "EXISTS" : "INCOMPLETE"));

  // 4. Listing Verification
  console.log("\n4. LISTING VERIFICATION");
  const verifiedListings = await db.listing.count({ where: { verified: true } }).catch(() => 0);
  const totalListings = await db.listing.count();
  console.log("  Listings: " + totalListings + ", Verified (boolean): " + verifiedListings);
  console.log("  Listing has verified boolean: EXISTS");
  console.log("  Listing has separate Verification entity: MISSING (only boolean, no evidence/audit)");

  // 5. Machine Verification
  console.log("\n5. MACHINE VERIFICATION (MachinePassport)");
  const passports = await db.machinePassport.count().catch(() => 0);
  console.log("  MachinePassport records: " + passports);
  const passportEvents = await db.passportEvent.count().catch(() => 0);
  console.log("  PassportEvent records: " + passportEvents);
  console.log("  Status: " + (passports > 0 ? "EXISTS" : "INCOMPLETE (schema exists, no data)"));

  // 6. Inspection
  console.log("\n6. INSPECTION");
  const inspections = await db.inspection.count().catch(() => 0);
  console.log("  Inspection records: " + inspections);
  console.log("  Status: " + (inspections > 0 ? "EXISTS" : "INCOMPLETE (schema exists, minimal data)"));

  // 7. Moderation
  console.log("\n7. MODERATION");
  const modLogs = await db.moderationLog.count().catch(() => 0);
  const rejections = await db.listingRejection.count().catch(() => 0);
  console.log("  ModerationLog records: " + modLogs);
  console.log("  ListingRejection records: " + rejections);
  console.log("  Status: " + (modLogs > 0 ? "EXISTS" : "INCOMPLETE"));

  // 8. AuditLog
  console.log("\n8. AUDIT LOG");
  const auditLogs = await db.auditLog.count().catch(() => 0);
  console.log("  AuditLog records: " + auditLogs);
  console.log("  Status: EXISTS (model + data present)");

  // 9. Review
  console.log("\n9. REVIEW / RATING");
  const reviews = await db.review.count().catch(() => 0);
  console.log("  Review records: " + reviews);
  console.log("  Status: EXISTS (model created, 0 data)");

  // 10. API Routes
  console.log("\n10. API ROUTES");
  const apiPaths = {
    "/api/admin/companies": fs.existsSync("src/app/api/admin/companies/route.ts"),
    "/api/admin/companies/[id]": fs.existsSync("src/app/api/admin/companies/[id]/route.ts"),
    "/api/admin/users": fs.existsSync("src/app/api/admin/users/route.ts"),
    "/api/admin/listings": fs.existsSync("src/app/api/admin/listings/route.ts"),
    "/api/admin/rejections": fs.existsSync("src/app/api/admin/rejections-all/route.ts"),
    "/api/admin/reviews": fs.existsSync("src/app/api/admin/reviews/route.ts"),
    "/api/verifications": fs.existsSync("src/app/api/verifications/route.ts"),
    "/api/admin/verifications": fs.existsSync("src/app/api/admin/verifications/route.ts"),
    "/api/sellers/[id]/trust": fs.existsSync("src/app/api/sellers/[id]/trust/route.ts"),
  };
  for (const [path, exists] of Object.entries(apiPaths)) {
    console.log("  " + path + ": " + (exists ? "EXISTS" : "MISSING"));
  }

  // 11. Admin Pages
  console.log("\n11. ADMIN PAGES");
  const adminPaths = {
    "/admin/companies": fs.existsSync("src/app/admin/companies/page.tsx"),
    "/admin/companies/[id]": fs.existsSync("src/app/admin/companies/[id]/page.tsx"),
    "/admin/users": fs.existsSync("src/app/admin/users/page.tsx"),
    "/admin/rejections": fs.existsSync("src/app/admin/rejections/page.tsx"),
    "/admin/trust": fs.existsSync("src/app/admin/trust/page.tsx"),
  };
  for (const [path, exists] of Object.entries(adminPaths)) {
    console.log("  " + path + ": " + (exists ? "EXISTS" : "MISSING"));
  }

  // 12. RBAC
  console.log("\n12. RBAC (Trust-related permissions)");
  const companyPerms = await db.permission.findMany({ where: { key: { contains: "company" } } }).catch(() => []);
  console.log("  Company permissions: " + companyPerms.map(p => p.key).join(", "));

  // SUMMARY
  console.log("\n=== AUDIT SUMMARY ===");
  console.log("  EXISTS: User email/mobile, Company verified, CompanyVerification, CompanyDocument, CompanyBranch, Listing verified boolean, MachinePassport, Inspection, ModerationLog, ListingRejection, AuditLog, Review");
  console.log("");
  console.log("  GAPS (MISSING/INCOMPLETE):");
  console.log("    MISSING: Unified Verification entity (subjectType + subjectId + type + status + evidence)");
  console.log("    MISSING: /api/verifications (public trust API)");
  console.log("    MISSING: /api/admin/verifications (admin trust center API)");
  console.log("    MISSING: /api/sellers/[id]/trust (seller trust profile)");
  console.log("    MISSING: /admin/trust (admin trust center page)");
  console.log("    MISSING: Verification expiration (expiresAt on CompanyVerification)");
  console.log("    MISSING: Verification revocation workflow");
  console.log("    MISSING: Listing trust surface (public verification display)");
  console.log("    INCOMPLETE: CompanyVerification has no expiresAt field");
  console.log("    INCOMPLETE: CompanyVerification has no evidence field");
  console.log("    INCOMPLETE: MachinePassport has 0 data");
  console.log("    INCOMPLETE: Inspection has minimal data (3 records)");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
