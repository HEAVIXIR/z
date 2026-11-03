import Link from "next/link";
import {
  LayoutGrid,
  Rows3,
  Sparkles,
  PanelBottom,
  Menu as MenuIcon,
  Image as ImageIcon,
  ChevronLeft,
  MonitorSmartphone,
  BarChart3,
  FolderTree,
  Wrench,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "صفحه اصلی — هویکس" };

const cards = [
  {
    title: "بخش‌های صفحه",
    desc: "مدیریت سکشن‌های صفحه اصلی، ترتیب نمایش و فعال‌سازی بخش‌ها.",
    href: "/admin/homepage-layout",
    icon: LayoutGrid,
    accent: "text-orange-600",
    ring: "ring-orange-100",
  },
  {
    title: "چیدمان صفحه اصلی",
    desc: "تنظیم چیدمان، فاصله‌ها و ترتیب سکشن‌های لندینگ سایت.",
    href: "/admin/homepage-layout",
    icon: Rows3,
    accent: "text-amber-600",
    ring: "ring-amber-100",
  },
  {
    title: "ویرایشگر هیرو",
    desc: "کنترل دقیق عنوان‌ها، بَج، دکمه‌ها، اسلایدر و کارت‌های هیرو با پیش‌نمایش زنده.",
    href: "/admin/home/hero",
    icon: Sparkles,
    accent: "text-rose-600",
    ring: "ring-rose-100",
  },
  {
    title: "دسته‌بندی صفحه اصلی",
    desc: "انتخاب نسل دسته‌ها (L1 یا L2) که در صفحه اصلی نمایش داده می‌شوند.",
    href: "/admin/home/categories",
    icon: FolderTree,
    accent: "text-emerald-600",
    ring: "ring-emerald-100",
  },
  {
    title: "خدمات هویکس",
    desc: "مدیریت خدمات نمایش‌داده‌شده در صفحه اصلی — افزودن، ویرایش، ترتیب.",
    href: "/admin/services",
    icon: Wrench,
    accent: "text-orange-600",
    ring: "ring-orange-100",
  },
  {
    title: "ویرایشگر فوتر",
    desc: "ویرایش متن درباره‌ما، اطلاعات تماس، ساعات کاری و کپی‌رایت سایت.",
    href: "/admin/home/footer",
    icon: PanelBottom,
    accent: "text-emerald-600",
    ring: "ring-emerald-100",
  },
  {
    title: "آمار سایت",
    desc: "پیکربندی آمار پویای صفحه اصلی — انتخاب معیار، ترتیب و مقدار ثابت.",
    href: "/admin/site-stats",
    icon: BarChart3,
    accent: "text-orange-600",
    ring: "ring-orange-100",
  },
  {
    title: "منوی سایت",
    desc: "مدیریت آیتم‌های منوی اصلی و زیرمنوها با ترتیب و آیکون.",
    href: "/admin/menu",
    icon: MenuIcon,
    accent: "text-sky-600",
    ring: "ring-sky-100",
  },
  {
    title: "رسانه",
    desc: "کتابخانه تصاویر سایت — بارگذاری، مرتب‌سازی و جستجوی رسانه‌ها.",
    href: "/admin/media",
    icon: ImageIcon,
    accent: "text-violet-600",
    ring: "ring-violet-100",
  },
];

export default function AdminHomeHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <MonitorSmartphone className="h-6 w-6 text-[#F58220]" />
          صفحه اصلی
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          مدیریت مرکزی صفحه اصلی سایت — بخش‌ها، چیدمان، هیرو، فوتر، منو و
          رسانه‌ها.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href + c.title}
              href={c.href}
              className={`group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm ring-1 ${c.ring} transition hover:-translate-y-0.5 hover:border-[#F58220] hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 ${c.accent}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="mt-4 flex items-center gap-1 text-lg font-bold text-zinc-900">
                {c.title}
                <ChevronLeft className="h-4 w-4 text-zinc-300 transition group-hover:-translate-x-1 group-hover:text-[#F58220]" />
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-zinc-500">
                {c.desc}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
