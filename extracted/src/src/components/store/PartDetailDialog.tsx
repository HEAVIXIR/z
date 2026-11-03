"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShoppingCart,
  Heart,
  CheckCircle2,
  Package,
  Car,
  Truck,
  Star,
  Send,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toFa, toFaPrice, toFaDate, toUsd } from "@/lib/store-format";
import type { Part, Review } from "@/lib/store-types";
import { Stars } from "./Stars";
import { PartImage } from "./Hero";

export function PartDetailDialog({
  part,
  open,
  onOpenChange,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
  customerPhone,
}: {
  part: Part | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAddToCart: (p: Part) => void;
  isWishlisted: boolean;
  onToggleWishlist: (p: Part) => void;
  customerPhone: string;
}) {
  const [detail, setDetail] = useState<Part | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!part) return;
    setActiveImage(0);
    setLoading(true);
    setDetail(null);
    let cancelled = false;
    fetch(`/api/store/parts/${part.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.part) {
          setDetail(d.part);
          if (Array.isArray(d.part.images) && d.part.images.length > 0) setActiveImage(0);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) });
    return () => { cancelled = true };
  }, [part?.id]);

  if (!part) return null;

  const outOfStock = detail ? detail.stock <= 0 : part.stock <= 0;
  const reviews = detail?.reviews || [];
  const activeImg = detail?.images?.[activeImage] || detail?.images?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-slim p-0 sm:p-0">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-[10px] h-5">
                  {part.category.name}
                </Badge>
                {part.brand && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    {part.brand.name}
                  </Badge>
                )}
                {detail?.featured && (
                  <Badge className="bg-amber-500/15 text-amber-700 border-amber-300/50 text-[10px] h-5">ویژه</Badge>
                )}
              </div>
              <DialogTitle className="text-lg sm:text-xl leading-snug">
                {detail?.nameFa || part.nameFa || part.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                کد قطعه: <span className="num-fa">{part.sku}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-5 p-4 sm:p-6 pt-3">
          {/* left: image + wishlist */}
          <div className="space-y-2">
            <div className="relative">
              <PartImage
                part={{
                  images: activeImg ? [activeImg] : detail?.images || [],
                  nameFa: detail?.nameFa || part.nameFa,
                  name: part.name,
                }}
                className="h-56 sm:h-64 rounded-lg"
              />
              {detail?.discountPercent ? (
                <Badge className="absolute top-2 right-2 bg-danger text-danger-foreground">
                  ٪{toFa(detail.discountPercent)} تخفیف
                </Badge>
              ) : null}
            </div>
            {detail && Array.isArray(detail.images) && detail.images.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto scrollbar-slim">
                {detail.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      "size-14 rounded border overflow-hidden shrink-0",
                      i === activeImage ? "border-foreground" : "border-border/70",
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleWishlist(detail || part)}
                className="gap-1.5"
              >
                <Heart className={cn("size-4", isWishlisted && "fill-danger text-danger")} />
                {isWishlisted ? "در علاقه‌مندی" : "افزودن به علاقه‌مندی"}
              </Button>
              <Button
                size="sm"
                disabled={outOfStock}
                onClick={() => onAddToCart(detail || part)}
                className="gap-1.5 bg-[#F58220] hover:bg-[#ff8c38]"
              >
                <ShoppingCart className="size-4" />
                {outOfStock ? "ناموجود" : "افزودن به سبد"}
              </Button>
            </div>
          </div>

          {/* right: info */}
          <div className="space-y-4">
            {/* price */}
            <div className="rounded-lg border border-border/70 bg-secondary/30 p-3 space-y-1">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">قیمت نهایی (نرخ امروز):</span>
                {detail?.oldPriceIrr && (
                  <span className="text-xs text-muted-foreground line-through num-fa">
                    {toFa(detail.oldPriceIrr.toLocaleString("en-US"))} تومان
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="num-fa text-xl font-black text-foreground">
                  {toFaPrice(detail?.priceIrr || part.priceIrr)}
                </span>
                <span className="text-[11px] text-muted-foreground num-fa">
                  (معادل {toUsd(detail?.priceUsd || part.priceUsd)})
                </span>
              </div>
            </div>

            {/* stock */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat
                icon={<Package className="size-4" />}
                label="موجودی"
                value={
                  outOfStock
                    ? "ناموجود"
                    : `${toFa(detail?.stock ?? part.stock)} عدد`
                }
                color={outOfStock ? "text-danger" : "text-success"}
              />
              <Stat
                icon={<Star className="size-4" />}
                label="امتیاز"
                value={
                  detail && detail.ratingCount > 0
                    ? `${toFa(detail.ratingAvg.toFixed(1))} (${toFa(detail.ratingCount)})`
                    : "بدون امتیاز"
                }
              />
              <Stat
                icon={<Truck className="size-4" />}
                label="فروش"
                value={detail && detail.soldCount > 0 ? `${toFa(detail.soldCount)} عدد` : "—"}
              />
            </div>

            {/* description */}
            <div>
              <h4 className="text-sm font-bold mb-1.5">توضیحات</h4>
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {detail?.description || "توضیحات این قطعه در حال تکمیل است."}
                </p>
              )}
            </div>

            {/* compatible cars */}
            {detail && (detail.carModels?.length > 0 || detail.compatibleCars?.length > 0) ? (
              <div>
                <h4 className="text-sm font-bold mb-1.5 flex items-center gap-1.5">
                  <Car className="size-4" /> خودروهای سازگار
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {detail.carModels.map((cm) => (
                    <Badge key={cm.id} variant="secondary" className="text-[11px] h-6 bg-foreground/5 border-border/70">
                      {cm.brand} {cm.model} ({toFa(cm.yearFrom)}–{toFa(cm.yearTo)})
                    </Badge>
                  ))}
                  {detail.compatibleCars.map((c: unknown, i: number) => (
                    <Badge key={`c-${i}`} variant="outline" className="text-[11px] h-6">
                      {typeof c === "string" ? c : ((c as { label?: string; name?: string })?.label || (c as { name?: string })?.name || JSON.stringify(c))}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <Separator />

        {/* reviews */}
        <div className="p-4 sm:p-6 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Star className="size-4 text-amber-500" />
              نظرات کاربران
              <span className="text-xs font-normal text-muted-foreground num-fa">
                ({toFa(detail?.ratingCount || 0)} نظر)
              </span>
            </h3>
          </div>

          <ReviewsList reviews={reviews} loading={loading} avg={detail?.ratingAvg || 0} count={detail?.ratingCount || 0} />

          <ReviewForm partId={part.id} defaultPhone={customerPhone} onSubmitted={() => {
            // re-fetch reviews (the new review is pending moderation, so list won't change — but we want a fresh count)
          }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-2.5 flex flex-col items-center gap-0.5">
      <div className="text-muted-foreground">{icon}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("text-xs font-bold num-fa", color)}>{value}</div>
    </div>
  );
}

function ReviewsList({ reviews, loading, avg, count }: { reviews: Review[]; loading: boolean; avg: number; count: number }) {
  if (loading) return <Skeleton className="h-20 w-full" />;
  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">
        هنوز نظری برای این قطعه ثبت نشده است. اولین نفری باشید که نظر می‌دهد!
        {count > 0 && <span className="block text-[11px] mt-1">میانگین امتیاز فعلی: <span className="num-fa">{toFa(avg.toFixed(1))}</span></span>}
      </div>
    );
  }
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-slim pl-1">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-lg border border-border/70 bg-card p-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-full bg-foreground/10 grid place-items-center text-xs font-bold">
                {(r.customerName || "م").slice(0, 1)}
              </div>
              <div>
                <div className="text-xs font-medium">{r.customerName || "کاربر"}</div>
                <div className="text-[10px] text-muted-foreground">{toFaDate(r.createdAt)}</div>
              </div>
            </div>
            <Stars value={r.rating} size={12} />
          </div>
          {r.title && <div className="text-sm font-bold mb-0.5">{r.title}</div>}
          {r.comment && <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}
        </div>
      ))}
    </div>
  );
}

function ReviewForm({ partId, defaultPhone, onSubmitted }: { partId: string; defaultPhone: string; onSubmitted: () => void }) {
  const [phone, setPhone] = useState(defaultPhone || "");
  const [name, setName] = useState("");
  const [family, setFamily] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultPhone) setPhone(defaultPhone);
  }, [defaultPhone]);

  const submit = async () => {
    if (!phone || phone.length < 8) {
      toast.error("شماره موبایل را وارد کنید");
      return;
    }
    if (!name.trim()) {
      toast.error("نام خود را وارد کنید");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/store/parts/${partId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name, family, rating, title, comment }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "خطا در ثبت نظر");
      toast.success("نظر شما ثبت شد", {
        description: "پس از تایید مدیر نمایش داده می‌شود.",
      });
      setTitle("");
      setComment("");
      onSubmitted();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/70 bg-secondary/30 p-3 space-y-2.5">
      <div className="text-sm font-bold flex items-center gap-1.5">
        <Send className="size-4" /> ثبت نظر جدید
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">موبایل *</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9" placeholder="0912..." dir="ltr" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">نام *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" placeholder="نام شما" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">امتیاز</Label>
        <div className="flex items-center gap-1" style={{ direction: "ltr" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="p-1 hover:scale-110 transition-transform"
              aria-label={`${toFa(n)} ستاره`}
            >
              <Star
                className={cn(
                  "size-6 transition-colors",
                  n <= rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40",
                )}
              />
            </button>
          ))}
          <span className="text-xs text-muted-foreground mr-2 num-fa">{toFa(rating)} / ۵</span>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">عنوان</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" placeholder="خلاصه نظر شما" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">متن نظر</Label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="تجربه خود را از این قطعه بنویسید..."
        />
      </div>
      <Button onClick={submit} disabled={submitting} className="w-full h-9 gap-1.5 bg-[#F58220] hover:bg-[#ff8c38]">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
        ثبت نظر
      </Button>
    </div>
  );
}
