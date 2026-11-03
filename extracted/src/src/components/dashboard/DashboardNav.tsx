"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Heart, PlusCircle, Handshake } from "lucide-react";
import UserLogoutButton from "@/app/dashboard/UserLogoutButton";

/* ============================================================
   DashboardNav — shared sticky top nav for /dashboard sub-pages.
   Highlights the active link via usePathname().
   ============================================================ */

const LINKS = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/deal-rooms", label: "اتاق معامله", icon: Handshake },
  { href: "/dashboard/messages", label: "پیام‌ها", icon: MessageSquare },
  { href: "/dashboard/favorites", label: "علاقه‌مندی‌ها", icon: Heart },
];

export default function DashboardNav() {
  const pathname = usePathname() ?? "";
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0b0b]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 lg:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <img
            src="/logos/heavix-logo.svg"
            alt="HEAVIX"
            className="h-8 w-auto"
          />
          <span className="hidden text-xs font-bold text-white/40 sm:inline">
            داشبورد کاربری
          </span>
        </Link>

        <nav
          aria-label="ناوبری داشبورد"
          className="flex flex-1 items-center justify-center gap-1 overflow-x-auto no-scrollbar"
        >
          {LINKS.map((l) => {
            const active = isActive(l.href, l.exact);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
                  active
                    ? "bg-[#F58220] text-white"
                    : "border border-white/10 text-white/65 hover:border-[#F58220]/40 hover:text-[#F58220]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">{l.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/listings/new"
            className="hidden items-center gap-1 rounded-full bg-[#F58220] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#ff8c38] sm:inline-flex"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            ثبت آگهی
          </Link>
          <UserLogoutButton />
        </div>
      </div>
    </header>
  );
}

export { LINKS as DASHBOARD_NAV_LINKS };
