import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // Seed articles
  const articles = [
    { slug: "guide-buying-excavator", title: "راهنمای کامل خرید بیل مکانیکی دست دوم", excerpt: "هر آنچه باید قبل از خرید بیل مکانیکی دست دوم بدانید.", content: "# راهنمای کامل خرید بیل مکانیکی دست دوم\n\n## ۱. بررسی موتور\nموتور قلب بیل مکانیکی است.\n\n## ۲. سیستم هیدرولیک\nهیدرولیک ضعیف پرهزینه‌ترین خرابی است.\n\n## ۳. ساعت کارکرد\nساعت کارکرد همیشه معیار قطعی نیست.", category: "GUIDE", tags: "بیل مکانیکی,خرید,راهنما", coverImage: "/images/machinery/excavator.png", status: "PUBLISHED", publishedAt: new Date() },
    { slug: "cat-320-vs-komatsu-pc210", title: "مقایسه کاترپیلار ۳۲۰ و کوماتسو PC210", excerpt: "دو غول بیل مکانیکی ۲۰ تنی در برابر هم.", content: "# مقایسه Caterpillar 320 و Komatsu PC210\n\n## قدرت موتور\n- CAT 320: ۱۴۵ کیلووات\n- Komatsu PC210: ۱۲۳ کیلووات\n\n## مصرف سوخت\nکوماتسو PC210 در مصرف سوخت کمی بهتر عمل می‌کند.", category: "COMPARISON", tags: "کاترپیلار,کوماتسو,مقایسه", coverImage: "/images/machinery/excavator.png", status: "PUBLISHED", publishedAt: new Date() },
    { slug: "how-to-check-used-loader", title: "چگونه لودر دست دوم سالم بخریم؟", excerpt: "چک‌لیست کامل بررسی لودر دست دوم.", content: "# چگونه لودر دست دوم سالم بخریم؟\n\n## ۱. باکت و دندانه‌ها\n## ۲. گیربکس\n## ۳. سیستم فرمان\n## ۴. لاستیک‌ها", category: "GUIDE", tags: "لودر,دست دوم,خرید", coverImage: "/images/machinery/loader.png", status: "PUBLISHED", publishedAt: new Date() },
    { slug: "maintenance-tips-heavy-machinery", title: "۱۰ نکته طلایی نگهداری ماشین‌آلات سنگین", excerpt: "با رعایت این نکات، عمر مفید ماشین‌آلات خود را افزایش دهید.", content: "# ۱۰ نکته طلایی نگهداری ماشین‌آلات سنگین\n\n## ۱. روغن‌کاری به‌موقع\n## ۲. فیلترهای تمیز\n## ۳. گریس‌کاری منظم\n## ۴. بررسی روزانه", category: "TUTORIAL", tags: "نگهداری,ماشین‌آلات,سرویس", coverImage: "/images/sections/services.png", status: "PUBLISHED", publishedAt: new Date() },
  ];
  for (const a of articles) {
    const existing = await db.article.findUnique({ where: { slug: a.slug } });
    if (!existing) { await db.article.create({ data: a }); console.log("Article:", a.title); }
  }

  // Seed hot searches
  const hotSearches = [
    { term: "بیل مکانیکی ۲۰ تن", sortOrder: 0 },
    { term: "لودر کوماتسو", sortOrder: 1 },
    { term: "گریدر دست دوم", sortOrder: 2 },
    { term: "دامپ تراک اجاره", sortOrder: 3 },
    { term: "بلدوزر کاترپیلار", sortOrder: 4 },
  ];
  for (const h of hotSearches) {
    const existing = await db.hotSearch.findFirst({ where: { term: h.term } });
    if (!existing) { await db.hotSearch.create({ data: h }); console.log("HotSearch:", h.term); }
  }

  // Seed homepage sections
  const sections = [
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
    { key: "brands", title: "برندهای معتبر", order: 13, active: true, config: "{}" },
    { key: "knowledge", title: "هویکس دانش", order: 14, active: true, config: "{}" },
    { key: "cta", title: "دعوت به اقدام", order: 15, active: true, config: "{}" },
  ];
  for (const s of sections) {
    const existing = await db.homePageSection.findUnique({ where: { key: s.key } });
    if (!existing) { await db.homePageSection.create({ data: s }); }
  }
  console.log("Sections seeded");

  // Seed site settings
  await db.siteSettings.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      about: "هویکس بزرگ‌ترین مارکت‌پلیس ماشین‌آلات سنگین ایران",
      phone: "021-91008000",
      email: "info@heavix.ir",
      address: "تهران، ایران",
      workingHours: "شنبه تا پنجشنبه ۹ تا ۱۸",
      copyright: "© ۱۴۰۴ هویکس",
      newsletterEnabled: true,
    },
    update: {},
  });
  console.log("Settings seeded");

  // Seed menu items
  const menuItems = [
    { title: "ماشین‌آلات", href: "/listings", order: 1 },
    { title: "اجاره", href: "/listings?type=RENT", order: 2 },
    { title: "فروش در ۷ روز", href: "/#sell7", order: 3 },
  ];
  for (const m of menuItems) {
    const existing = await db.menuItem.findFirst({ where: { title: m.title } });
    if (!existing) { await db.menuItem.create({ data: { ...m, active: true } }); }
  }
  console.log("Menu seeded");

  console.log("✅ Essential seed complete.");
}

main().catch(console.error).finally(() => db.$disconnect());
