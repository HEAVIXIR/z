/**
 * HEAVIX store — frontend formatting helpers (Persian-friendly).
 *
 * Mirrors the reference project's `@/lib/format` API surface.
 */

export const toFa = (n: number | string): string => {
  const num = typeof n === "string" ? Number(String(n).replace(/[,٬\s]/g, "")) : n;
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("fa-IR").format(num);
};

export const toFaPrice = (irr: number): string =>
  new Intl.NumberFormat("fa-IR").format(Math.round(irr)) + " تومان";

export const toUsd = (usd: number): string =>
  "$" + new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(usd);

/** Convert Gregorian Date to a Persian (Jalali) formatted string using Intl. */
export function toFaDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export const ORDER_STATUS_FA: Record<string, string> = {
  PENDING: "در انتظار",
  CONFIRMED: "تایید شد",
  PROCESSING: "در حال پردازش",
  SHIPPED: "ارسال شد",
  DELIVERED: "تحویل شد",
  CANCELLED: "لغو شد",
  RETURNED: "مرجوع شد",
};

export const PAYMENT_STATUS_FA: Record<string, string> = {
  UNPAID: "پرداخت‌نشده",
  PENDING: "در انتظار بررسی",
  PARTIAL: "پرداخت جزئی",
  PAID: "پرداخت‌شده",
  APPROVED: "تأیید شد",
  REJECTED: "رد شده",
  REFUNDED: "بازگشت‌خورده",
};

export const PAYMENT_METHOD_FA: Record<string, string> = {
  CARD: "کارت/فیش",
  WALLET: "کیف پول",
  CASH: "نقدی",
  GATEWAY: "درگاه آنلاین",
};

export const SHIPMENT_STATUS_FA: Record<string, string> = {
  PENDING: "آماده‌سازی",
  DISPATCHED: "تحویل پست",
  IN_TRANSIT: "در مسیر",
  DELIVERED: "تحویل شد",
};

export const CURRENCY_SOURCE_FA: Record<string, string> = {
  MANUAL: "دستی",
  TELEGRAM: "تلگرام",
  DEFAULT: "پیش‌فرض",
};
