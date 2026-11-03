"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Wrench, CheckCircle2 } from "lucide-react";
import type { Mechanic } from "@/lib/store-types";
import { toFa } from "@/lib/store-format";
import { Stars } from "./Stars";

export function MechanicsDialog({
  open,
  onOpenChange,
  mechanics,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mechanics: Mechanic[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-slim">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Wrench className="size-5" />
            تعمیرکاران همکار
          </DialogTitle>
          <DialogDescription>
            تعمیرکاران تأییدشده‌ای که می‌توانید سفارش خود را به آن‌ها ارجاع دهید.
          </DialogDescription>
        </DialogHeader>

        {mechanics.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <Wrench className="size-10 mx-auto text-muted-foreground/30 mb-3" />
            تعمیرکاری یافت نشد.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2.5">
            {mechanics.map((m) => (
              <div key={m.id} className="rounded-lg border border-border/70 bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm">{m.shopName || `${m.name} ${m.family}`}</h3>
                      {m.verified && (
                        <Badge className="bg-success/15 text-success border-success/30 text-[10px] h-5 gap-0.5">
                          <CheckCircle2 className="size-2.5" /> تأیید شده
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{m.name} {m.family}</div>
                  </div>
                  <Stars value={m.rating} size={13} />
                </div>

                <div className="space-y-1 text-xs">
                  {m.specialty && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Wrench className="size-3" />
                      {m.specialty}
                    </div>
                  )}
                  {m.city && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="size-3" />
                      {m.city}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-muted-foreground" dir="ltr">
                    <Phone className="size-3" />
                    {m.phone}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <span className="text-[11px] text-muted-foreground">سفارش‌های انجام‌شده</span>
                  <span className="num-fa text-xs font-bold">{toFa(m.totalOrders)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
