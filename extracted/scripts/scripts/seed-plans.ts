import { db } from "../src/lib/db";

async function main() {
  const plans = [
    {
      code: "BASIC",
      nameFa: "پایه",
      nameEn: "Basic",
      description: "مناسب فروشگاه‌های فردی و تازه‌کار",
      priceMonthly: 0n,
      priceYearly: 0n,
      featuredCredits: 0,
      maxListings: 5,
      maxImages: 8,
      supportLevel: "BASIC",
      sortOrder: 1,
      active: true,
      popular: false,
      featuresJson: JSON.stringify(["۵ آگهی فعال","۸ تصویر برای هر آگهی","نمایش در نتایج جستجو","پنل کاربری ساده"]),
    },
    {
      code: "PRO",
      nameFa: "حرفه‌ای",
      nameEn: "Pro",
      description: "برترین انتخاب شرکت‌های متوسط و نمایندگی‌ها",
      priceMonthly: 2900000n,
      priceYearly: 29000000n,
      featuredCredits: 10,
      analyticsAccess: true,
      aiAssistantAccess: true,
      priorityLeads: true,
      maxListings: 50,
      maxImages: 16,
      verifiedBadge: true,
      supportLevel: "PRIORITY",
      sortOrder: 2,
      active: true,
      popular: true,
      featuresJson: JSON.stringify(["۵۰ آگهی فعال","۱۶ تصویر برای هر آگهی","۱۰ اعتبار آگهی ویژه","دسترسی به تحلیل بازار","دسترسی به دستیار هوش مصنوعی","اولویت در سرنخ‌ها","نشان تأییدشده","پشتیبانی اولویت‌دار"]),
    },
    {
      code: "PREMIUM",
      nameFa: "ویژه",
      nameEn: "Premium",
      description: "راهکار کامل برای نمایندگی‌های رسمی و شرکت‌های بزرگ",
      priceMonthly: 8900000n,
      priceYearly: 89000000n,
      featuredCredits: 50,
      analyticsAccess: true,
      aiAssistantAccess: true,
      priorityLeads: true,
      companyPage: true,
      maxListings: 0,
      maxImages: 32,
      verifiedBadge: true,
      supportLevel: "DEDICATED",
      sortOrder: 3,
      active: true,
      popular: false,
      featuresJson: JSON.stringify(["آگهی نامحدود","۳۲ تصویر برای هر آگهی","۵۰ اعتبار آگهی ویژه","دسترسی کامل به تحلیل بازار","دسترسی کامل به دستیار هوش مصنوعی","اولویت ویژه در سرنخ‌ها","صفحه شرکت اختصاصی","نشان تأییدشده طلایی","پشتیبانی اختصاصی ۲۴/۷"]),
    },
  ];
  for (const p of plans) {
    await db.subscriptionPlan.upsert({
      where: { code: p.code },
      create: p,
      update: p,
    });
    console.log("✓ plan", p.code);
  }
  console.log("done");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
