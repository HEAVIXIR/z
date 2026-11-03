"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, Bell, User } from "lucide-react";

/* ============================================================
   MobileNav — bottom navigation (mobile only, like a native app).
   UX 2025 pattern from the innovation catalog.
   5 tabs: خانه / جستجو / + / اعلان‌ها / حساب
   ============================================================ */

const TABS = [
  { href: "/", icon: Home, label: "خانه" },
  { href: "/listings", icon: Search, label: "جستجو" },
  { href: "/listings/new", icon: Plus, label: "ثبت", primary: true },
  { href: "/#brands", icon: Bell, label: "اعلان" },
  { href: "/login", icon: User, label: "حساب" },
];

export default function MobileNav() {
  const pathname = usePathname();

  // Hide on admin (admin has its own layout)
  if (pathname?.startsWith("/admin")) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[150] flex items-center justify-around border-t border-white/10 bg-[#0b0b0b]/95 px-2 py-2 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="ناوبری موبایل"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active =
          tab.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(tab.href) || (tab.href === "/listings" && pathname?.startsWith("/listings/"));

        if (tab.primary) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-2xl bg-[#F58220] text-white shadow-[0_8px_20px_-4px_rgba(245,130,32,0.6)]"
              aria-label={tab.label}
            >
              <Icon className="h-6 w-6" />
            </Link>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 transition ${
              active ? "text-[#F58220]" : "text-white/55"
            }`}
            aria-label={tab.label}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-bold">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
