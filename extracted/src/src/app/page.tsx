import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero, { type HeroStat, type HeroCardListing } from "@/components/home/Hero";
import HeroSearch from "@/components/home/HeroSearch";
import type { CategoryWithCount } from "@/components/home/CategoriesSection";
import MachineCategoriesSection, { type MachineCategoryCard } from "@/components/home/MachineCategoriesSection";
import StatsSection, { type StatItem } from "@/components/home/StatsSection";
import FeaturedMachinesSection, { type FeaturedListing } from "@/components/home/FeaturedMachinesSection";
import VerifiedMachinesCarousel from "@/components/home/VerifiedMachinesCarousel";
import LatestAdsSection, { type LatestAd } from "@/components/home/LatestAdsSection";
import Sell7Section from "@/components/home/Sell7Section";
import WhyUsSection from "@/components/home/WhyUsSection";
import BrandsSection from "@/components/home/BrandsSection";
import TrustedBrandsSection, { type TrustedBrand } from "@/components/home/TrustedBrandsSection";
import CtaSection from "@/components/home/CtaSection";
import ExclusiveSaleSection from "@/components/home/ExclusiveSaleSection";
import ServicesSection from "@/components/home/ServicesSection";
import ActiveRequestsSection, { type ActiveRequest } from "@/components/home/ActiveRequestsSection";
import KnowledgeSection, { type KnowledgeCard } from "@/components/home/KnowledgeSection";
import HotSearchesSection, { type HotSearchItem } from "@/components/home/HotSearchesSection";
import RecommendationsSection from "@/components/home/RecommendationsSection";
import ScrollReveal from "@/components/ScrollReveal";
import { getActiveStats } from "@/lib/site-stats";

type TickerBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  nameEn?: string | null;
  listingCount?: number;
};

export const dynamic = "force-dynamic";

const listingInclude = {
  brand: { select: { name: true } },
  category: { select: { icon: true } },
  images: {
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] as const,
    take: 1,
  },
};

export default async function HomePage() {
  // Fetch brand + category data first
  // HBR Taxonomy V1.1: home categories section shows CATALOG layer only.
  const [allBrands, allCategories] = await Promise.all([
    db.brand.findMany({
      where: { active: true },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { listings: { where: { status: "PUBLISHED" } } } } },
      take: 20,
    }),
    db.category.findMany({
      where: { active: true, layer: "CATALOG" },
      orderBy: [{ sortOrder: "asc" }],
      include: { _count: { select: { listings: { where: { status: "PUBLISHED" } } } } },
    }),
  ]);

  // FIX-SERVICES-KNOWLEDGE-CATS-BRANDS (Part 5): fetch HomeCategoryConfig
  // so MachineCategoriesSection can decide which generation (L1 or L2) to
  // render. Falls back to { generation: 1, parentId: null } when no config
  // row exists yet (admin hasn't visited /admin/home/categories).
  const homeCategoryConfigRow = await db.homeCategoryConfig.findUnique({
    where: { id: "main" },
  });
  const homeCategoryConfig = {
    generation: homeCategoryConfigRow?.homeCategoryGeneration ?? 1,
    parentId: homeCategoryConfigRow?.homeCategoryParentId ?? null,
  };

  // FIX-ANIMATIONS-BRANDS — fetch SiteSettings early so the verified
  // section query can respect the admin's verifiedOnly toggle.
  const siteSettings = await db.siteSettings.findUnique({ where: { id: "main" } });

  // Fetch listing data
  // FIX-ANIMATIONS-BRANDS — verified section can be either verified-only
  // (default) or fall back to latest-published when the admin turns the
  // verified filter off.
  const verifiedOnlyFlag =
    siteSettings?.verifiedSectionVerifiedOnly ?? true;
  const [featuredRows, verifiedRows, latestRows] = await Promise.all([
    db.listing.findMany({
      where: { status: "PUBLISHED", featured: true },
      orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }],
      take: 8,
      include: listingInclude as any,
    }),
    db.listing.findMany({
      where: verifiedOnlyFlag
        ? { status: "PUBLISHED", verified: true }
        : { status: "PUBLISHED" },
      orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }],
      take: 8,
      include: listingInclude as any,
    }),
    db.listing.findMany({
      where: { status: "PUBLISHED", showInLatest: true },
      orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: 10,
      include: listingInclude as any,
    }),
  ]);

  // Fetch counts + extra data
  // NOTE: siteSettings is fetched above (before the listing query) so the
  // verified-section query can read its verifiedOnly flag.
  const [activeListings, brandCount, categoryCount, featuredCount, verifiedCount, requestRows, articleRows, hotSearchRows, homeSections, heroConfig] = await Promise.all([
    db.listing.count({ where: { status: "PUBLISHED" } }),
    db.brand.count({ where: { active: true } }),
    db.category.count({ where: { active: true, parentId: null, layer: "CATALOG" } }),
    db.listing.count({ where: { status: "PUBLISHED", featured: true } }),
    db.listing.count({ where: { status: "PUBLISHED", verified: true } }),
    db.buyRequest.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ verified: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    db.article.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
      take: 4,
      select: { id: true, slug: true, title: true, excerpt: true, category: true, coverImage: true, viewCount: true },
    }),
    db.hotSearch.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      take: 9,
    }),
    (async () => {
      let rows = await db.homePageSection.findMany({
        where: { active: true },
        orderBy: { order: "asc" },
      });
      if (rows.length === 0) {
        const defaults = [
          { key: "hero", title: "هیرو و جستجو", order: 1, active: true, config: "{}" },
          { key: "categories", title: "دسته‌بندی ماشین‌آلات", order: 2, active: true, config: "{}" },
          { key: "hot-searches", title: "داغ‌ترین بازار امروز", order: 3, active: true, config: "{}" },
          { key: "stats", title: "آمار پلتفرم", order: 4, active: true, config: "{}" },
          { key: "verified-machines", title: "ماشین‌آلات تأییدشدهٔ هویکس", order: 5, active: true, config: "{}" },
          { key: "featured-machines", title: "آگهی‌های ویژه", order: 6, active: true, config: "{}" },
          { key: "active-requests", title: "درخواست‌های فعال خرید", order: 7, active: true, config: "{}" },
          { key: "exclusive-sale", title: "فروش ویژه", order: 8, active: true, config: "{}" },
          { key: "services", title: "خدمات هویکس", order: 9, active: true, config: "{}" },
          { key: "latest-ads", title: "آخرین آگهی‌ها", order: 10, active: true, config: "{}" },
          { key: "sell7", title: "فروش در ۷ روز", order: 11, active: true, config: "{}" },
          { key: "why-us", title: "چرا هویکس؟", order: 12, active: true, config: "{}" },
          { key: "trusted-brands", title: "برندهای مورد اعتماد", order: 13, active: true, config: "{}" },
          { key: "brands", title: "برندهای معتبر", order: 14, active: false, config: "{}" },
          { key: "knowledge", title: "هویکس دانش", order: 15, active: true, config: "{}" },
          { key: "cta", title: "دعوت به اقدام", order: 16, active: true, config: "{}" },
        ];
        await db.homePageSection.createMany({ data: defaults });
        rows = await db.homePageSection.findMany({
          where: { active: true },
          orderBy: { order: "asc" },
        });
      }
      // Auto-seed missing sections
      const missingKeys = ["hot-searches", "verified-machines", "active-requests", "knowledge", "recommendations", "trusted-brands"].filter(
        (k) => !rows.some((r) => r.key === k),
      );
      for (const key of missingKeys) {
        const titles: Record<string, string> = {
          "hot-searches": "داغ‌ترین بازار امروز",
          "verified-machines": "ماشین‌آلات تأییدشدهٔ هویکس",
          "active-requests": "درخواست‌های فعال خرید",
          "knowledge": "هویکس دانش",
          "recommendations": "پیشنهادها برای شما",
          "trusted-brands": "برندهای مورد اعتماد",
        };
        const orders: Record<string, number> = { "hot-searches": 3, "verified-machines": 5, "active-requests": 7, "knowledge": 15, "recommendations": 5, "trusted-brands": 13 };
        const created = await db.homePageSection.create({
          data: { key, title: titles[key], order: orders[key], active: true, config: "{}" },
        });
        rows = [...rows, created];
      }
      // FIX-ANIMATIONS-BRANDS — FIX 5: the legacy "brands" (برندهای معتبر)
      // section is now redundant with "trusted-brands". Deactivate it
      // idempotently so the homepage no longer renders both. Admin can
      // re-enable it later from /admin/home if needed.
      const brandsRow = rows.find((r) => r.key === "brands");
      if (brandsRow && brandsRow.active) {
        await db.homePageSection.update({
          where: { id: brandsRow.id },
          data: { active: false },
        });
        brandsRow.active = false;
      }
      return rows;
    })(),
    db.heroConfig.findUnique({ where: { id: "main" } }),
  ]);

  // FIX-SERVICES-KNOWLEDGE-CATS-BRANDS (Part 5): build the
  // MachineCategoriesSection data based on HomeCategoryConfig.
  // Generation 1 → L1 children of the machinery root.
  // Generation 2 → L2 children of the selected L1 parent.
  const machineCategoryCards: MachineCategoryCard[] = await (async () => {
    const machinery = await db.category.findFirst({
      where: { slug: "machinery", active: true },
      select: { id: true },
    });
    if (!machinery) return [];

    let where: any;
    if (homeCategoryConfig.generation === 2 && homeCategoryConfig.parentId) {
      where = { parentId: homeCategoryConfig.parentId, active: true };
    } else {
      where = { parentId: machinery.id, active: true };
    }
    const rows = await db.category.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 12,
      include: { _count: { select: { listings: { where: { status: "PUBLISHED" } } } } },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      nameEn: c.nameEn,
      slug: c.slug,
      icon: c.icon,
      imageUrl: c.imageUrl,
      description: c.description,
      listingCount: c._count.listings,
    }));
  })();

  // FIX-SERVICES-KNOWLEDGE-CATS-BRANDS (Part 6): fetch featured /
  // showOnHomepage brands for the TrustedBrandsSection ticker.
  const trustedBrandRows = await (async () => {
    const [displayBrands, featuredBrands] = await Promise.all([
      db.brandDisplay.findMany({
        where: { showOnHomepage: true },
        select: { brandId: true },
      }),
      db.brand.findMany({
        where: { featured: true, active: true },
        select: { id: true },
      }),
    ]);
    const ids = new Set<string>([
      ...displayBrands.map((d) => d.brandId),
      ...featuredBrands.map((b) => b.id),
    ]);
    if (ids.size === 0) return [];
    const rows = await db.brand.findMany({
      where: { id: { in: Array.from(ids) }, active: true },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      take: 20,
      include: {
        _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
      },
    });
    return rows;
  })();
  const trustedBrands: TrustedBrand[] = trustedBrandRows.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    nameEn: b.nameEn,
    logoUrl: b.logoUrl,
    country: b.country,
    listingCount: b._count.listings,
  }));

  // Map data
  const categories: CategoryWithCount[] = allCategories.map((c) => ({
    id: c.id,
    name: c.name,
    nameEn: c.nameEn,
    slug: c.slug,
    icon: c.icon,
    imageUrl: c.imageUrl,
    featured: c.featured,
    parentId: c.parentId,
    listingCount: c._count.listings,
  }));

  const tickerBrands: TickerBrand[] = allBrands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logoUrl: b.logoUrl,
    nameEn: b.nameEn,
    listingCount: b._count.listings,
  }));

  const mapListing = (l: typeof featuredRows[number]) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    shortDesc: l.shortDesc,
    description: l.description,
    brandName: l.brand?.name ?? null,
    price: l.price,
    priceType: l.priceType,
    image: l.images[0]?.url ?? null,
    icon: l.category?.icon ?? null,
    year: l.year,
    city: l.city,
    province: l.province,
    workingHours: l.workingHours,
    condition: l.condition,
    featured: l.featured,
    verified: l.verified,
    viewCount: l.viewCount,
    publishedAt: l.publishedAt?.toISOString() ?? null,
  });

  const featuredListings: FeaturedListing[] = featuredRows.map(mapListing);
  const verifiedListings: FeaturedListing[] = verifiedRows.map(mapListing);
  const latestAds: LatestAd[] = latestRows.map(mapListing);

  const activeRequests: ActiveRequest[] = requestRows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    brandPref: r.brandPref,
    transaction: r.transaction,
    budgetMin: r.budgetMin ? r.budgetMin.toString() : null,
    budgetMax: r.budgetMax ? r.budgetMax.toString() : null,
    city: r.city,
    deadline: r.deadline,
    verified: r.verified,
    publishedAt: r.publishedAt?.toISOString() ?? null,
  }));

  const knowledgeCards: KnowledgeCard[] = articleRows.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    category: a.category,
    coverImage: a.coverImage,
    viewCount: a.viewCount,
  }));

  const hotSearches: HotSearchItem[] = hotSearchRows.map((h) => ({
    id: h.id,
    term: h.term,
    link: h.link,
    count: h.count,
    sortOrder: h.sortOrder,
  }));

  // FIX-STATS: dynamic homepage stats — admin-configured via SiteStat rows.
  // Falls back to live DB counts when nothing is configured yet so the page
  // never renders empty panels.
  const activeStats = await getActiveStats();

  const heroStats: HeroStat[] =
    activeStats.length > 0
      ? activeStats.slice(0, 4).map((s) => ({ value: s.value, label: s.labelFa }))
      : [
          { value: `${toFa(activeListings)}+`, label: "آگهی فعال" },
          { value: `${toFa(brandCount)}+`, label: "برند معتبر" },
          { value: `${toFa(categoryCount)}`, label: "دسته‌بندی" },
          { value: `${toFa(featuredCount)}`, label: "آگهی ویژه" },
        ];

  const statItems: StatItem[] =
    activeStats.length > 0
      ? activeStats.map((s) => ({ value: s.value, label: s.labelFa }))
      : [
          { value: activeListings, label: "آگهی فعال", suffix: "+" },
          { value: brandCount, label: "برند معتبر", suffix: "+" },
          { value: categoryCount, label: "دسته‌بندی اصلی", suffix: "" },
          { value: 31, label: "استان تحت پوشش", suffix: "" },
        ];

  const liveCount = toFa(activeListings);

  /* FIX-LISTINGS-HERO — fetch the listings referenced by the hero's tilted
     cards so the homepage hero can render real listing data (image + title
     + price + link) instead of a static image. Each lookup is defensive: a
     deleted/non-PUBLISHED listing is silently dropped (the Hero component
     then falls back to the static card image). */
  const heroCardListingIds = [
    heroConfig?.cardServicesListingId,
    heroConfig?.cardFeaturedListingId,
    heroConfig?.cardExclusiveListingId,
  ].filter((id): id is string => typeof id === "string" && id.length > 0);

  const heroCardListingRows = heroCardListingIds.length > 0
    ? await db.listing.findMany({
        where: { id: { in: heroCardListingIds }, status: "PUBLISHED" },
        include: {
          brand: { select: { name: true } },
          images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] as const, take: 1 },
        },
      })
    : [];

  const mapHeroCardListing = (id: string | null | undefined): HeroCardListing | null => {
    if (!id) return null;
    const l = heroCardListingRows.find((r) => r.id === id);
    if (!l) return null;
    return {
      slug: l.slug,
      title: l.title,
      price: l.price ? l.price.toString() : null,
      priceType: l.priceType,
      image: l.images[0]?.url ?? null,
      brandName: l.brand?.name ?? null,
    };
  };
  const heroCardServicesListing = mapHeroCardListing(heroConfig?.cardServicesListingId);
  const heroCardFeaturedListing = mapHeroCardListing(heroConfig?.cardFeaturedListingId);
  const heroCardExclusiveListing = mapHeroCardListing(heroConfig?.cardExclusiveListingId);

  const heroCfg = heroConfig ? {
    badge: heroConfig.badge,
    title1: heroConfig.title1,
    highlight: heroConfig.highlight,
    subtitle: heroConfig.subtitle,
    buttonText: heroConfig.buttonText,
    buttonLink: heroConfig.buttonLink,
    secondBtnText: heroConfig.secondBtnText,
    secondBtnLink: heroConfig.secondBtnLink,
    slide1: heroConfig.slide1,
    slide2: heroConfig.slide2,
    slide3: heroConfig.slide3,
    cardServicesImg: heroConfig.cardServicesImg,
    cardFeaturedImg: heroConfig.cardFeaturedImg,
    cardExclusiveImg: heroConfig.cardExclusiveImg,
    cardServicesListingId: heroConfig.cardServicesListingId,
    cardFeaturedListingId: heroConfig.cardFeaturedListingId,
    cardExclusiveListingId: heroConfig.cardExclusiveListingId,
    animationType: heroConfig.animationType,
    statsWidth: heroConfig.statsWidth,
    cardHeight: heroConfig.cardHeight,
    cardWidth: heroConfig.cardWidth,
    titleFontSize: heroConfig.titleFontSize,
    badgeAlign: heroConfig.badgeAlign,
    titleAlign: heroConfig.titleAlign,
    highlightAlign: heroConfig.highlightAlign,
    subtitleAlign: heroConfig.subtitleAlign,
    buttonAlign: heroConfig.buttonAlign,
    statsWidthCustom: heroConfig.statsWidthCustom,
    statsPaddingCustom: heroConfig.statsPaddingCustom,
    statsGapCustom: heroConfig.statsGapCustom,
    cardWidthCustom: heroConfig.cardWidthCustom,
    cardHeightCustom: heroConfig.cardHeightCustom,
    cardGapCustom: heroConfig.cardGapCustom,
    cardRadiusCustom: heroConfig.cardRadiusCustom,
    titleFontSizeCustom: heroConfig.titleFontSizeCustom,
    subtitleFontSizeCustom: heroConfig.subtitleFontSizeCustom,
    badgeFontSizeCustom: heroConfig.badgeFontSizeCustom,
    buttonPaddingYCustom: heroConfig.buttonPaddingYCustom,
    buttonPaddingXCustom: heroConfig.buttonPaddingXCustom,
    heroMinHeightCustom: heroConfig.heroMinHeightCustom,
    contentMaxWidthCustom: heroConfig.contentMaxWidthCustom,
    contentGapCustom: heroConfig.contentGapCustom,
    slideOpacityCustom: heroConfig.slideOpacityCustom,
    slideIntervalCustom: heroConfig.slideIntervalCustom,
    overlayColorCustom: heroConfig.overlayColorCustom,
  } : null;

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header
        categories={categories}
        siteSettings={
          siteSettings
            ? {
                logoUrl: siteSettings.logoUrl,
                logoAnimationDurationMs: siteSettings.logoAnimationDurationMs,
              }
            : undefined
        }
      />
      <main className="flex-1">
        {homeSections
          .filter((s) => s.active)
          .sort((a, b) => a.order - b.order)
          .map((section) => {
            const key = section.key as string;
            const cms = {
              title: section.title,
              subtitle: section.subtitle ?? undefined,
              description: section.description ?? undefined,
            };
            switch (key) {
              case "hero":
                return (
                  <div key={section.id}>
                    <Hero
                      stats={heroStats}
                      config={heroCfg}
                      cardServicesListing={heroCardServicesListing}
                      cardFeaturedListing={heroCardFeaturedListing}
                      cardExclusiveListing={heroCardExclusiveListing}
                    />
                    <HeroSearch
                      categories={categories.map((c) => ({
                        id: c.id,
                        name: c.name,
                        slug: c.slug,
                        parentId: c.parentId,
                      }))}
                      brands={allBrands.map((b) => ({ id: b.id, name: b.name, slug: b.slug }))}
                      liveCount={liveCount}
                    />
                  </div>
                );
              case "categories":
                return (
                  <ScrollReveal key={section.id}>
                    <MachineCategoriesSection
                      categories={machineCategoryCards}
                      config={homeCategoryConfig}
                      cmsConfig={cms}
                    />
                  </ScrollReveal>
                );
              case "hot-searches":
                return hotSearches.length > 0 ? (
                  <ScrollReveal key={section.id} delay={80}>
                    <HotSearchesSection items={hotSearches} cmsConfig={cms} />
                  </ScrollReveal>
                ) : null;
              case "stats":
                return (
                  <ScrollReveal key={section.id} delay={100}>
                    <StatsSection items={statItems} cmsConfig={cms} />
                  </ScrollReveal>
                );
              case "recommendations":
                return (
                  <ScrollReveal key={section.id} delay={120}>
                    <RecommendationsSection />
                  </ScrollReveal>
                );
              case "verified-machines":
                return verifiedListings.length > 0 ? (
                  <ScrollReveal key={section.id} delay={120}>
                    <VerifiedMachinesCarousel
                      listings={verifiedListings}
                      cmsConfig={cms}
                      limit={siteSettings?.verifiedSectionLimit ?? undefined}
                    />
                  </ScrollReveal>
                ) : null;
              case "featured-machines":
                return featuredListings.length > 0 ? (
                  <ScrollReveal key={section.id} delay={150}>
                    <FeaturedMachinesSection listings={featuredListings} cmsConfig={cms} />
                  </ScrollReveal>
                ) : null;
              case "active-requests":
                return activeRequests.length > 0 ? (
                  <ScrollReveal key={section.id} delay={100}>
                    <ActiveRequestsSection requests={activeRequests} cmsConfig={cms} />
                  </ScrollReveal>
                ) : null;
              case "exclusive-sale":
                return (
                  <ScrollReveal key={section.id} delay={100}>
                    <ExclusiveSaleSection cmsConfig={cms} />
                  </ScrollReveal>
                );
              case "services":
                return (
                  <ScrollReveal key={section.id} delay={100}>
                    <ServicesSection cmsConfig={cms} />
                  </ScrollReveal>
                );
              case "latest-ads":
                return latestAds.length > 0 ? (
                  <ScrollReveal key={section.id} delay={100}>
                    <LatestAdsSection ads={latestAds} cmsConfig={cms} />
                  </ScrollReveal>
                ) : null;
              case "sell7":
                return (
                  <ScrollReveal key={section.id} id="sell7">
                    <Sell7Section cmsConfig={cms} />
                  </ScrollReveal>
                );
              case "why-us":
                return (
                  <ScrollReveal key={section.id} id="about" delay={100}>
                    <WhyUsSection cmsConfig={cms} />
                  </ScrollReveal>
                );
              case "brands":
                return (
                  <ScrollReveal key={section.id} id="brands">
                    <BrandsSection brands={tickerBrands} totalBrands={brandCount} cmsConfig={cms} />
                  </ScrollReveal>
                );
              case "trusted-brands":
                return trustedBrands.length > 0 ? (
                  <TrustedBrandsSection
                    key={section.id}
                    brands={trustedBrands}
                    totalBrands={brandCount}
                    title={siteSettings?.trustedBrandsTitle ?? undefined}
                    subtitle={siteSettings?.trustedBrandsSubtitle ?? undefined}
                    description={siteSettings?.trustedBrandsDescription ?? undefined}
                    tickerSpeed={
                      siteSettings?.trustedBrandsTickerSpeed ?? undefined
                    }
                  />
                ) : null;
              case "knowledge":
                return knowledgeCards.length > 0 ? (
                  <ScrollReveal key={section.id} delay={100}>
                    <KnowledgeSection articles={knowledgeCards} cmsConfig={cms} />
                  </ScrollReveal>
                ) : null;
              case "cta":
                return (
                  <ScrollReveal key={section.id} delay={100}>
                    <CtaSection cmsConfig={cms} />
                  </ScrollReveal>
                );
              default:
                return null;
            }
          })}
      </main>
      <Footer
        settings={
          siteSettings
            ? {
                about: siteSettings.about,
                phone: siteSettings.phone,
                email: siteSettings.email,
                address: siteSettings.address,
                workingHours: siteSettings.workingHours,
                copyright: siteSettings.copyright,
                newsletterEnabled: siteSettings.newsletterEnabled,
                footerLogoUrl: siteSettings.footerLogoUrl,
                footerLogoHeight: siteSettings.footerLogoHeight ?? 48,
                footerLogoPosition: siteSettings.footerLogoPosition ?? "center",
                footerHeavixLogoUrl: siteSettings.footerHeavixLogoUrl,
                footerMekanixLogoUrl: siteSettings.footerMekanixLogoUrl,
                footerAriaLogoUrl: siteSettings.footerAriaLogoUrl,
              }
            : null
        }
      />
    </div>
  );
}
