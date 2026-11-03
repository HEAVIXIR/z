"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  Wrench,
  Megaphone,
  Building2,
  FolderTree,
  Users,
  Settings,
  MonitorSmartphone,
  Sparkles,
  Target,
  BookOpen,
  Wallet,
  ShoppingCart,
  Flame,
  TrendingUp,
  Activity,
  HeartPulse,
  Crown,
  Image as ImageIcon,
  Menu as MenuIcon,
  Brain,
  ShieldCheck,
  Network,
  DollarSign,
  Radar,
  Calculator,
  BarChart3,
  ShieldAlert,
} from "lucide-react";

/* ============================================================
   AdminSidebarNav — grouped sidebar nav (Aria-style).
   ============================================================ */

interface MenuItem {
  title: string;
  href?: string;
  icon?: any;
  children?: { title: string; href: string }[];
}

const MENU: MenuItem[] = [
  { title: "داشبورد", href: "/admin/dashboard", icon: LayoutDashboard },
  {
    title: "صفحه اصلی",
    icon: MonitorSmartphone,
    children: [
      { title: "بخش‌های صفحه", href: "/admin/home" },
      { title: "چیدمان صفحه اصلی", href: "/admin/homepage-layout" },
      { title: "هیرو", href: "/admin/home/hero" },
      { title: "دسته‌بندی صفحه اصلی", href: "/admin/home/categories" },
      { title: "ماشین‌آلات تأییدشده", href: "/admin/home/verified-machines" },
      { title: "برندهای مورد اعتماد", href: "/admin/home/trusted-brands" },
      { title: "خدمات", href: "/admin/services" },
      { title: "هدر", href: "/admin/home/header" },
      { title: "فوتر", href: "/admin/home/footer" },
      { title: "آمار سایت", href: "/admin/site-stats" },
      { title: "منو", href: "/admin/menu" },
      { title: "کتابخانه رسانه", href: "/admin/media" },
    ],
  },
  { title: "آگهی‌ها", href: "/admin/listings", icon: Megaphone },
  { title: "شرکت‌ها", href: "/admin/companies", icon: Building2 },
  {
    title: "تاکسونومی",
    icon: FolderTree,
    children: [
      { title: "هاب تاکسونومی", href: "/admin/taxonomy" },
      { title: "دسته‌ها", href: "/admin/categories" },
      { title: "محصولات", href: "/admin/products" },
      { title: "گراف سازگاری", href: "/admin/compatibility" },
      { title: "گراف دانش", href: "/admin/knowledge-graph" },
      { title: "ویژگی‌ها", href: "/admin/taxonomy/attributes" },
      { title: "برندها", href: "/admin/taxonomy/brands" },
      { title: "خانواده برندها", href: "/admin/brand-families" },
      { title: "انواع معامله", href: "/admin/taxonomy/transactions" },
      { title: "انواع خدمت", href: "/admin/taxonomy/services" },
      { title: "صنایع کاربرد", href: "/admin/taxonomy/industries" },
      { title: "مکان‌ها", href: "/admin/taxonomy/locations" },
      { title: "برندها (قدیمی)", href: "/admin/brands" },
    ],
  },
  {
    title: "بازار و تحلیل",
    icon: Activity,
    children: [
      { title: "تحلیل و آمار", href: "/admin/analytics" },
      { title: "هوش بازار", href: "/admin/market-intelligence" },
      { title: "نقشه حرارتی بازار", href: "/admin/market-heatmap" },
      { title: "هوش قیمتی", href: "/admin/price-intelligence" },
      { title: "موتور قیمت‌گذاری", href: "/admin/pricing" },
      { title: "موتور تقاضا", href: "/admin/demand-engine" },
      { title: "رادار فرصت‌ها", href: "/admin/opportunity-radar" },
      { title: "موتور فرصت‌ها", href: "/admin/opportunities" },
      { title: "تحلیل‌گر هوش مصنوعی", href: "/admin/ai-analyst" },
      { title: "سیگنال‌های تقاضا (AI)", href: "/admin/demand-signals" },
      { title: "موتور مقایسه", href: "/admin/compare" },
      { title: "سلامت کاتالوگ", href: "/admin/catalog-health" },
    ],
  },
  {
    title: "معاملات",
    icon: Wallet,
    children: [
      { title: "اتاق‌های معامله", href: "/admin/deal-rooms" },
      { title: "کارشناسی", href: "/admin/inspections" },
      { title: "حمل‌ونقل", href: "/admin/transport" },
      { title: "پیشنهادها", href: "/admin/offers" },
      { title: "درخواست‌های خرید", href: "/admin/requests" },
      { title: "RFQ (B2B)", href: "/admin/rfq" },
      { title: "مزایده ماشین‌آلات", href: "/admin/auctions" },
      { title: "فروش در ۷ روز", href: "/admin/sell-in-7-days" },
      { title: "ردیابی آگهی", href: "/admin/rejections" },
    ],
  },
  {
    title: "محتوا",
    icon: BookOpen,
    children: [
      { title: "هویکس دانش", href: "/admin/articles" },
      { title: "پایه دانش", href: "/admin/knowledge" },
      { title: "دیکشنری صنعتی", href: "/admin/dictionary" },
      { title: "جستجوهای داغ", href: "/admin/hot-searches" },
      { title: "سئو", href: "/admin/seo" },
      { title: "ریلز شبکه‌های اجتماعی", href: "/admin/reels" },
    ],
  },
  {
    title: "نظرات و نظارت",
    icon: ShieldAlert,
    children: [
      { title: "مدیریت محتوا", href: "/admin/moderation" },
    ],
  },
  {
    title: "سیستم و هوش مصنوعی",
    icon: Brain,
    children: [
      { title: "پرچم‌های ویژگی", href: "/admin/feature-flags" },
      { title: "دروازه هوش مصنوعی", href: "/admin/ai-gateway" },
      { title: "بودجه AI", href: "/admin/ai-budget" },
      { title: "ایجنت‌های هوش مصنوعی", href: "/admin/ai-agents" },
      { title: "موتور رشد", href: "/admin/growth-engine" },
      { title: "فازهای راه‌اندازی", href: "/admin/launch-phases" },
      { title: "اسکرپر هوش مصنوعی", href: "/admin/ai-scraper" },
      { title: "کارهای پس‌زمینه", href: "/admin/jobs" },
    ],
  },
  { title: "اشتراک‌ها", href: "/admin/subscriptions", icon: Crown },
  { title: "کاربران", href: "/admin/users", icon: Users },
  { title: "لاگ ممیزی", href: "/admin/audit-log", icon: ShieldCheck },
  { title: "تنظیمات", href: "/admin/settings", icon: Settings },
];

export default function AdminSidebarNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string[]>(() =>
    MENU.filter((m) =>
      m.children?.some(
        (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
      ),
    ).map((m) => m.title),
  );

  const toggle = (t: string) =>
    setOpen((o) => (o.includes(t) ? o.filter((x) => x !== t) : [...o, t]));

  return (
    <div className="space-y-1">
      {MENU.map((item) => {
        if (item.children) {
          const isOpen = open.includes(item.title);
          const groupActive = item.children.some(
            (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
          );
          return (
            <div key={item.title}>
              <button
                onClick={() => toggle(item.title)}
                className={`flex w-full min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  groupActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {item.icon && <item.icon size={19} className="shrink-0" />}
                <span className="flex-1 truncate text-right">{item.title}</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="mr-6 mt-1 space-y-1 border-r border-zinc-800 pr-3">
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className={`block rounded-lg px-3 py-2 text-[13px] transition ${
                        pathname === c.href || pathname.startsWith(c.href + "/")
                          ? "bg-[#F58220]/15 font-bold text-[#F58220]"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      {c.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        }

        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href!}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-[#F58220]/15 text-[#F58220]"
                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            {item.icon && <item.icon size={19} className="shrink-0" />}
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </div>
  );
}
