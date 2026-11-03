import SellIn7TrackClient from "./TrackClient";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/* ============================================================
   /sell-in-7-days/track — server component that renders the
   tracking client. Client reads ?code= from URL on mount.
   ============================================================ */

export default async function SellIn7TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const [settings, allRootCats] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: "main" } }),
    db.category.findMany({
      where: { active: true, layer: "CATALOG", parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
  ]);

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
        <SellIn7TrackClient initialCode={code ?? ""} />
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
