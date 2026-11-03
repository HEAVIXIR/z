"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2,
  CreditCard,
  Upload,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Truck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStoreCart } from "@/lib/store-cart";
import { toFa, toFaPrice, toUsd } from "@/lib/store-format";
import type { Mechanic, Order, CouponValidation, EffectiveRate } from "@/lib/store-types";
import type { StoreUserClient } from "@/lib/use-store-user";
import { LogIn } from "lucide-react";
import Link from "next/link";

type Step = "form" | "created";

export function CheckoutDialog({
  open,
  onOpenChange,
  mechanics,
  currency,
  shippingUsd,
  appliedCoupon,
  onClearCoupon,
  onOrderCreated,
  user,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mechanics: Mechanic[];
  currency: EffectiveRate | null;
  shippingUsd: number;
  appliedCoupon: CouponValidation | null;
  onClearCoupon: () => void;
  onOrderCreated: (order: Order) => void;
  /** Currently-logged-in HEAVIX user (null = guest). */
  user: StoreUserClient | null;
}) {
  const items = useStoreCart((s) => s.items);
  const customerPhone = useStoreCart((s) => s.customerPhone);
  const setCustomerPhone = useStoreCart((s) => s.setCustomerPhone);
  const clearCart = useStoreCart((s) => s.clear);

  const [step, setStep] = useState<Step>("form");
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const [phone, setPhone] = useState(customerPhone || "");
  const [name, setName] = useState("");
  const [family, setFamily] = useState("");
  const [address, setAddress] = useState("");
  const [mechanicId, setMechanicId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [linkedToUser, setLinkedToUser] = useState(false);

  // payment method picker (after order creation)
  const [payMethod, setPayMethod] = useState<"gateway" | "manual">("gateway");
  // manual receipt fields
  const [mMethod, setMMethod] = useState<"CARD" | "CASH">("CARD");
  const [refCode, setRefCode] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerCard, setPayerCard] = useState("");
  const [mNote, setMNote] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // Prefill from the HEAVIX user profile when logged in. The
      // server will also re-read the session on POST so a stale
      // client cache can't bypass auth.
      const initialPhone = customerPhone || user?.mobile || "";
      const initialName = user?.firstName || "";
      const initialFamily = user?.lastName || "";
      setPhone(initialPhone);
      setName(initialName);
      setFamily(initialFamily);
      setStep("form");
      setCreatedOrder(null);
      setLinkedToUser(false);
    }
  }, [open, customerPhone, user]);

  const subtotalUsd = items.reduce((s, i) => s + i.priceUsd * i.qty, 0);
  const subtotalIrr = items.reduce((s, i) => s + i.priceIrr * i.qty, 0);
  const shippingIrr = Math.round(shippingUsd * (currency?.rate || 0) * (1 + (currency?.marginPercent || 0) / 100));
  const discountIrr = appliedCoupon?.valid ? appliedCoupon.discountIrr || 0 : 0;
  const totalIrr = Math.max(0, subtotalIrr + shippingIrr - discountIrr);
  const totalUsd = subtotalUsd + shippingUsd;

  const submitOrder = async () => {
    if (!phone || phone.length < 8) { toast.error("شماره موبایل معتبر وارد کنید"); return; }
    if (!name.trim()) { toast.error("نام را وارد کنید"); return; }
    if (!address.trim()) { toast.error("آدرس را وارد کنید"); return; }
    if (items.length === 0) { toast.error("سبد خرید خالی است"); return; }

    setSubmitting(true);
    setCustomerPhone(phone);
    try {
      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name,
          family,
          address,
          items: items.map((i) => ({ partId: i.partId, quantity: i.qty })),
          mechanicId: mechanicId || undefined,
          couponCode: appliedCoupon?.valid ? appliedCoupon.code : undefined,
          notes,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "خطا در ثبت سفارش");
      setCreatedOrder(d.order);
      setLinkedToUser(!!d.linkedToUser);
      setStep("created");
      clearCart();
      toast.success("سفارش ثبت شد", { description: `شماره سفارش: ${d.order.orderNumber}` });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const goToGateway = async () => {
    if (!createdOrder) return;
    setPaySubmitting(true);
    try {
      const res = await fetch("/api/store/payments/gateway/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: createdOrder.id, phone }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "خطا در ایجاد درگاه");
      toast.success("در حال انتقال به درگاه پرداخت...");
      // redirect — gatewayUrl is a relative URL (mock) or absolute (real Zarinpal)
      window.location.href = d.gatewayUrl;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPaySubmitting(false);
    }
  };

  const submitManual = async () => {
    if (!createdOrder) return;
    if (mMethod === "CARD" && !refCode.trim()) {
      toast.error("کد پیگیری/شماره فیش را وارد کنید");
      return;
    }
    setPaySubmitting(true);
    try {
      const res = await fetch("/api/store/payments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: createdOrder.id,
          phone,
          method: mMethod,
          amountIrr: createdOrder.totalIrr,
          referenceCode: refCode,
          payerName: payerName || `${name} ${family}`.trim(),
          payerCard: payerCard,
          note: mNote,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "خطا در ثبت فیش");
      toast.success(d.message || "فیش شما ثبت شد");
      onOrderCreated(createdOrder);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { onClearCoupon() } }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-slim">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {step === "form" ? (
              <>
                <Truck className="size-5" />
                تکمیل سفارش
              </>
            ) : (
              <>
                <CheckCircle2 className="size-5 text-success" />
                سفارش {createdOrder?.orderNumber} ثبت شد
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "اطلاعات تحویل‌گیرنده را وارد کنید."
              : "روش پرداخت را انتخاب کنید تا سفارش نهایی شود."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-3">
            {/* HEAVIX login banner — pre-fills the form when logged in,
                prompts to login when not (guests can still order). */}
            {user ? (
              <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-2.5 text-xs">
                <ShieldCheck className="size-4 text-success shrink-0" />
                <span className="text-foreground">
                  وارد شده به عنوان{" "}
                  <span className="font-bold">
                    {user.firstName} {user.lastName}
                  </span>{" "}
                  — سفارش در پروفایل هویکس شما ثبت می‌شود.
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-secondary/40 p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <LogIn className="size-4 text-[#F58220] shrink-0" />
                  <span className="text-muted-foreground">
                    برای ثبت سفارش در پروفایل هویکس، وارد شوید.
                  </span>
                </div>
                <Link
                  href="/login?redirect=/store"
                  className="shrink-0 rounded-md bg-[#F58220] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#ff8c38]"
                >
                  ورود به هویکس
                </Link>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">شماره موبایل *</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="text-left"
                  placeholder="09120000000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">نام *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: علی" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="family">نام خانوادگی</Label>
                <Input id="family" value={family} onChange={(e) => setFamily(e.target.value)} placeholder="مثال: محمدی" />
              </div>
              <div className="space-y-1.5">
                <Label>تعمیرکار (اختیاری)</Label>
                <Select value={mechanicId || "NONE"} onValueChange={(v) => setMechanicId(v === "NONE" ? "" : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="بدون تعمیرکار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">بدون تعمیرکار</SelectItem>
                    {mechanics.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.shopName || `${m.name} ${m.family}`}
                        {m.city ? ` — ${m.city}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">آدرس کامل *</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="استان، شهر، خیابان، پلاک..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">یادداشت سفارش (اختیاری)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="هر توضیح اضافه‌ای که لازم است..."
              />
            </div>

            <Separator />

            <OrderSummary
              subtotalUsd={subtotalUsd}
              subtotalIrr={subtotalIrr}
              shippingUsd={shippingUsd}
              shippingIrr={shippingIrr}
              discountIrr={discountIrr}
              totalIrr={totalIrr}
              totalUsd={totalUsd}
              appliedCoupon={appliedCoupon}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <OrderMini order={createdOrder!} />

            <div className="grid sm:grid-cols-2 gap-2">
              <button
                onClick={() => setPayMethod("gateway")}
                className={`text-right rounded-lg border p-3 transition-colors ${payMethod === "gateway" ? "border-foreground bg-foreground/5" : "border-border/70 hover:bg-secondary/40"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="size-4" />
                  <span className="font-bold text-sm">پرداخت آنلاین</span>
                  {payMethod === "gateway" && <CheckCircle2 className="size-4 text-success mr-auto" />}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  انتقال به درگاه پرداخت زرین‌پال و پرداخت سریع. سفارش بلافاصله پس از پرداخت تایید می‌شود.
                </p>
              </button>
              <button
                onClick={() => setPayMethod("manual")}
                className={`text-right rounded-lg border p-3 transition-colors ${payMethod === "manual" ? "border-foreground bg-foreground/5" : "border-border/70 hover:bg-secondary/40"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Upload className="size-4" />
                  <span className="font-bold text-sm">آپلود فیش</span>
                  {payMethod === "manual" && <CheckCircle2 className="size-4 text-success mr-auto" />}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  به کارت فروشنده واریز کنید و کد پیگیری را وارد کنید. پس از تایید مدیر، سفارش پردازش می‌شود.
                </p>
              </button>
            </div>

            {payMethod === "gateway" ? (
              <div className="space-y-2 rounded-lg border border-border/70 bg-secondary/30 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="size-4 text-success" />
                  مبلغ قابل پرداخت:
                  <span className="num-fa font-bold mr-auto">{toFaPrice(createdOrder!.totalIrr)}</span>
                </div>
                <Button className="w-full h-11 gap-1.5 bg-[#F58220] hover:bg-[#ff8c38]" onClick={goToGateway} disabled={paySubmitting}>
                  {paySubmitting ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                  رفتن به درگاه پرداخت
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  پس از پرداخت موفق، به‌صورت خودکار به این صفحه بازمی‌گردید.
                </p>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-border/70 bg-secondary/30 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Upload className="size-4 text-warning" />
                  <span className="font-bold">ثبت فیش پرداختی</span>
                  <span className="num-fa text-xs text-muted-foreground mr-auto">مبلغ: {toFaPrice(createdOrder!.totalIrr)}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">روش پرداخت</Label>
                    <Select value={mMethod} onValueChange={(v) => setMMethod(v as "CARD" | "CASH")}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CARD">کارت / فیش واریزی</SelectItem>
                        <SelectItem value="CASH">نقدی (در محل)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">کد پیگیری / شماره فیش</Label>
                    <Input value={refCode} onChange={(e) => setRefCode(e.target.value)} className="h-9" dir="ltr" disabled={mMethod !== "CARD"} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">نام پرداخت‌کننده</Label>
                    <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} className="h-9" placeholder={`${name} ${family}`} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">شماره کارت (اختیاری)</Label>
                    <Input value={payerCard} onChange={(e) => setPayerCard(e.target.value)} className="h-9" dir="ltr" placeholder="6037-xxxx-xxxx-xxxx" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">یادداشت (اختیاری)</Label>
                  <Textarea value={mNote} onChange={(e) => setMNote(e.target.value)} rows={2} placeholder="توضیح اضافه..." />
                </div>
                <Button className="w-full h-11 gap-1.5 bg-[#F58220] hover:bg-[#ff8c38]" onClick={submitManual} disabled={paySubmitting}>
                  {paySubmitting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  ثبت فیش و تکمیل
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "form" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>انصراف</Button>
              <Button onClick={submitOrder} disabled={submitting || items.length === 0} className="gap-1.5 bg-[#F58220] hover:bg-[#ff8c38]">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowLeft className="size-4" />}
                ثبت سفارش
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderSummary({
  subtotalUsd, subtotalIrr, shippingUsd, shippingIrr, discountIrr, totalIrr, totalUsd, appliedCoupon,
}: {
  subtotalUsd: number; subtotalIrr: number;
  shippingUsd: number; shippingIrr: number;
  discountIrr: number;
  totalIrr: number; totalUsd: number;
  appliedCoupon: CouponValidation | null;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-secondary/30 p-3 space-y-1.5">
      <Row label="جمع قطعات" sub={toUsd(subtotalUsd)} value={toFaPrice(subtotalIrr)} />
      <Row label="هزینه ارسال" sub={toUsd(shippingUsd)} value={toFaPrice(shippingIrr)} />
      {discountIrr > 0 && (
        <Row label={`تخفیف (${appliedCoupon?.code})`} value={`- ${toFaPrice(discountIrr)}`} color="text-success" />
      )}
      <Separator />
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold">مبلغ قابل پرداخت</span>
        <span className="num-fa text-lg font-black">{toFaPrice(totalIrr)}</span>
      </div>
      <div className="text-[11px] text-muted-foreground text-left num-fa">معادل {toUsd(totalUsd)}</div>
    </div>
  );
}

function Row({ label, sub, value, color }: { label: string; sub?: string; value: string; color?: string }) {
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

function OrderMini({ order }: { order: Order }) {
  return (
    <div className="rounded-lg border border-border/70 p-3 bg-card">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">شماره سفارش</span>
        <span className="num-fa font-bold">{order.orderNumber}</span>
      </div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">تعداد اقلام</span>
        <span className="num-fa">{toFa(order.items.length)}</span>
      </div>
      <Separator />
      <div className="flex items-baseline justify-between mt-2">
        <span className="text-sm font-bold">مبلغ قابل پرداخت</span>
        <span className="num-fa text-base font-black">{toFaPrice(order.totalIrr)}</span>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {order.items.slice(0, 4).map((it) => (
          <Badge key={it.id} variant="secondary" className="text-[10px] h-5">
            {it.partNameSnapshot} ×{toFa(it.quantity)}
          </Badge>
        ))}
        {order.items.length > 4 && (
          <Badge variant="outline" className="text-[10px] h-5">+{toFa(order.items.length - 4)}</Badge>
        )}
      </div>
    </div>
  );
}
