import { db } from "../src/lib/db";

async function main() {
  await db.siteSettings.update({ where: { id: "main" }, data: { logoUrl: null, footerLogoUrl: null } });
  console.log("✓ cleared logoUrl + footerLogoUrl — AnimatedLogo/Footer will use /logos/heavix-logo.png");
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>db.$disconnect());
