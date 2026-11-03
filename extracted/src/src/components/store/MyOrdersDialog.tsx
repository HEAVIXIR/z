"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2,
  PackageSearch,
  Phone,
  ChevronLeft,
  Truck,
  CreditCard,
  XCircle,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  PackageOpen,
  Wrench,
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
import { Separator } from "@/components/ui/separator";
import { useStoreCart } from "@/lib/store-cart";
import {
  toFa,
  toFaPrice,
  toFaDate,
  ORDER_STATUS_FA,
  PAYMENT_STATUS_FA,
  PAYMENT_METHOD_FA,
  SHIPMENT_STATUS_FA,
} from "@/lib/store-format";
import type { Order } from "@/lib/store-types";
import type { StoreUserClient } from "@/lib/use-store-user";
import { cn } from "@/lib/utils";
import { LogIn } from "lucide-react";
import Link from "next/link";

const ORDER_TIMELINE: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "PENDING", label: "ثبت سفارش", icon: <Clock className="size-3.5" /> },
  { key: "CONFIRMED", label: "تایید", icon: <CheckCircle2 className="size-3.5" /> },
  { key: "PROCESSING", label: "پردازش", icon: <Package className="size-3.5" /> },
  { key: "SHIPPED", label: "ارسال", icon: <Truck className="size-3.5" /> },
  { key: "DELIVERED", label: "تحویل", icon: <PackageOpen className="size-3.5" /> },
];

export function MyOrdersDialog({
  open,
  onOpenChange,
  highlightOrder,
  user,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  highlightOrder?: string | null;
  /** Currently-logged-in HEAVIX user (null = guest). */
  user: StoreUserClient | null;
}) {
  const storedPhone = useStoreCart((s) => s.customerPhone);
  const setCustomerPhone = useStoreCart((s) => s.setCustomerPhone);
  const [phone, setPhone] = useState(storedPhone || "");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = async (p: string) => {
    if (!p || p.length < 8) {
      toast.error("شماره موبایل را وارد کنید");
      return;
    }
    setLoading(true);
    setCustomerPhone(p);
    try {
      const res = await fetch(`/api/store/orders?phone=${encodeURIComponent(p)}`);
      const d = await res.json();
      setOrders(d.orders || []);
      setLoaded(true);
    } catch {
      toast.error("خطا در دریافت سفارش‌ها");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/store/orders?mine=true`, { cache: "no-store" });
      const d = await res.json();
      setOrders(d.orders || []);
      setLoaded(true);
    } catch {
      toast.error("خطا در دریافت سفارش‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      // Logged-in users: fetch their orders automatically by userId.
      // Guest users: fall back to the phone-input flow.
      if (user) {
        fetchMyOrders();
      } else if (storedPhone && !loaded) {
        setPhone(storedPhone);
        fetchOrders(storedPhone);
      }
    }
  }, [open, user]);

  useEffect(() => {
    if (open && highlightOrder) {
      // expand the highlighted order
      setExpandedId(highlightOrder);
      // try to scroll to it after a tick
      setTimeout(() => {
        const el = document.getElementById(`order-${highlightOrder}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [open, highlightOrder]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-slim">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <PackageSearch className="size-5" />
            سفارش‌های من
          </DialogTitle>
          <DialogDescription>
            {user
              ? `سفارش‌های حساب هویکس ${user.firstName} ${user.lastName}`
              : "با وارد کردن شماره موبایل، سفارش‌های خود را مشاهده کنید."}
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-success/30 bg-success/10 p-2.5 text-xs">
            <span className="text-foreground">
              وارد شده به عنوان{" "}
              <span className="font-bold">
                {user.firstName} {user.lastName}
              </span>{" "}
              — سفارش‌های فروشگاه هویکس شما نمایش داده می‌شود.
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={fetchMyOrders}
              disabled={loading}
            >
              {loading ? <Loader2 className="size-3 animate-spin" /> : null}
              بروزرسانی
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-secondary/40 p-2.5 text-xs">
              <div className="flex items-center gap-2">
                <LogIn className="size-4 text-[#F58220] shrink-0" />
                <span className="text-muted-foreground">
                  برای مشاهده خودکار سفارش‌ها، وارد حساب هویکس شوید.
                </span>
              </div>
              <Link
                href="/login?redirect=/store"
                className="shrink-0 rounded-md bg-[#F58220] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#ff8c38]"
              >
                ورود به هویکس
              </Link>
            </div>
            <div className="flex gap-2">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                className="text-left"
                placeholder="0912..."
              />
              <Button onClick={() => fetchOrders(phone)} disabled={loading} className="gap-1.5 bg-[#F58220] hover:bg-[#ff8c38]">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />}
                مشاهده
              </Button>
            </div>
          </div>
        )}

        {loaded && orders.length === 0 ? (
          <div className="text-center py-10">
            <PackageSearch className="size-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="font-bold mb-1">سفارشی یافت نشد</h3>
            <p className="text-sm text-muted-foreground">
              {user
                ? "هنوز سفارشی در فروشگاه هویکس ثبت نکرده‌اید."
                : "برای این شماره موبایل سفارشی ثبت نشده است."}
            </p>
          </div>
        ) : null}

        <div className="space-y-2.5">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              expanded={expandedId === o.id || highlightOrder === o.id}
              onToggle={() => setExpandedId(expandedId === o.id ? null : o.id)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrderCard({ order, expanded, onToggle }: { order: Order; expanded: boolean; onToggle: () => void }) {
  const statusFa = ORDER_STATUS_FA[order.status] || order.status;
  const statusColor =
    order.status === "DELIVERED"
      ? "bg-success/15 text-success border-success/30"
      : order.status === "CANCELLED"
        ? "bg-danger/15 text-danger border-danger/30"
        : order.status === "SHIPPED"
          ? "bg-info/15 text-foreground border-border"
          : "bg-warning/15 text-amber-700 border-amber-300/50";

  const payColor =
    order.paymentStatus === "PAID"
      ? "bg-success/15 text-success border-success/30"
      : order.paymentStatus === "REJECTED" || order.paymentStatus === "REFUNDED"
        ? "bg-danger/15 text-danger border-danger/30"
        : "bg-warning/15 text-amber-700 border-amber-300/50";

  // current step index
  const stepIdx = ORDER_TIMELINE.findIndex((s) => s.key === order.status);

  return (
    <div id={`order-${order.id}`} className="rounded-xl border border-border/70 bg-card overflow-hidden">
      <button onClick={onToggle} className="w-full text-right p-3 hover:bg-secondary/30 transition-colors">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">سفارش</span>
            <span className="num-fa font-bold">{order.orderNumber}</span>
            <Badge variant="outline" className={cn("text-[10px] h-5", statusColor)}>{statusFa}</Badge>
            <Badge variant="outline" className={cn("text-[10px] h-5", payColor)}>
              {PAYMENT_STATUS_FA[order.paymentStatus] || order.paymentStatus}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="num-fa text-xs text-muted-foreground">{toFaDate(order.createdAt)}</span>
            <ChevronLeft className={cn("size-4 text-muted-foreground transition-transform", expanded && "-rotate-90")} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <div className="text-xs text-muted-foreground num-fa">
            {toFa(order.items.length)} قلم — جمع: <span className="font-bold text-foreground">{toFaPrice(order.totalIrr)}</span>
          </div>
          {order.couponCode && (
            <Badge variant="secondary" className="text-[10px] h-5">{order.couponCode}</Badge>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/70 p-3 space-y-3">
          {/* timeline */}
          {order.status !== "CANCELLED" && (
            <div className="flex items-center justify-between gap-1">
              {ORDER_TIMELINE.map((s, i) => (
                <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                  <div className={cn(
                    "size-6 rounded-full grid place-items-center text-[10px] transition-colors",
                    i <= stepIdx ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                  )}>
                    {s.icon}
                  </div>
                  <div className={cn("text-[9px] sm:text-[10px]", i <= stepIdx ? "text-foreground font-medium" : "text-muted-foreground")}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* items */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-muted-foreground">اقلام سفارش</div>
            {order.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-2 text-sm bg-secondary/30 rounded-md p-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.partNameSnapshot}</div>
                  <div className="text-[10px] text-muted-foreground num-fa">
                    {toFa(it.quantity)} × {toFaPrice(it.unitPriceIrr)}
                  </div>
                </div>
                <span className="num-fa font-bold text-sm">{toFaPrice(it.lineTotalIrr)}</span>
              </div>
            ))}
          </div>

          {/* shipment */}
          {order.shipment ? (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <Truck className="size-3.5" /> وضعیت ارسال
              </div>
              <div className="rounded-md border border-border/70 bg-secondary/30 p-2 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">پست‌رسان:</span>
                  <span className="font-medium">{order.shipment.carrier}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">وضعیت:</span>
                  <Badge variant="outline" className="text-[10px] h-5">{SHIPMENT_STATUS_FA[order.shipment.status] || order.shipment.status}</Badge>
                </div>
                {order.shipment.trackingCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">کد رهگیری:</span>
                    <span className="num-fa font-medium" dir="ltr">{order.shipment.trackingCode}</span>
                  </div>
                )}
                {order.shipment.note && (
                  <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">{order.shipment.note}</div>
                )}
              </div>
            </div>
          ) : null}

          {/* payments */}
          {order.payments && order.payments.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <CreditCard className="size-3.5" /> پرداخت‌ها
              </div>
              {order.payments.map((p) => {
                const pColor =
                  p.status === "APPROVED"
                    ? "text-success"
                    : p.status === "REJECTED"
                      ? "text-danger"
                      : "text-amber-700";
                return (
                  <div key={p.id} className="rounded-md border border-border/70 bg-secondary/30 p-2 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{PAYMENT_METHOD_FA[p.method] || p.method}</span>
                      <span className={cn("font-bold flex items-center gap-1", pColor)}>
                        {p.status === "APPROVED" ? <CheckCircle2 className="size-3" /> : p.status === "REJECTED" ? <XCircle className="size-3" /> : <Clock className="size-3" />}
                        {PAYMENT_STATUS_FA[p.status] || p.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">مبلغ:</span>
                      <span className="num-fa font-medium">{toFaPrice(p.amountIrr)}</span>
                    </div>
                    {p.refId && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">کد پیگیری:</span>
                        <span className="num-fa font-medium" dir="ltr">{p.refId}</span>
                      </div>
                    )}
                    {p.referenceCode && !p.refId && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">کد فیش:</span>
                        <span className="num-fa font-medium" dir="ltr">{p.referenceCode}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* meta */}
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            <div className="flex items-center gap-1">
              <MapPin className="size-3" /> {order.shippingAddress}
            </div>
            {order.mechanic && (
              <div className="flex items-center gap-1">
                <Wrench className="size-3" /> تعمیرکار: {order.mechanic.shopName || `${order.mechanic.name} ${order.mechanic.family}`}
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <span>نرخ دلار در زمان سفارش:</span>
              <span className="num-fa">{toFa(order.currencyRateAtOrder.toLocaleString("en-US"))} تومان</span>
            </div>
            {order.notes && (
              <div className="pt-1 border-t border-border/50">یادداشت: {order.notes}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
