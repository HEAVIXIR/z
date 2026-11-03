"use client";

import Link from "next/link";
import { Phone, MapPin, Mail, Instagram, Send, Truck, ShieldCheck, ArrowRight } from "lucide-react";

/**
 * HEAVIX store Footer — fully separate from the HEAVIX Footer.
 * Uses the same dark + orange design language for visual consistency
 * but lives in its own component to keep the store independent.
 */
export function StoreFooter({
  shopName,
  shopPhone,
}: {
  shopName: string;
  shopPhone: string;
}) {
  return (
    <footer className="mt-auto border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[#F58220] text-white grid place-items-center font-bold">ه</div>
            <h3 className="font-bold">{shopName}</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            خرید آنلاین قطعات خودرو و ماشین‌آلات با ضمانت اصالت کالا، نرخ روز دلار
            و ارسال سریع به سراسر کشور.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#F58220]"
          >
            بازگشت به هویکس
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-xs font-bold mb-1 text-muted-foreground">دسترسی سریع</h4>
          <ul className="space-y-1 text-sm">
            <li><Link href="/store" className="hover:text-foreground text-muted-foreground">قطعات منتخب</Link></li>
            <li><Link href="/store" className="hover:text-foreground text-muted-foreground">تخفیف‌های ویژه</Link></li>
            <li><Link href="/store" className="hover:text-foreground text-muted-foreground">پرفروش‌ترین‌ها</Link></li>
            <li><Link href="/store" className="hover:text-foreground text-muted-foreground">سفارش‌های من</Link></li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-xs font-bold mb-1 text-muted-foreground">تماس با ما</h4>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2" dir="ltr">
              <Phone className="size-3.5" />
              {shopPhone || "۰۲۱-۱۲۳۴۵۶۷۸"}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-3.5" />
              تهران، خیابان ولیعصر
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-3.5" />
              info@heavix.ir
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold mb-1 text-muted-foreground">خدمات</h4>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-success" />
              ضمانت اصالت کالا
            </li>
            <li className="flex items-center gap-2">
              <Truck className="size-3.5 text-warning" />
              ارسال به سراسر ایران
            </li>
            <li className="flex items-center gap-2">
              <Send className="size-3.5 text-foreground" />
              پشتیبانی آنلاین
            </li>
          </ul>
          <div className="flex gap-1.5 pt-1">
            <a href="#" aria-label="Instagram" className="size-8 grid place-items-center rounded bg-background border border-border hover:border-foreground">
              <Instagram className="size-4" />
            </a>
            <a href="#" aria-label="Telegram" className="size-8 grid place-items-center rounded bg-background border border-border hover:border-foreground">
              <Send className="size-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-border/70 py-3 text-center text-xs text-muted-foreground">
        © <span className="num-fa">۱۴۰۳</span> — تمامی حقوق برای {shopName} محفوظ است.
      </div>
    </footer>
  );
}
