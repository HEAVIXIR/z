/**
 * Persian label maps for the public brand catalog (HBR-1.0).
 *
 * Used by /brands directory, /brands/[slug] detail, /brand-families/[slug]
 * to render consistent Persian badges for type / status / verification.
 */

/** Brand type key → Persian label. */
export const BRAND_TYPE_LABELS: Record<string, string> = {
  MACHINE_BRAND: "ماشین‌آلات",
  VEHICLE_BRAND: "خودرو",
  PARTS_BRAND: "قطعات",
  OEM: "تولیدکننده",
  AFTERMARKET: "بازار جانبی",
  ENGINE_BRAND: "موتور",
  EQUIPMENT_BRAND: "تجهیزات",
  INDUSTRIAL_BRAND: "صنعتی",
  TECHNOLOGY_BRAND: "فناوری",
  SERVICE_BRAND: "خدمات",
  TIRE_BRAND: "لاستیک",
  LUBRICANT_BRAND: "روانکار",
  LEGACY_BRAND: "تاریخی",
  CORPORATE_BRAND: "شرکت مادر",
  BRAND_FAMILY: "خانواده برند",
};

/** Brand status key → { Persian label, badge color token }. */
export const BRAND_STATUS_LABELS: Record<
  string,
  { label: string; color: string }
> = {
  ACTIVE: { label: "فعال", color: "green" },
  LEGACY: { label: "میراثی", color: "amber" },
  HISTORICAL: { label: "تاریخی", color: "amber" },
  ACQUIRED: { label: "خریداری‌شده", color: "blue" },
  MERGED: { label: "ادغام‌شده", color: "blue" },
  DISCONTINUED: { label: "توقف تولید", color: "gray" },
  REGIONAL: { label: "منطقه‌ای", color: "blue" },
  UNKNOWN: { label: "نامشخص", color: "gray" },
  PENDING_REVIEW: { label: "در انتظار بررسی", color: "amber" },
  INACTIVE: { label: "غیرفعال", color: "gray" },
  ARCHIVED: { label: "بایگانی", color: "gray" },
};

/** Brand verification key → { Persian label, level token }. */
export const VERIFICATION_LABELS: Record<
  string,
  { label: string; level: string }
> = {
  UNVERIFIED: { label: "", level: "none" },
  DATABASE_VERIFIED: { label: "تأیید پایگاه داده", level: "sky" },
  OFFICIAL_SOURCE_VERIFIED: { label: "منبع رسمی", level: "sky" },
  MANUFACTURER_VERIFIED: { label: "تأیید سازنده", level: "emerald" },
  ADMIN_VERIFIED: { label: "تأیید مدیر", level: "emerald" },
};

/** Map a verification level token → Tailwind badge classes (dark theme). */
export function verificationBadgeClass(level: string): string {
  switch (level) {
    case "emerald":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "sky":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    default:
      return "border-white/10 bg-white/5 text-white/60";
  }
}

/** Map a status color token → Tailwind badge classes (dark theme). */
export function statusBadgeClass(color: string): string {
  switch (color) {
    case "green":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "amber":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "blue":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "gray":
    default:
      return "border-white/10 bg-white/5 text-white/60";
  }
}
