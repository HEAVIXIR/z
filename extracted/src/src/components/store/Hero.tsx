"use client";

import { ShieldCheck, Truck, Wrench, Sparkles, ChevronLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Part } from "@/lib/store-types";
import { toFa, toFaPrice } from "@/lib/store-format";
import { Stars } from "./Stars";

export function Hero({
  featured,
  currencyRate,
  onSelectPart,
  onSeeAll,
  onOpenMechanics,
}: {
  featured: Part[];
  currencyRate: number;
  onSelectPart: (p: Part) => void;
  onSeeAll: () => void;
  onOpenMechanics: () => void;
}) {
  return (
    <section className="border-b border-border/60 bg-gradient-to-b from-secondary/40 via-background to-background">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-8 sm:py-12 grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        {/* left: copy */}
        <div className="flex flex-col justify-center gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-success/15 text-success border-success/30">
              <ShieldCheck className="size-3" /> ضمانت اصالت کالا
            </Badge>
            <Badge variant="secondary" className="bg-warning/15 text-amber-700 border-amber-300/50">
              <Truck className="size-3" /> ارسال به سراسر ایران
            </Badge>
            <Badge variant="secondary" className="bg-secondary text-foreground border-border">
              <Sparkles className="size-3" /> نرخ روز دلار
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black leading-tight">
            قطعات خودرو و ماشین‌آلات خود را آنلاین و مطمئن بخرید
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
            جستجوی قطعه با مدل خودرو، مقایسه قیمت‌ها، مشاهده نظرات خریداران و
            پرداخت امن از طریق درگاه آنلاین یا آپلود فیش بانکی. قیمت نهایی به نرخ
            روز دلار محاسبه می‌شود.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" className="gap-2 h-11 bg-[#F58220] hover:bg-[#ff8c38]" onClick={onSeeAll}>
              مشاهده همه قطعات
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 h-11" onClick={onOpenMechanics}>
              <Wrench className="size-4" />
              تعمیرکاران همکار
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-2">
            {[
              { k: "+۱۰", v: "قطعه فعال" },
              { k: "۷", v: "مدل خودرو" },
              { k: toFa(currencyRate.toLocaleString("en-US")) + " ت", v: "نرخ امروز دلار" },
            ].map((s) => (
              <div key={s.v} className="rounded-lg border border-border/70 bg-background p-3 text-center">
                <div className="text-base sm:text-lg font-bold num-fa">{s.k}</div>
                <div className="text-[11px] text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* right: featured strip */}
        <div className="rounded-2xl border border-border/70 bg-card shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              <h3 className="font-bold text-sm">قطعات منتخب</h3>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onSeeAll}>
              مشاهده همه
            </Button>
          </div>
          {featured.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">قطعه‌ای یافت نشد</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto scrollbar-slim pl-1">
              {featured.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPart(p)}
                  className="group text-right rounded-lg border border-border/70 bg-background p-2.5 hover:border-foreground/40 hover:shadow-md transition-all"
                >
                  <PartImage part={p} className="h-28 sm:h-32" />
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground">{p.brand?.name || "—"}</div>
                    <div className="font-medium text-sm line-clamp-1">{p.nameFa || p.name}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="num-fa text-sm font-bold text-foreground">{toFaPrice(p.priceIrr)}</span>
                      {p.discountPercent ? (
                        <Badge className="bg-danger text-danger-foreground text-[10px] h-5">٪{toFa(p.discountPercent)} تخفیف</Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <Stars value={p.ratingAvg} count={p.ratingCount} size={12} />
                      {p.featured && (
                        <Badge className="bg-amber-500/15 text-amber-700 border-amber-300/50 text-[10px] h-5">ویژه</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function PartImage({ part, className }: { part: { images?: string[]; nameFa?: string | null; name: string }; className?: string }) {
  const first = Array.isArray(part.images) && part.images.length > 0 ? part.images[0] : null;
  if (first) {
    return (
      <div className={cn("relative w-full rounded-md overflow-hidden bg-secondary/50", className)}>
        <img src={first} alt={part.nameFa || part.name} className="absolute inset-0 w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={cn("w-full rounded-md bg-gradient-to-br from-secondary to-secondary/40 grid place-items-center text-muted-foreground/40", className)}>
      <Package className="size-8" strokeWidth={1.5} />
    </div>
  );
}
