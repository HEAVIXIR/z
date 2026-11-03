"use client";

import { useMemo, useState } from "react";
import {
  Calculator,
  Truck,
  ShieldCheck,
  Wrench,
  Coins,
  Info,
} from "lucide-react";
import { toFa, formatFullPrice } from "@/lib/format";

/* ============================================================
   TotalCostCalculator — estimated total cost breakdown.

   Shows:
     - Machine price (passed from listing)
     - Estimated transport (based on province)
     - Estimated inspection (fixed tiers)
     - Estimated parts (small % of price)

   Everything marked "برآورد" (estimate). Not guaranteed.
   ============================================================ */

/* Per-province transport estimate (Toman) — simple lookup.
   Provinces closer to Tehran hub get cheaper rates. */
const PROVINCE_TRANSPORT: Record<string, number> = {
  تهران: 1_500_000,
  البرز: 1_800_000,
  قزوین: 2_200_000,
  قم: 2_000_000,
  مرکزی: 2_500_000,
  گیلان: 3_000_000,
  مازندران: 3_000_000,
  گلستان: 3_400_000,
  اصفهان: 3_200_000,
  فارس: 4_200_000,
  خوزستان: 4_500_000,
  کرمانشاه: 4_000_000,
  کردستان: 4_200_000,
  همدان: 3_400_000,
  لرستان: 3_600_000,
  آذربایجان_شرقی: 4_000_000,
  آذربایجان_غربی: 4_400_000,
  اردبیل: 3_800_000,
  زنجان: 2_800_000,
  سمنان: 2_400_000,
  خراسان_رضوی: 4_800_000,
  خراسان_شمالی: 4_600_000,
  خراسان_جنوبی: 4_800_000,
  کرمان: 5_000_000,
  یزد: 3_800_000,
  بوشهر: 4_800_000,
  هرمزگان: 5_200_000,
  سیستان_و_بلوچستان: 6_000_000,
  ایلام: 4_400_000,
  کهگیلویه_و_بویراحمد: 4_600_000,
  چهارمحال_و_بختیاری: 4_200_000,
};

const INSPECTION_TIERS = [
  { id: "basic", label: "کارشناسی پایه", cost: 1_500_000, desc: "مشاهده ظاهری + مدارک" },
  { id: "standard", label: "کارشناسی استاندارد", cost: 3_000_000, desc: "بازرسی فنی + تست عملکرد" },
  { id: "deep", label: "کارشناسی تخصصی", cost: 5_500_000, desc: "بازرسی کامل + دیاگ + گزارش مکتوب" },
];

export default function TotalCostCalculator({
  price,
  province,
  listingTitle,
}: {
  price: number | string | null;
  province?: string | null;
  listingTitle: string;
}) {
  const [inspectionTier, setInspectionTier] = useState("standard");
  const [includeParts, setIncludeParts] = useState(true);

  const priceNum = useMemo(() => {
    if (price === null || price === undefined || price === "") return null;
    const n = typeof price === "string" ? Number(price) : Number(price);
    return Number.isFinite(n) ? n : null;
  }, [price]);

  const transportEstimate = useMemo(() => {
    if (!province) return 3_000_000; // default mid-tier
    return PROVINCE_TRANSPORT[province] ?? 4_000_000;
  }, [province]);

  const inspectionCost =
    INSPECTION_TIERS.find((t) => t.id === inspectionTier)?.cost ?? 3_000_000;

  const partsEstimate = useMemo(() => {
    if (!priceNum || !includeParts) return 0;
    // ~1.5% of machine price as initial parts reserve (filters, oils, wear items)
    return Math.round(priceNum * 0.015);
  }, [priceNum, includeParts]);

  const total =
    (priceNum ?? 0) + transportEstimate + inspectionCost + partsEstimate;

  const rows = [
    {
      icon: Coins,
      label: "قیمت دستگاه",
      value: priceNum ?? 0,
      hint: listingTitle,
      estimate: false,
    },
    {
      icon: Truck,
      label: "حمل و نقل (برآورد)",
      value: transportEstimate,
      hint: province ? `استان ${province}` : "میانگین کشوری",
      estimate: true,
    },
    {
      icon: ShieldCheck,
      label: "کارشناسی هویکس (برآورد)",
      value: inspectionCost,
      hint: INSPECTION_TIERS.find((t) => t.id === inspectionTier)?.label,
      estimate: true,
    },
    {
      icon: Wrench,
      label: "قطعات یدکی اولیه (برآورد)",
      value: partsEstimate,
      hint: includeParts ? "حدود ۱.۵٪ قیمت دستگاه" : "غیرفعال",
      estimate: true,
    },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 bg-gradient-to-l from-[#F58220]/10 to-transparent px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F58220]/15">
          <Calculator className="h-5 w-5 text-[#F58220]" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-black text-white">ماشینِ حساب هزینه کل</h3>
          <p className="mt-0.5 text-[11px] text-white/50">
            برآورد هزینه‌های جانبی خرید این دستگاه
          </p>
        </div>
      </div>

      <div className="p-5">
        {/* Inspection tier picker */}
        <div className="mb-4">
          <div className="mb-2 text-[11px] font-bold text-white/55">
            سطح کارشناسی را انتخاب کنید:
          </div>
          <div className="grid grid-cols-3 gap-2">
            {INSPECTION_TIERS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setInspectionTier(t.id)}
                className={`rounded-xl border p-2 text-center transition ${
                  inspectionTier === t.id
                    ? "border-[#F58220]/50 bg-[#F58220]/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <div
                  className={`text-[10px] font-bold ${
                    inspectionTier === t.id ? "text-[#F58220]" : "text-white/70"
                  }`}
                >
                  {t.label}
                </div>
                <div className="mt-0.5 text-[10px] text-white/40">
                  {toFa((t.cost / 1_000_000).toFixed(1))} م ت
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Parts toggle */}
        <label className="mb-4 flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
          <span className="flex items-center gap-2 text-[11px] text-white/65">
            <Wrench className="h-3.5 w-3.5 text-[#F58220]" />
            شامل قطعات یدکی اولیه (~۱.۵٪ قیمت)
          </span>
          <input
            type="checkbox"
            checked={includeParts}
            onChange={(e) => setIncludeParts(e.target.checked)}
            className="h-4 w-4 accent-[#F58220]"
          />
        </label>

        {/* Rows */}
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
            >
              <r.icon className="h-4 w-4 shrink-0 text-[#F58220]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-white/80">{r.label}</span>
                  {r.estimate && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                      برآورد
                    </span>
                  )}
                </div>
                <div className="truncate text-[10px] text-white/40">{r.hint}</div>
              </div>
              <div className="shrink-0 text-left text-[12px] font-bold text-white">
                {r.value > 0 ? formatFullPrice(r.value) : "—"}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#F58220]/30 bg-[#F58220]/[0.07] p-4">
          <div>
            <div className="text-[11px] text-white/55">برآورد هزینه کل</div>
            <div className="text-[10px] text-white/35">
              شامل قیمت دستگاه + خدمات جانبی
            </div>
          </div>
          <div className="text-left">
            <div className="text-xl font-black text-[#F58220]">
              {formatFullPrice(total)}
            </div>
            <div className="text-[10px] text-white/40">تومان</div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[10px] leading-5 text-white/45">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
          <span>
            همهٔ مبالغ به جز قیمت دستگاه، <b className="text-white/70">برآورد</b>{" "}
            هستند و به‌منظور پیش‌بینی اولیه ارائه می‌شوند. هزینه‌های نهایی
            ممکن است بسته به مسیر حمل، وضعیت دستگاه و توافق با کارشناس متفاوت
            باشند. هویکس این برآوردها را تضمین نمی‌کند.
          </span>
        </div>
      </div>
    </div>
  );
}
