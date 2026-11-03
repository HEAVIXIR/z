"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Loader2, Activity } from "lucide-react";
import { toFa, formatCompactPrice } from "@/lib/format";

/* ============================================================
   PriceIntelligence — price analysis widget.
   Calls /api/ai-price-intelligence and shows verdict
   (UNDERPRICED / FAIR / OVERPRICED) with comparable stats.
   ============================================================ */

type PriceIntelResponse = {
  verdict?: "UNDERPRICED" | "FAIR" | "OVERPRICED";
  average?: number | string | null;
  median?: number | string | null;
  min?: number | string | null;
  max?: number | string | null;
  sampleSize?: number;
  listingPrice?: number | string | null;
  reason?: string;
  error?: string;
};

const VERDICT_CONFIG = {
  UNDERPRICED: {
    label: "زیر قیمت بازار",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: TrendingDown,
    hint: "این دستگاه نسبت به نمونه‌های مشابه ارزان‌تر است.",
  },
  FAIR: {
    label: "قیمت منصفانه",
    color: "text-[#F58220]",
    bg: "bg-[#F58220]/10",
    border: "border-[#F58220]/30",
    icon: Minus,
    hint: "قیمت دستگاه هم‌خوان با بازار است.",
  },
  OVERPRICED: {
    label: "بالاتر از بازار",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: TrendingUp,
    hint: "نسبت به نمونه‌های مشابه گران‌تر است.",
  },
} as const;

export default function PriceIntelligence({
  listingId,
  listingTitle,
}: {
  listingId: string;
  listingTitle: string;
}) {
  const [data, setData] = useState<PriceIntelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/ai-price-intelligence?listingId=${encodeURIComponent(listingId)}`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as PriceIntelResponse;
        if (!active) return;
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      } catch {
        if (active) setError("تحلیل قیمت در دسترس نیست.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [listingId]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111] p-5 text-sm text-white/60">
        <Loader2 className="h-4 w-4 animate-spin text-[#F58220]" />
        در حال تحلیل قیمت بازار...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#111] p-5 text-xs text-white/50">
        تحلیل هوشمند قیمت برای این آگهی در دسترس نیست.
      </div>
    );
  }

  const verdict = data.verdict ?? "FAIR";
  const cfg = VERDICT_CONFIG[verdict];
  const VerdictIcon = cfg.icon;

  const fmtPrice = (v: number | string | null | undefined) => {
    if (v === null || v === undefined || v === "") return "—";
    return formatCompactPrice(typeof v === "string" ? Number(v) : v);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111]">
      <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-5 py-3">
        <Activity className="h-4 w-4 text-[#F58220]" />
        <h3 className="text-sm font-bold text-white">هوش قیمت هویکس</h3>
        <span className="mr-auto text-[10px] text-white/40">
          تحلیل {toFa(data.sampleSize ?? 0)} آگهی مشابه
        </span>
      </div>

      <div className="p-5">
        {/* Verdict badge */}
        <div
          className={`mb-4 flex items-center gap-3 rounded-xl border ${cfg.border} ${cfg.bg} p-4`}
        >
          <VerdictIcon className={`h-6 w-6 ${cfg.color}`} />
          <div>
            <div className="text-[10px] text-white/45">وضعیت قیمت</div>
            <div className={`text-base font-black ${cfg.color}`}>
              {cfg.label}
            </div>
          </div>
        </div>

        {data.reason && (
          <p className="mb-4 text-xs leading-6 text-white/55">{data.reason}</p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="text-[10px] text-white/45">کمینهٔ بازار</div>
            <div className="mt-1 font-bold text-white">{fmtPrice(data.min)}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="text-[10px] text-white/45">بیشینهٔ بازار</div>
            <div className="mt-1 font-bold text-white">{fmtPrice(data.max)}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="text-[10px] text-white/45">میانگین بازار</div>
            <div className="mt-1 font-bold text-white">
              {fmtPrice(data.average)}
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="text-[10px] text-white/45">میانهٔ بازار</div>
            <div className="mt-1 font-bold text-white">
              {fmtPrice(data.median)}
            </div>
          </div>
        </div>

        <p className="mt-4 text-[10px] leading-5 text-white/35">
          این تحلیل توسط هوش مصنوعی هویکس بر اساس آگهی‌های مشابه انجام شده و
          جنبهٔ راهنمایی دارد. برای {listingTitle}
        </p>
      </div>
    </div>
  );
}
