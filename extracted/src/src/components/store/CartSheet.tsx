"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Minus, ShoppingBag, Tag, Loader2, X, CheckCircle2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useStoreCart, type CartItem } from "@/lib/store-cart";
import { toFa, toFaPrice, toUsd } from "@/lib/store-format";
import type { CouponValidation, EffectiveRate } from "@/lib/store-types";
import { PartImage } from "./Hero";

export function CartSheet({
  open,
  onOpenChange,
  onCheckout,
  currency,
  shippingUsd,
  coupon,
  onCouponChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCheckout: () => void;
  currency: EffectiveRate | null;
  shippingUsd: number;
  coupon: CouponValidation | null;
  onCouponChange: (c: CouponValidation | null) => void;
}) {
  const items = useStoreCart((s) => s.items);
  const removeItem = useStoreCart((s) => s.removeItem);
  const setQty = useStoreCart((s) => s.setQty);
  const clear = useStoreCart((s) => s.clear);

  const [couponInput, setCouponInput] = useState("");
  const [validating, setValidating] = useState(false);

  // when the sheet closes (or cart empties), clear the coupon
  useEffect(() => {
    if (!open) {
      onCouponChange(null);
      setCouponInput("");
    }
  }, [open]);

  const subtotalUsd = items.reduce((s, i) => s + i.priceUsd * i.qty, 0);
  const subtotalIrr = items.reduce((s, i) => s + i.priceIrr * i.qty, 0);
  const discountIrr = coupon?.valid && coupon.discountIrr ? coupon.discountIrr : 0;
  const totalUsd = subtotalUsd + shippingUsd;
  const totalIrr = Math.max(0, subtotalIrr + Math.round(shippingUsd * (currency?.rate || 0) * (1 + (currency?.marginPercent || 0) / 100)) - discountIrr);
  const shippingIrr = Math.round(shippingUsd * (currency?.rate || 0) * (1 + (currency?.marginPercent || 0) / 100));

  const validateCoupon = async () => {
    const code = couponInput.trim();
    if (!code) {
      toast.error("کد تخفیف را وارد کنید");
      return;
    }
    setValidating(true);
    try {
      const res = await fetch("/api/store/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotalIrr: subtotalIrr + shippingIrr }),
      });
      const d: CouponValidation = await res.json();
      onCouponChange(d);
      if (d.valid) {
        toast.success(`کد تخفیف اعمال شد`, {
          description: `تخفیف: ${toFaPrice(d.discountIrr || 0)}`,
        });
      } else {
        toast.error(d.error || "کد تخفیف نامعتبر است");
      }
    } catch {
      toast.error("خطا در بررسی کد تخفیف");
    } finally {
      setValidating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="border-b border-border/70">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="size-5" />
            سبد خرید
            <Badge variant="secondary" className="text-[10px] h-5 num-fa">{toFa(items.length)}</Badge>
          </SheetTitle>
          <SheetDescription className="text-xs">
            قیمت‌ها بر اساس نرخ روز دلار ({currency ? toFa(currency.rate.toLocaleString("en-US")) : "—"} تومان) محاسبه شده است.
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 grid place-items-center p-8 text-center">
            <div>
              <ShoppingBag className="size-14 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-bold mb-1">سبد خرید شما خالی است</h3>
              <p className="text-sm text-muted-foreground mb-4">
                قطعات موردنظر را به سبد اضافه کنید.
              </p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                مشاهده قطعات
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto scrollbar-slim p-3 space-y-2">
              {items.map((it) => (
                <CartLine
                  key={it.partId}
                  item={it}
                  onRemove={() => removeItem(it.partId)}
                  onQty={(q) => setQty(it.partId, q)}
                />
              ))}
              <button
                onClick={() => { clear(); onCouponChange(null); setCouponInput("") }}
                className="text-xs text-muted-foreground hover:text-danger flex items-center gap-1 mx-auto pt-1"
              >
                <Trash2 className="size-3" /> خالی کردن سبد
              </button>
            </div>

            <div className="border-t border-border/70 p-3 space-y-2.5 bg-secondary/30">
              {/* coupon */}
              <div className="flex gap-1.5">
                <Input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="کد تخفیف (مثال: WELCOME10)"
                  className="h-9 bg-background"
                  dir="ltr"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={validateCoupon}
                  disabled={validating}
                >
                  {validating ? <Loader2 className="size-3.5 animate-spin" /> : <Tag className="size-3.5" />}
                  اعمال
                </Button>
              </div>
              {coupon?.valid && (
                <div className="text-xs flex items-center gap-1.5 text-success bg-success/10 border border-success/30 rounded px-2 py-1.5">
                  <CheckCircle2 className="size-3.5" />
                  کد {coupon.code} اعمال شد — تخفیف: <span className="num-fa font-bold">{toFaPrice(coupon.discountIrr || 0)}</span>
                  <button
                    className="ml-auto"
                    onClick={() => { onCouponChange(null); setCouponInput("") }}
                    aria-label="حذف کد تخفیف"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}

              <Separator />

              {/* totals */}
              <Line label="جمع قطعات" sub={`${toUsd(subtotalUsd)}`} value={toFaPrice(subtotalIrr)} />
              <Line label="هزینه ارسال" sub={`${toUsd(shippingUsd)}`} value={toFaPrice(shippingIrr)} />
              {discountIrr > 0 && (
                <Line label="تخفیف" value={`- ${toFaPrice(discountIrr)}`} color="text-success" />
              )}
              <Separator />
              <div className="flex items-baseline justify-between pt-0.5">
                <span className="text-sm font-bold">مبلغ قابل پرداخت</span>
                <span className="num-fa text-lg font-black">{toFaPrice(totalIrr)}</span>
              </div>
              <div className="text-[11px] text-muted-foreground text-left num-fa">
                معادل {toUsd(totalUsd)}
              </div>

              <Button
                className="w-full h-11 mt-1 bg-[#F58220] hover:bg-[#ff8c38]"
                onClick={onCheckout}
                disabled={items.length === 0}
              >
                ادامه و پرداخت
              </Button>
            </div>
          </>
        )}

        <SheetFooter className="sr-only">
          <span>footer</span>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function CartLine({
  item,
  onRemove,
  onQty,
}: {
  item: CartItem;
  onRemove: () => void;
  onQty: (q: number) => void;
}) {
  return (
    <div className="flex gap-2 rounded-lg border border-border/70 bg-card p-2">
      <PartImage part={{ images: [item.image].filter(Boolean), nameFa: item.nameFa, name: item.name }} className="size-16 shrink-0 rounded" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground">{item.sku}</div>
            <div className="text-sm font-bold line-clamp-1">{item.nameFa || item.name}</div>
          </div>
          <button onClick={onRemove} className="text-muted-foreground hover:text-danger p-1" aria-label="حذف">
            <Trash2 className="size-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 border border-border/70 rounded-md h-7">
            <button
              onClick={() => onQty(item.qty - 1)}
              className="size-7 grid place-items-center hover:bg-secondary rounded-r-md text-muted-foreground"
              aria-label="کم"
            >
              <Minus className="size-3" />
            </button>
            <span className="num-fa text-sm font-medium min-w-6 text-center">{toFa(item.qty)}</span>
            <button
              onClick={() => onQty(item.qty + 1)}
              disabled={item.qty >= item.stock}
              className="size-7 grid place-items-center hover:bg-secondary rounded-l-md text-muted-foreground disabled:opacity-40"
              aria-label="زیاد"
            >
              <Plus className="size-3" />
            </button>
          </div>
          <div className="text-left">
            <div className="num-fa text-sm font-bold">{toFaPrice(item.priceIrr * item.qty)}</div>
            <div className="text-[10px] text-muted-foreground num-fa">{toUsd(item.priceUsd * item.qty)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, sub, value, color }: { label: string; sub?: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        {label}
        {sub && <span className="text-[10px] mr-1 num-fa text-muted-foreground/70">{sub}</span>}
      </span>
      <span className={`num-fa font-medium ${color || ""}`}>{value}</span>
    </div>
  );
}
