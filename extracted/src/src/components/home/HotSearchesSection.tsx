import Link from "next/link";
import { Flame, TrendingUp } from "lucide-react";
import SectionTitle from "@/components/ui/SectionTitle";
import { toFa } from "@/lib/format";

export type HotSearchItem = { id: string; term: string; link: string | null; count: number; sortOrder: number };

export default function HotSearchesSection({ items, cmsConfig }: { items: HotSearchItem[]; cmsConfig?: { title?: string; subtitle?: string; description?: string } }) {
  if (items.length === 0) return null;
  return (
    <section className="relative overflow-hidden py-12">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionTitle align="center" subtitle={cmsConfig?.subtitle || "TRENDING NOW"} title={cmsConfig?.title || "داغ‌ترین بازار امروز"} description={cmsConfig?.description || "پرطرفدارترین جستجوهای ماشین‌آلات سنگین در هویکس"} />
        <div className="mx-auto mt-8 max-w-4xl">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, idx) => (
              <Link key={item.id} href={item.link || `/listings?q=${encodeURIComponent(item.term)}`} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#F58220]/40">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${idx === 0 ? "bg-[#F58220] text-white" : idx === 1 ? "bg-amber-500/20 text-amber-400" : idx === 2 ? "bg-orange-500/15 text-orange-400" : "bg-white/5 text-white/40"}`}>
                  {idx === 0 ? <Flame className="h-4 w-4" /> : toFa(idx + 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-[#F58220]">{item.term}</p>
                  {item.count > 0 && <p className="text-[11px] text-white/30">{toFa(item.count)} جستجو</p>}
                </div>
                <TrendingUp className="h-4 w-4 shrink-0 text-white/20 transition-colors group-hover:text-[#F58220]" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
