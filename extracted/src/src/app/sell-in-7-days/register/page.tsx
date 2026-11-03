import SellIn7RegisterForm from "./RegisterForm";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/* ============================================================
   /sell-in-7-days/register — server component that fetches
   catalog roots + active brands + prepayment amount, then
   hands them to the client <SellIn7RegisterForm />.
   ============================================================ */

async function getPrepaymentAmount(): Promise<bigint> {
  try {
    const s = await db.siteSettings.findUnique({ where: { id: "main" } });
    if (s?.sellIn7DaysPrepaymentAmount) return s.sellIn7DaysPrepaymentAmount;
  } catch {
    /* ignore */
  }
  return 500_000n;
}

export default async function SellIn7RegisterPage() {
  const [categories, brands, settings, allRootCats] = await Promise.all([
    db.category.findMany({
      where: { active: true, layer: "CATALOG" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
    db.brand.findMany({
      where: { active: true },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        country: true,
        logoUrl: true,
      },
      take: 200,
    }),
    db.siteSettings.findUnique({ where: { id: "main" } }),
    db.category.findMany({
      where: { active: true, layer: "CATALOG", parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, icon: true },
    }),
  ]);

  const prepaymentAmount = await getPrepaymentAmount();

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header
        categories={allRootCats.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          parentId: null,
        }))}
      />
      <main className="flex-1">
        <SellIn7RegisterForm
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            parentId: c.parentId,
            icon: c.icon,
          }))}
          brands={brands.map((b) => ({
            id: b.id,
            name: b.name,
            nameEn: b.nameEn,
            slug: b.slug,
            country: b.country,
            logoUrl: b.logoUrl,
          }))}
          prepaymentAmount={prepaymentAmount.toString()}
        />
      </main>
      <Footer
        settings={
          settings
            ? {
                about: settings.about,
                phone: settings.phone,
                email: settings.email,
                address: settings.address,
                workingHours: settings.workingHours,
                copyright: settings.copyright,
                newsletterEnabled: settings.newsletterEnabled,
              }
            : null
        }
      />
    </div>
  );
}
