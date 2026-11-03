"use client";

import { useMemo } from "react";
import { SlidersHorizontal, X, Star, Filter, ChevronLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Part, Category, Brand } from "@/lib/store-types";
import { toFa, toFaPrice } from "@/lib/store-format";
import { Stars } from "./Stars";
import { PartImage } from "./Hero";

export type SortOption = "newest" | "price-asc" | "price-desc" | "popular" | "bestseller";

export interface PartsFilters {
  q: string;
  categoryId: string;
  brandId: string;
  sort: SortOption;
  onlyInStock: boolean;
  onlyDiscount: boolean;
}

interface Props {
  parts: Part[];
  loading: boolean;
  filters: PartsFilters;
  setFilters: (f: Partial<PartsFilters>) => void;
  categories: Category[];
  brands: Brand[];
  totalCount: number;
  onOpenPart: (p: Part) => void;
  onAddToCart: (p: Part) => void;
  wishlistPartIds: string[];
  onToggleWishlist: (p: Part) => void;
  resetAll: () => void;
}

export function PartsGrid({
  parts,
  loading,
  filters,
  setFilters,
  categories,
  brands,
  totalCount,
  onOpenPart,
  onAddToCart,
  wishlistPartIds,
  onToggleWishlist,
  resetAll,
}: Props) {
  // flatten categories for the sidebar list
  const flatCategories = useMemo(() => {
    const out: { id: string; name: string; depth: number }[] = [];
    const walk = (cs: Category[], depth = 0) => {
      for (const c of cs) {
        out.push({ id: c.id, name: c.name, depth });
        if (c.children?.length) walk(c.children, depth + 1);
      }
    };
    walk(categories);
    return out;
  }, [categories]);

  const sortLabels: Record<SortOption, string> = {
    newest: "جدیدترین",
    "price-asc": "ارزان‌ترین",
    "price-desc": "گران‌ترین",
    popular: "محبوب‌ترین",
    bestseller: "پرفروش‌ترین",
  };

  const activeFilterCount =
    (filters.categoryId ? 1 : 0) +
    (filters.brandId ? 1 : 0) +
    (filters.onlyInStock ? 1 : 0) +
    (filters.onlyDiscount ? 1 : 0) +
    (filters.q ? 1 : 0);

  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 py-6 grid gap-5 lg:grid-cols-[260px_1fr]">
      {/* sidebar */}
      <aside className="lg:sticky lg:top-[7.5rem] lg:self-start space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            <h3 className="font-bold text-sm">فیلترها</h3>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 text-[10px]">{toFa(activeFilterCount)}</Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetAll}>
              <X className="size-3" />
              پاک کردن
            </Button>
          )}
        </div>

        <Card className="p-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">دسته‌بندی</Label>
            <Select
              value={filters.categoryId || "ALL"}
              onValueChange={(v) => setFilters({ categoryId: v === "ALL" ? "" : v })}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="همه دسته‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">همه دسته‌ها</SelectItem>
                <SelectGroup>
                  {flatCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {"— ".repeat(c.depth) + c.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">برند</Label>
            <Select
              value={filters.brandId || "ALL"}
              onValueChange={(v) => setFilters({ brandId: v === "ALL" ? "" : v })}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="همه برندها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">همه برندها</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                    {b.country ? ` — ${b.country}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">مرتب‌سازی</Label>
            <Select
              value={filters.sort}
              onValueChange={(v) => setFilters({ sort: v as SortOption })}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(sortLabels) as SortOption[]).map((k) => (
                  <SelectItem key={k} value={k}>{sortLabels[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={filters.onlyInStock}
                onCheckedChange={(v) => setFilters({ onlyInStock: v === true })}
                id="in-stock"
              />
              <Label htmlFor="in-stock" className="cursor-pointer">فقط موجودها</Label>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={filters.onlyDiscount}
                onCheckedChange={(v) => setFilters({ onlyDiscount: v === true })}
                id="discount"
              />
              <Label htmlFor="discount" className="cursor-pointer">فقط تخفیف‌دار</Label>
            </label>
          </div>
        </Card>

        <Button variant="outline" className="w-full lg:hidden" onClick={resetAll}>
          <Filter className="size-4" />
          پاک کردن فیلترها
        </Button>
      </aside>

      {/* results */}
      <div className="space-y-4 min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm text-muted-foreground">
            {loading ? (
              "در حال بارگذاری..."
            ) : (
              <>
                <span className="num-fa font-bold text-foreground">{toFa(totalCount)}</span> قطعه یافت شد
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>مرتب:</span>
            <span className="font-medium text-foreground">{sortLabels[filters.sort]}</span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : parts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/50 p-10 text-center">
            <Star className="size-10 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-bold mb-1">قطعه‌ای یافت نشد</h3>
            <p className="text-sm text-muted-foreground mb-4">
              با فیلترهای فعلی نتیجه‌ای پیدا نشد. می‌توانید فیلترها را تغییر دهید یا پاک کنید.
            </p>
            <Button variant="outline" onClick={resetAll}>
              <ChevronLeft className="size-4" />
              پاک کردن فیلترها
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {parts.map((p) => (
              <PartCard
                key={p.id}
                part={p}
                onOpen={() => onOpenPart(p)}
                onAdd={() => onAddToCart(p)}
                isWishlisted={wishlistPartIds.includes(p.id)}
                onWishlist={() => onToggleWishlist(p)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PartCard({
  part,
  onOpen,
  onAdd,
  isWishlisted,
  onWishlist,
}: {
  part: Part;
  onOpen: () => void;
  onAdd: () => void;
  isWishlisted: boolean;
  onWishlist: () => void;
}) {
  const outOfStock = part.stock <= 0;
  const lowStock = !outOfStock && part.stock <= part.lowStockThreshold;

  return (
    <Card className="group relative overflow-hidden p-0 hover:shadow-md hover:border-foreground/30 transition-all flex flex-col">
      {part.featured && (
        <div className="absolute top-0 right-0 z-10 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-md">
          ویژه
        </div>
      )}
      <button
        onClick={onWishlist}
        className={cn(
          "absolute top-2 left-2 z-10 size-8 grid place-items-center rounded-full bg-background/90 backdrop-blur border border-border/70 shadow-sm transition-colors",
          isWishlisted ? "text-danger hover:bg-danger/10" : "text-muted-foreground hover:text-danger",
        )}
        aria-label={isWishlisted ? "حذف از علاقه‌مندی" : "افزودن به علاقه‌مندی"}
      >
        <Star className={cn("size-4", isWishlisted && "fill-danger")} />
      </button>

      <button onClick={onOpen} className="text-right">
        <PartImage part={part} className="h-40 sm:h-44 rounded-t-lg" />
      </button>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] text-muted-foreground truncate">{part.brand?.name || "بدون برند"}</span>
          <span className="text-[10px] text-muted-foreground/80 num-fa">کد: {part.sku}</span>
        </div>
        <button onClick={onOpen} className="text-right">
          <h3 className="font-bold text-sm leading-snug line-clamp-2 hover:text-foreground/80">
            {part.nameFa || part.name}
          </h3>
        </button>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Stars value={part.ratingAvg} count={part.ratingCount} size={11} />
        </div>

        <div className="mt-auto pt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex flex-col leading-tight">
              {part.oldPriceIrr && (
                <span className="text-[11px] text-muted-foreground line-through num-fa">
                  {toFa(part.oldPriceIrr.toLocaleString("en-US"))} ت
                </span>
              )}
              <span className="num-fa font-bold text-foreground">{toFaPrice(part.priceIrr)}</span>
            </div>
            {part.discountPercent ? (
              <Badge className="bg-danger text-danger-foreground text-[10px] h-5">
                ٪{toFa(part.discountPercent)}
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground num-fa">${toFa(part.priceUsd.toFixed(2))}</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-1.5">
            {outOfStock ? (
              <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] h-5">ناموجود</Badge>
            ) : lowStock ? (
              <Badge variant="secondary" className="bg-warning/15 text-amber-700 border-amber-300/50 text-[10px] h-5">
                {toFa(part.stock)} عدد باقی‌مانده
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-success/15 text-success border-success/30 text-[10px] h-5">
                موجود
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground num-fa">
              {part.soldCount > 0 ? `${toFa(part.soldCount)} فروش` : "—"}
            </span>
          </div>

          {outOfStock ? (
            <Button variant="outline" size="sm" className="w-full h-8 text-xs mt-1" onClick={onOpen}>
              مشاهده و اعلام موجودی
            </Button>
          ) : (
            <Button size="sm" className="w-full h-8 text-xs mt-1 gap-1.5 bg-[#F58220] hover:bg-[#ff8c38]" onClick={onAdd}>
              افزودن به سبد
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
