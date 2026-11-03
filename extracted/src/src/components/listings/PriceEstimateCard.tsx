"use client";

import { useEffect, useState } from "react";
import {
  Calculator,
  Loader2,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
  Minus,
} from "lucide-react";
import { toFa, formatCompactPrice, formatFullPrice } from "@/lib/format";

/* ============================================================
   PriceEstimateCard — public-facing price estimate card.
   Renders on the listing detail page (RTL, dark theme).

   Fetches from /api/pricing/estimate + /api/pricing/health and
   shows:
     • Estimated price range + confidence + comparable count
     • Price health (in range / below / above)
     • Legal disclaimer (spec §9):
       "این برآورد داده‌محور است و جایگزین کارشناسی حضوری نیست"
   ============================================================ */

type Estimate = {
  estimatedPrice: number | null;
  priceLower: number | null;
  priceUpper: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  comparableCount: number;
  dataFreshness: "FRESH" | "RECENT" | "STALE" | null;
  mainDrivers: string[];
  warnings: string[];
};

type Health = {
  status: "IN_RANGE" | "BELOW_RANGE" | "ABOVE_RANGE" | "INSUFFICIENT";
  askingPrice: number | null;
  estimatedLower: number | null;
  estimatedUpper: number | null;
  estimatedPrice: number | null;
  deviationPct: number | null;
};

const CONFIDENCE_LABEL: Record<string, string> = {
  HIGH: "اطمینان بالا",
  MEDIUM: "اطمینان متوسط",
  LOW: "اطمینان پایین",
  INSUFFICIENT: "داده ناکافی",
};

const HEALTH = {
  IN_RANGE: {
    label: "داخل بازه تخمینی",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  BELOW_RANGE: {
    label: "پایین‌تر از بازه",
    icon: ArrowDown,
    color: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  ABOVE_RANGE: {
    label: "بالاتر از بازه",
    icon: ArrowUp,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
  },
  INSUFFICIENT: {
    label: "داده ناکافی",
    icon: Minus,
    color: "text-white/50",
    bg: "bg-white/[0.04]",
    border: "border-white/10",
  },
} as const;

export default function PriceEstimateCard({
  listingId,
}: {
  listingId: string;
}) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [eRes, hRes] = await Promise.all([
          fetch(`/api/pricing/estimate?listingId=${encodeURIComponent(listingId)}`, {
            cache: "no-store",
          }),
          fetch(`/api/pricing/health?listingId=${encodeURIComponent(listingId)}`, {
            cache: "no-store",
          }),
        ]);
        if (!active) return;
        if (eRes.ok) {
          setEstimate((await eRes.json()) as Estimate);
        }
        if (hRes.ok) {
          setHealth((await hRes.json()) as Health);
        }
      } catch {
        if (active) setError("دریافت تخمین قیمت در دسترس نیست.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [listingId]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-3xl border border-white/10 bg-[#111] p-5 text-sm text-white/60">
        <Loader2 className="h-4 w-4 animate-spin text-[#F58220]" />
        در حال محاسبه تخمین قیمت HEAVIX…
      </div>
    );
  }

  // No estimate at all — render nothing (silent fail) to keep the page clean.
  if (error || !estimate) return null;

  const insufficient = estimate.confidence === "INSUFFICIENT" || estimate.estimatedPrice == null;
  const healthKey = health?.status ?? "INSUFFICIENT";
  const healthCfg = HEALTH[healthKey];

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#111]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F58220]/15 text-[#F58220]">
          <Calculator className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-bold text-white">تخمین قیمت HEAVIX</h2>
        <span className="mr-auto text-[10px] text-white/40">
          بر اساس {toFa(estimate.comparableCount)} مورد مشابه
        </span>
      </div>

      <div className="p-6">
        {insufficient ? (
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs leading-6 text-white/55">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>
              داده مشابه کافی برای ارائه تخمین قیمت داده‌محور در دسترس نیست.
              برای دریافت قیمت پیشنهادی با کارشناس HEAVIX تماس بگیرید.
            </span>
          </div>
        ) : (
          <>
            {/* Estimated price + range */}
            <div className="mb-4">
              <div className="text-[11px] text-white/45">قیمت تخمینی</div>
              <div className="mt-1 text-3xl font-black text-[#F58220]">
                {estimate.estimatedPrice != null
                  ? formatFullPrice(estimate.estimatedPrice)
                  : "—"}
              </div>
              {estimate.priceLower != null && estimate.priceUpper != null && (
                <div className="mt-1 text-xs text-white/55">
                  بازه تخمینی:{" "}
                  <span className="font-bold text-white/80">
                    {formatCompactPrice(estimate.priceLower)}
                  </span>{" "}
                  تا{" "}
                  <span className="font-bold text-white/80">
                    {formatCompactPrice(estimate.priceUpper)}
                  </span>
                </div>
              )}
            </div>

            {/* Confidence + freshness */}
            <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="text-[10px] text-white/45">اطمینان</div>
                <div className="mt-0.5 font-bold text-white">
                  {CONFIDENCE_LABEL[estimate.confidence] ?? estimate.confidence}
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="text-[10px] text-white/45">تازگی داده</div>
                <div className="mt-0.5 font-bold text-white">
                  {estimate.dataFreshness === "FRESH"
                    ? "تازه"
                    : estimate.dataFreshness === "RECENT"
                      ? "نسبتاً تازه"
                      : estimate.dataFreshness === "STALE"
                        ? "قدیمی"
                        : "—"}
                </div>
              </div>
            </div>

            {/* Price health */}
            {health && (
              <div
                className={`mb-4 flex items-center justify-between gap-3 rounded-xl border ${healthCfg.border} ${healthCfg.bg} p-3`}
              >
                <div className="flex items-center gap-2">
                  <healthCfg.icon className={`h-5 w-5 ${healthCfg.color}`} />
                  <div>
                    <div className="text-[10px] text-white/45">
                      وضعیت قیمت آگهی
                    </div>
                    <div className={`text-sm font-black ${healthCfg.color}`}>
                      {healthCfg.label}
                    </div>
                  </div>
                </div>
                {health.deviationPct != null && (
                  <div className="text-left text-[10px] text-white/55">
                    انحراف از میانه
                    <div className="text-sm font-bold text-white/80">
                      {toFa((health.deviationPct * 100).toFixed(0))}٪
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Main drivers */}
            {estimate.mainDrivers.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] text-white/45">
                  <TrendingUp className="h-3.5 w-3.5" />
                  عوامل مؤثر بر تخمین
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {estimate.mainDrivers.map((d, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/65"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {estimate.warnings.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {estimate.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-2.5 text-[11px] leading-5 text-amber-200/90"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[10px] leading-5 text-white/45">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
              <span>
                این برآورد داده‌محور است و جایگزین کارشناسی حضوری نیست. قیمت
                نهایی منوط به بازدید فنی و توافق طرفین است.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
