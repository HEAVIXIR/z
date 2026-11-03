import { storeDb } from "@/lib/store-db";

/**
 * HEAVIX store — currency helpers (server-side).
 *
 * Reads the store's own `CurrencyRate` + `CurrencySetting` tables
 * (NOT the HEAVIX main db). Returns the effective USD→Toman rate for
 * "today" (Asia/Tehran), with the manual-override → auto-telegram →
 * default fallback chain.
 */

/** Today's date string in Asia/Tehran (YYYY-MM-DD). */
export function todayTehran(date = new Date()): string {
  const tehran = new Date(date.getTime() + (3.5 * 60 + date.getTimezoneOffset()) * 60000);
  const y = tehran.getUTCFullYear();
  const m = String(tehran.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tehran.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface EffectiveRate {
  rate: number;
  marginPercent: number;
  source: "MANUAL" | "TELEGRAM" | "DEFAULT";
  date: string;
}

export async function getEffectiveRate(): Promise<EffectiveRate> {
  const today = todayTehran();
  const setting = await storeDb.currencySetting.findUnique({ where: { id: "singleton" } });
  const margin = setting?.marginPercent ?? 0;
  const defaultRate = setting?.defaultRate ?? 230000;

  // 1) Manual / Telegram override for today wins
  const daily = await storeDb.currencyRate.findUnique({ where: { date: today } });
  if (daily) {
    return {
      rate: daily.rate,
      marginPercent: daily.marginPercent ?? margin,
      source: daily.source === "TELEGRAM" ? "TELEGRAM" : "MANUAL",
      date: today,
    };
  }

  // 2) Auto-fetched rate (refreshed by the Telegram mini-service / on-demand)
  if (setting?.autoUpdateEnabled && setting.lastAutoRate) {
    return { rate: setting.lastAutoRate, marginPercent: margin, source: "TELEGRAM", date: today };
  }

  // 3) Fallback default
  return { rate: defaultRate, marginPercent: margin, source: "DEFAULT", date: today };
}

export function usdToIrr(usd: number, eff: { rate: number; marginPercent: number }): number {
  const withMargin = eff.rate * (1 + (eff.marginPercent || 0) / 100);
  return Math.round(usd * withMargin);
}

export function formatIrr(irr: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(irr)) + " تومان";
}

export function formatUsd(usd: number): string {
  return "$" + new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(usd);
}
