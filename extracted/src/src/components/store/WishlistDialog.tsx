"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Heart,
  Phone,
  Loader2,
  ShoppingCart,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStoreCart } from "@/lib/store-cart";
import { toFa, toFaPrice } from "@/lib/store-format";
import type { Part } from "@/lib/store-types";
import { Stars } from "./Stars";
import { PartImage } from "./Hero";

export function WishlistDialog({
  open,
  onOpenChange,
  onAddToCart,
  onRemoveWishlist,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAddToCart: (p: Part) => void;
  onRemoveWishlist: (p: Part) => void;
}) {
  const storedPhone = useStoreCart((s) => s.customerPhone);
  const setCustomerPhone = useStoreCart((s) => s.setCustomerPhone);
  const setWishlist = useStoreCart((s) => s.setWishlist);
  const [phone, setPhone] = useState(storedPhone || "");
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchAll = async (p: string) => {
    if (!p || p.length < 8) {
      toast.error("شماره موبایل را وارد کنید");
      return;
    }
    setCustomerPhone(p);
    setLoading(true);
    try {
      // 1) sync wishlist ids from server
      const wlRes = await fetch(`/api/store/wishlist?phone=${encodeURIComponent(p)}`);
      const wl = await wlRes.json();
      const ids: string[] = wl.partIds || [];
      setWishlist(ids);
      if (ids.length === 0) {
        setParts([]);
        setLoaded(true);
        return;
      }
      // 2) fetch each part (single detail)
      const detailPromises = ids.map((id) =>
        fetch(`/api/store/parts/${id}`).then((r) => r.json()).catch(() => null),
      );
      const details = await Promise.all(detailPromises);
      const valid = details.filter((d) => d && d.part).map((d) => d.part as Part);
      setParts(valid);
      setLoaded(true);
    } catch {
      toast.error("خطا در دریافت علاقه‌مندی‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && storedPhone && !loaded) {
      setPhone(storedPhone);
      fetchAll(storedPhone);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-slim">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Heart className="size-5" />
            علاقه‌مندی‌های من
          </DialogTitle>
          <DialogDescription>
            قطعاتی که برای خرید بعدی نشانه کرده‌اید.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            className="text-left"
            placeholder="0912..."
          />
          <Button onClick={() => fetchAll(phone)} disabled={loading} className="gap-1.5 bg-[#F58220] hover:bg-[#ff8c38]">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />}
            مشاهده
          </Button>
        </div>

        {loaded && parts.length === 0 ? (
          <div className="text-center py-10">
            <Heart className="size-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="font-bold mb-1">لیست علاقه‌مندی‌ها خالی است</h3>
            <p className="text-sm text-muted-foreground mb-4">
              روی آیکن قلب کنار هر قطعه بزنید تا به این لیست اضافه شود.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <ChevronLeft className="size-4" />
              مشاهده قطعات
            </Button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {parts.map((p) => {
            const outOfStock = p.stock <= 0;
            return (
              <div key={p.id} className="rounded-lg border border-border/70 bg-card p-2.5 flex gap-2">
                <PartImage part={p} className="size-16 shrink-0 rounded" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-[10px] text-muted-foreground">{p.brand?.name || "—"}</div>
                  <div className="text-sm font-bold line-clamp-1">{p.nameFa || p.name}</div>
                  <Stars value={p.ratingAvg} count={p.ratingCount} size={11} />
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="num-fa text-sm font-bold">{toFaPrice(p.priceIrr)}</span>
                    {p.discountPercent ? (
                      <Badge className="bg-danger text-danger-foreground text-[10px] h-5">٪{toFa(p.discountPercent)}</Badge>
                    ) : null}
                  </div>
                  <div className="flex gap-1 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs gap-1 bg-[#F58220] hover:bg-[#ff8c38]"
                      disabled={outOfStock}
                      onClick={() => onAddToCart(p)}
                    >
                      <ShoppingCart className="size-3" />
                      {outOfStock ? "ناموجود" : "افزودن"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-danger hover:bg-danger/10"
                      onClick={() => onRemoveWishlist(p)}
                      aria-label="حذف از علاقه‌مندی"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
