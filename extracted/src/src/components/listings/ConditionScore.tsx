"use client";

import { useState, useEffect } from "react";
import { Activity, CheckCircle2, XCircle } from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   ConditionScore — fetches listing completeness score and
   renders a visual badge with checklist details.
   ============================================================ */

export default function ConditionScore({ listingId }: { listingId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/listing-completeness?listingId=${listingId}`)
      .then((r) => r.json())
      .then((json) => {
        if (mounted) setData(json);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [listingId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0e0e0e] p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  if (!data || typeof data.score !== "number") return null;

  const tone =
    data.score >= 80
      ? { color: "#10b981", label: "عالی" }
      : data.score >= 60
        ? { color: "#F58220", label: "متوسط" }
        : { color: "#ef4444", label: "ضعیف" };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0e0e] p-4">
      <button
        onClick={() => setExpanded((s) => !s)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" style={{ color: tone.color }} />
          <span className="text-xs font-bold text-white/80">
            نمره کامل بودن آگهی
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-lg font-black"
            style={{ color: tone.color }}
          >
            {toFa(data.score)}
          </span>
          <span className="text-xs text-white/40">/۱۰۰</span>
        </div>
      </button>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${data.score}%`,
            background: tone.color,
          }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-white/40">
        <span>{tone.label}</span>
        <span>
          {toFa(data.passedCount)} از {toFa(data.totalCount)} مورد تکمیل
        </span>
      </div>

      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
          {data.checklist.map((c: any) => (
            <div
              key={c.item}
              className="flex items-center justify-between text-[11px]"
            >
              <span className="text-white/60">{c.label}</span>
              {c.passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-400/60" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
