/** Persian digit conversion + formatting helpers (HEAVIX). */

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFa(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)] ?? d);
}

export function toEnDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** Compact Toman price — e.g. 8,500,000,000 → "۸٫۵ میلیارد تومان" */
export function formatCompactPrice(price: number | bigint | null | undefined): string {
  if (price === null || price === undefined) return "";
  const n = typeof price === "bigint" ? Number(price) : price;
  if (!isFinite(n)) return "";
  if (n >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    return `${toFa(v.toFixed(v % 1 === 0 ? 0 : 1))} میلیارد تومان`;
  }
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${toFa(v.toFixed(v % 1 === 0 ? 0 : 1))} میلیون تومان`;
  }
  return `${n.toLocaleString("fa-IR")} تومان`;
}

/** Full Toman price with thousands separators — e.g. "۸٬۵۰۰٬۰۰۰٬۰۰۰ تومان" */
export function formatFullPrice(price: number | bigint | null | undefined): string {
  if (price === null || price === undefined) return "";
  const n = typeof price === "bigint" ? Number(price) : price;
  if (!isFinite(n)) return "";
  return `${n.toLocaleString("fa-IR")} تومان`;
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "لحظاتی پیش";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${toFa(min)} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${toFa(hr)} ساعت پیش`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${toFa(day)} روز پیش`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${toFa(month)} ماه پیش`;
  const year = Math.floor(month / 12);
  return `${toFa(year)} سال پیش`;
}

/** Jalali (Persian) date — uses native Intl with fa-IR locale */
export function faDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fa-IR");
}

export const PRICE_TYPE_LABELS: Record<string, string> = {
  NEGOTIABLE: "توافقی",
  FIXED: "مقطوع",
  CALL_FOR_PRICE: "تماس بگیرید",
  AUCTION: "مزایده",
};

export const CONDITION_LABELS: Record<string, string> = {
  NEW: "نو",
  USED: "کارکرده",
  REFURBISHED: "بازسازی‌شده",
  FOR_PARTS: "قطعات",
};

export const LISTING_TYPE_LABELS: Record<string, string> = {
  SALE: "فروش",
  RENT: "اجاره",
  SALE_AND_RENT: "فروش و اجاره",
};

/* ── HEAVIX Verified trust score (IronClad Assurance style) ──
   Computes a 0-100 inspection score from listing completeness,
   returns a level + label + Persian score. */
export type TrustLevel = "verified" | "good" | "basic";

export function computeTrustScore(l: {
  description?: string | null;
  price?: bigint | number | null;
  year?: number | null;
  workingHours?: number | null;
  condition?: string | null;
  province?: string | null;
  city?: string | null;
}): { score: number; level: TrustLevel; label: string; fa: string } {
  let s = 30; // base
  if (l.description && l.description.length > 60) s += 15;
  if (l.description && l.description.length > 200) s += 5;
  if (l.price != null) s += 15;
  if (l.year) s += 10;
  if (l.workingHours != null) s += 10;
  if (l.condition) s += 5;
  if (l.city && l.province) s += 5;
  if (s > 100) s = 100;
  const level: TrustLevel = s >= 85 ? "verified" : s >= 65 ? "good" : "basic";
  const label =
    level === "verified"
      ? "HEAVIX VERIFIED"
      : level === "good"
        ? "تأییدشده"
        : "اطلاعات پایه";
  return { score: s, level, label, fa: toFa(s) };
}
