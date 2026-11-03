"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

/* ============================================================
   TransactionTypePicker — selectable cards for the 6 HBR V1.1
   TransactionTypes (SALE / RENT / WANTED / QUOTE / AUCTION /
   SERVICE_REQUEST). Fetches from /api/transaction-types.

   Used in the listing wizard (step 1) and as a quick filter.
   ============================================================ */

export type TransactionTypeOption = {
  id: string;
  key: string;
  nameFa: string;
  nameEn: string | null;
  description: string | null;
  icon: string | null;
  sortOrder: number;
};

const ICON_FALLBACK: Record<string, string> = {
  SALE: "🏷️",
  RENT: "🛠️",
  WANTED: "📢",
  QUOTE: "💬",
  AUCTION: "🔨",
  SERVICE_REQUEST: "🤝",
};

export default function TransactionTypePicker({
  value,
  onChange,
  compact = false,
}: {
  value: string; // TransactionType.key
  onChange: (key: string) => void;
  compact?: boolean;
}) {
  const [types, setTypes] = useState<TransactionTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/transaction-types", { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { types: TransactionTypeOption[] };
        if (!alive) return;
        setTypes(data.types ?? []);
        // Default to SALE if nothing selected yet
        if (!value && (data.types ?? []).length > 0) {
          const sale = data.types.find((t) => t.key === "SALE");
          if (sale) onChange(sale.key);
        }
      } catch (err: any) {
        if (alive) setError(err?.message ?? "خطا در بارگذاری انواع معامله");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/45">
        <Loader2 className="h-4 w-4 animate-spin text-[#F58220]" />
        در حال بارگذاری انواع معامله…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-xs font-bold text-red-400">
        ⚠ {error}
      </div>
    );
  }

  if (types.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-6 text-center text-xs text-white/45">
        نوع معامله‌ای تعریف نشده است. می‌توانید پیش‌فرض «فروش» را ادامه دهید.
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3 ${
        compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      }`}
    >
      {types.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.key)}
            className={`group relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
              active
                ? "border-[#F58220] bg-[#F58220]/10 shadow-[0_8px_30px_-12px_rgba(245,130,32,0.45)]"
                : "border-white/10 bg-black/30 hover:border-white/25 hover:bg-black/50"
            }`}
          >
            {active && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#F58220] text-white">
                <Check className="h-3 w-3" />
              </span>
            )}
            <span className="text-2xl">{t.icon ?? ICON_FALLBACK[t.key] ?? "🛒"}</span>
            <span
              className={`text-xs font-bold transition-colors ${
                active ? "text-[#F58220]" : "text-white/80 group-hover:text-white"
              }`}
            >
              {t.nameFa}
            </span>
            {!compact && t.description && (
              <span className="mt-0.5 text-[10px] leading-4 text-white/40">
                {t.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
