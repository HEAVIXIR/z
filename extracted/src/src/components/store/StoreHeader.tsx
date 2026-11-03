"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Heart, ShoppingCart, Search, Wrench, PackageSearch, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toFa } from "@/lib/store-format";
import type { CurrencyInfo } from "@/lib/store-types";

/**
 * HEAVIX store Header — fully separate from the HEAVIX Header.
 * No heavy-machinery nav, no listings link, no shared menus.
 */
export function StoreHeader({
  currency,
  refreshing,
  onRefresh,
  searchQuery,
  onSearch,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenWishlist,
  onOpenOrders,
  onOpenMechanics,
}: {
  currency: CurrencyInfo | null;
  refreshing: boolean;
  onRefresh: () => void;
  searchQuery: string;
  onSearch: (v: string) => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenOrders: () => void;
  onOpenMechanics: () => void;
}) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      {/* Live rate bar */}
      <div className="bg-secondary/60 text-foreground/80 text-xs">
        <div className="mx-auto max-w-7xl flex items-center gap-2 px-3 sm:px-4 h-8 overflow-x-auto whitespace-nowrap scrollbar-slim">
          <span className="font-medium text-foreground/70">نرخ روز دلار:</span>
          {currency ? (
            <>
              <span className="num-fa font-bold text-foreground">{toFa(currency.rate)}</span>
              <span className="text-foreground/60">تومان</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                className="h-6 px-2 text-[11px] gap-1 ml-auto"
              >
                <RefreshCw className={cn("size-3", refreshing && "animate-spin")} />
                {refreshing ? "در حال بروزرسانی..." : "بروزرسانی"}
              </Button>
            </>
          ) : (
            <span className="text-muted-foreground">در حال دریافت...</span>
          )}
        </div>
      </div>

      {/* Main bar */}
      <div className="mx-auto max-w-7xl flex items-center gap-3 px-3 sm:px-4 h-14">
        <Link href="/store" className="flex items-center gap-2 shrink-0" aria-label="فروشگاه هویکس">
          <div className="size-9 rounded-lg bg-[#F58220] text-white grid place-items-center font-bold text-lg shadow-sm">
            ه
          </div>
          <div className="hidden sm:flex flex-col leading-tight text-right">
            <span className="font-bold text-sm">فروشگاه هویکس</span>
            <span className="text-[10px] text-muted-foreground">قطعات اصلی، نرخ روز، ارسال سریع</span>
          </div>
        </Link>

        {/* desktop search */}
        <div className="flex-1 max-w-xl hidden md:block">
          <SearchInput value={searchQuery} onChange={onSearch} />
        </div>

        <div className="flex items-center gap-1 mr-auto md:mr-0">
          <Button
            variant="ghost"
            size="sm"
            className="hidden lg:flex gap-1.5"
            onClick={onOpenMechanics}
          >
            <Wrench className="size-4" />
            <span className="text-xs">تعمیرکاران</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="hidden lg:flex gap-1.5"
            onClick={onOpenOrders}
          >
            <PackageSearch className="size-4" />
            <span className="text-xs">سفارش‌های من</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={onOpenWishlist}
            aria-label="علاقه‌مندی‌ها"
          >
            <Heart className="size-5" />
            {wishlistCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-danger text-danger-foreground">
                {toFa(wishlistCount)}
              </Badge>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={onOpenCart}
            aria-label="سبد خرید"
          >
            <ShoppingCart className="size-5" />
            {cartCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-foreground text-background">
                {toFa(cartCount)}
              </Badge>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="جستجو"
          >
            <Search className="size-5" />
          </Button>
        </div>
      </div>

      {/* mobile search */}
      {mobileSearchOpen && (
        <div className="md:hidden border-t border-border/70 px-3 py-2">
          <SearchInput value={searchQuery} onChange={onSearch} autoFocus />
        </div>
      )}

      {/* Back to HEAVIX link */}
      <div className="border-t border-border/40 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 h-7 flex items-center justify-between text-[11px] text-muted-foreground">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-[#F58220]">
            بازگشت به هویکس
            <ArrowRight className="size-3" />
          </Link>
          <span className="num-fa hidden sm:inline">بازار قطعات خودرو و ماشین‌آلات</span>
        </div>
      </div>
    </header>
  );
}

function SearchInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="جستجوی قطعه، برند، کد قطعه..."
        className="pr-9 pl-3 h-9 bg-secondary/40 border-border/60"
        autoFocus={autoFocus}
        aria-label="جستجو"
      />
    </div>
  );
}
