import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import LogoutButton from "./LogoutButton";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";

/* =========================================================
   ADMIN LAYOUT — Aria-style RTL sidebar + topbar.
   Access rules (P0-RBAC enforcement):
     • admin cookie (LEGACY username/password path — see     → allowed
       src/lib/auth.ts `isAuthenticated`); kept for backward
       compatibility with the ADMIN_CREDENTIALS login. This
       path does NOT consult UserRole / RBAC. To be removed
       once all admins are migrated to user-session logins.
     • user session cookie with ADMIN UserRole (RBAC)       → allowed
     • user session cookie with legacy user.role === ADMIN  → allowed (transition)
     • user session cookie with non-admin role              → /dashboard
     • not authenticated at all                             → /login
========================================================= */

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // LEGACY admin-cookie path — username/password auth via ADMIN_CREDENTIALS.
  // This path bypasses RBAC entirely. Kept for backward compatibility until
  // all admin operators are migrated to user-session logins with ADMIN UserRole.
  const adminAuthed = await isAuthenticated();
  if (!adminAuthed) {
    // Try user session — only ADMIN role may view the admin panel.
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    // P0-5 RBAC: check UserRole table for ADMIN role. Falls back to the
    // legacy User.role column for the transition period (see src/lib/rbac.ts).
    const adminOk = await isAdmin(user.id);
    if (!adminOk) {
      redirect("/dashboard");
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-zinc-100 text-zinc-900"
      style={{ "--admin-sidebar-width": "18rem" } as React.CSSProperties}
    >
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 right-0 z-[100] flex flex-col bg-zinc-950 text-white shadow-2xl"
        style={{ width: "var(--admin-sidebar-width)" }}
      >
        {/* Logo */}
        <div className="shrink-0 border-b border-zinc-800 px-5 py-5">
          <div className="flex items-center gap-3">
            { }
            <img
              src="/logos/heavix-logo.svg"
              alt="HEAVIX"
              className="h-9 w-auto"
            />
            <div className="mr-auto">
              <p className="text-[10px] text-zinc-500">پنل مدیریت</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <AdminSidebarNav />
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-zinc-800 p-3">
          <LogoutButton />
        </div>
      </aside>

      {/* Main area */}
      <div
        className="flex min-h-screen min-w-0 flex-col"
        style={{ marginRight: "var(--admin-sidebar-width)" }}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex min-h-20 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/95 px-6 shadow-sm backdrop-blur lg:px-8">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-zinc-900">
              پنل مدیریت هویکس
            </h2>
            <p className="mt-1 truncate text-xs text-zinc-500">
              مدیریت آگهی‌ها، برندها و کاربران مارکت‌پلیس صنعتی
            </p>
          </div>
          <div className="mr-4 flex shrink-0 items-center gap-3">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#F58220] hover:text-[#F58220]"
            >
              مشاهده سایت
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
