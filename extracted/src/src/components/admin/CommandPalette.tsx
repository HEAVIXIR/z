"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  Megaphone,
  Building2,
  FolderTree,
  Crown,
  LayoutDashboard,
  Plus,
  Settings,
  ArrowRight,
} from "lucide-react";

/* ============================================================
   CommandPalette — ⌘K / Ctrl+K quick navigation overlay.
   Opens anywhere on the site. Fuzzy filter over command list.
   Keyboard: ↑↓ to navigate, Enter to run, Esc to close.
   ============================================================ */

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Home;
  href: string;
  group: "site" | "admin" | "action";
};

const COMMANDS: Cmd[] = [
  { id: "home", label: "صفحه اصلی", icon: Home, href: "/", group: "site" },
  { id: "listings", label: "همه آگهی‌ها", icon: Megaphone, href: "/listings", group: "site" },
  { id: "new-listing", label: "ثبت آگهی جدید", icon: Plus, href: "/listings/new", group: "action" },
  { id: "sell7", label: "فروش در ۷ روز", icon: Crown, href: "/#sell7", group: "site" },
  { id: "brands", label: "برندها", icon: Building2, href: "/#brands", group: "site" },
  { id: "categories", label: "دسته‌بندی‌ها", icon: FolderTree, href: "/#categories", group: "site" },
  { id: "login", label: "ورود به پنل مدیریت", icon: LayoutDashboard, href: "/login", group: "admin" },
  { id: "admin", label: "داشبورد مدیریت", icon: Settings, href: "/admin/dashboard", group: "admin" },
  { id: "admin-listings", label: "مدیریت آگهی‌ها", icon: Megaphone, href: "/admin/listings", group: "admin" },
  { id: "admin-brands", label: "مدیریت برندها", icon: Building2, href: "/admin/taxonomy/brands", group: "admin" },
  { id: "admin-cats", label: "مدیریت دسته‌بندی‌ها", icon: FolderTree, href: "/admin/categories", group: "admin" },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Global keybind: ⌘K / Ctrl+K */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Focus input when opened */
  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return COMMANDS;
    const term = q.trim().toLowerCase();
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(term) ||
        c.hint?.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term),
    );
  }, [q]);

  /* Keyboard navigation */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(filtered.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[active];
        if (cmd) {
          setOpen(false);
          router.push(cmd.href);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, router]);

  if (!open) return null;

  const groups: Cmd["group"][] = ["action", "site", "admin"];
  const groupLabels: Record<Cmd["group"], string> = {
    action: "اقدامات سریع",
    site: "صفحات سایت",
    admin: "پنل مدیریت",
  };

  let flatIdx = -1;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="mt-[12vh] w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b]/98 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search className="h-5 w-5 text-[#F58220]/70" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="جستجوی دستور یا صفحه... (Esc برای بستن)"
            className="h-14 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
          <kbd className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/40">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-white/40">
              نتیجه‌ای یافت نشد.
            </p>
          ) : (
            groups.map((group) => {
              const items = filtered.filter((c) => c.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group} className="mb-2">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">
                    {groupLabels[group]}
                  </div>
                  {items.map((cmd) => {
                    flatIdx++;
                    const idx = flatIdx;
                    const Icon = cmd.icon;
                    const isActive = idx === active;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => {
                          setOpen(false);
                          router.push(cmd.href);
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right transition ${
                          isActive
                            ? "bg-[#F58220]/15 text-white"
                            : "text-white/65 hover:bg-white/5"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? "text-[#F58220]" : "text-white/40"
                          }`}
                        />
                        <span className="flex-1 text-sm font-medium">{cmd.label}</span>
                        {isActive && (
                          <ArrowRight className="h-3.5 w-3.5 text-[#F58220]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-white/30">
          <span>هویکس Command Palette</span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">↑↓</kbd>
              ناوبری
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">↵</kbd>
              انتخاب
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
