"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({
  value,
  size = 14,
  className,
  showValue = false,
  count,
}: {
  value: number;
  size?: number;
  className?: string;
  showValue?: boolean;
  count?: number;
}) {
  const v = Math.max(0, Math.min(5, value));
  const full = Math.floor(v);
  const frac = v - full;
  const toFa = (n: number | string) =>
    new Intl.NumberFormat("fa-IR").format(typeof n === "string" ? Number(n) : n);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center" style={{ direction: "ltr" }} aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => {
          const fillPct = i < full ? 1 : i === full ? frac : 0;
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <Star className="absolute inset-0 text-muted-foreground/30" style={{ width: size, height: size }} strokeWidth={1.5} />
              {fillPct > 0 && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct * 100}%` }}>
                  <Star className="text-amber-500 fill-amber-500" style={{ width: size, height: size }} strokeWidth={1.5} />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {showValue && <span className="num-fa text-xs font-medium">{toFa(v.toFixed(1))}</span>}
      {typeof count === "number" && count > 0 && (
        <span className="num-fa text-xs text-muted-foreground">({toFa(count)})</span>
      )}
    </div>
  );
}
