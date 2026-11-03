import { ShieldCheck, BadgeCheck, Shield } from "lucide-react";
import { computeTrustScore, type TrustLevel } from "@/lib/format";

/* ============================================================
   TrustBadge — HEAVIX Verified inspection score (IronClad-style).
   Shows on listing cards and detail page.
   ============================================================ */

const LEVELS: Record<
  TrustLevel,
  { icon: typeof ShieldCheck; cls: string; ring: string }
> = {
  verified: {
    icon: ShieldCheck,
    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    ring: "ring-emerald-500/20",
  },
  good: {
    icon: BadgeCheck,
    cls: "bg-[#F58220]/15 text-[#F58220] border-[#F58220]/30",
    ring: "ring-[#F58220]/20",
  },
  basic: {
    icon: Shield,
    cls: "bg-white/5 text-white/50 border-white/10",
    ring: "ring-white/5",
  },
};

export default function TrustBadge({
  listing,
  size = "sm",
}: {
  listing: Parameters<typeof computeTrustScore>[0];
  size?: "sm" | "md" | "lg";
}) {
  const { score, level, label, fa } = computeTrustScore(listing);
  const cfg = LEVELS[level];
  const Icon = cfg.icon;
  const sizeCls =
    size === "lg"
      ? "px-3.5 py-1.5 text-xs gap-1.5"
      : size === "md"
        ? "px-3 py-1 text-[11px] gap-1.5"
        : "px-2 py-0.5 text-[10px] gap-1";

  return (
    <span
      className={`inline-flex items-center rounded-full border ${cfg.cls} ${sizeCls} font-bold ring-1 ${cfg.ring}`}
      title={`نمره کارشناسی هویکس: ${score} از ۱۰۰`}
    >
      <Icon className={size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      <span>{label}</span>
      <span className="opacity-60">·</span>
      <span className="tabular-nums">{fa}</span>
    </span>
  );
}
