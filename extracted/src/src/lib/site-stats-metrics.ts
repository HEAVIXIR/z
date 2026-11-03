/* ============================================================
   FIX-STATS — pure metric constants for the SiteStat system.
   This module has NO db dependency so it is safe to import from
   Client Components (the admin page) without pulling Prisma into
   the browser bundle.
   ============================================================ */

export type StatMetric =
  | "categories"
  | "brands"
  | "listings"
  | "provinces"
  | "models"
  | "companies"
  | "users"
  | "listings_published"
  | "auctions_active"
  | "rfq_open"
  | "custom_value";

export const METRIC_OPTIONS: { value: StatMetric; label: string }[] = [
  { value: "categories", label: "دسته‌بندی‌های ریشه فعال" },
  { value: "brands", label: "برندهای فعال" },
  { value: "listings", label: "آگهی‌های منتشرشده" },
  { value: "listings_published", label: "آگهی‌های منتشرشده (مستقیم)" },
  { value: "provinces", label: "استان‌ها" },
  { value: "models", label: "مدل‌های محصول" },
  { value: "companies", label: "شرکت‌ها" },
  { value: "users", label: "کاربران" },
  { value: "auctions_active", label: "مزایده‌های فعال (LIVE)" },
  { value: "rfq_open", label: "RFQ باز" },
  { value: "custom_value", label: "مقدار ثابت (دستی)" },
];
