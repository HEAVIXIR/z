"use client";
import { Activity, Star } from "lucide-react";
import type { HeroStat } from "./Hero";

export default function HeroStatsPanel({ stats, paddingCustom, gapCustom, widthCustom }: { stats: HeroStat[]; paddingCustom?: string | null; gapCustom?: string | null; widthCustom?: string | null; }) {
  if (!stats || stats.length === 0) return null;
  const asideStyle: React.CSSProperties = { ...(widthCustom ? { width: widthCustom, maxWidth: widthCustom } : {}), ...(paddingCustom ? { padding: paddingCustom } : {}) };
  const rowsStyle: React.CSSProperties = gapCustom ? { gap: gapCustom } : {};
  return (
    <aside className="w-[clamp(140px,16vw,200px)] shrink-0 rounded-2xl border border-white/10 bg-[#0c0c0c]/90 p-4 backdrop-blur" style={asideStyle}>
      <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#F58220] text-[#F58220]"><Activity className="h-3.5 w-3.5" /></span>
        <div className="min-w-0"><div className="text-[11px] font-black text-white">آمار لحظه‌ای</div><div className="mt-0.5 truncate text-[8px] text-white/40">HEAVIX NETWORK</div></div>
      </div>
      <div className="space-y-2.5" style={rowsStyle}>
        {stats.slice(0, 4).map((s) => (<div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"><div className="flex items-center gap-2"><Star className="h-3.5 w-3.5 shrink-0 text-[#F58220]" /><div className="min-w-0"><div className="text-base font-black leading-5 text-white">{s.value}</div><div className="truncate text-[9px] text-white/40">{s.label}</div></div></div></div>))}
      </div>
      <div className="mt-3 flex items-center gap-1 text-[8px] font-bold text-[#F58220]">+ آپدیت لحظه‌ای</div>
    </aside>
  );
}
