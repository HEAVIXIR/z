"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { toFa, timeAgo } from "@/lib/format";

/* ============================================================
   NotificationBell — header bell with dropdown panel.
   In this lightweight build (no User model), notifications are
   simulated client-side from localStorage so the UX is real and
   demonstrable. In production, wire to /api/notifications.
   ============================================================ */

type NotificationRow = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const STORAGE_KEY = "heavix-notifications";

const SEED: NotificationRow[] = [
  {
    id: "n1",
    title: "خوش آمدید به هویکس",
    message: "حساب شما فعال شد — همین حالا اولین آگهی خود را ثبت کنید.",
    link: "/listings/new",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  {
    id: "n2",
    title: "کمپین فروش در ۷ روز",
    message: "فرآیند فروش تضمینی هویکس فعال است — دستگاه خود را ثبت کنید.",
    link: "/#sell7",
    read: false,
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: "n3",
    title: "بیل مکانیکی کوماتسو PC220",
    message: "یک آگهی جدید در دسته مورد علاقه شما ثبت شد.",
    link: "/listings/komatsu-excavator-01",
    read: true,
    createdAt: new Date(Date.now() - 26 * 3600_000).toISOString(),
  },
];

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(JSON.parse(raw));
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
        setItems(SEED);
      }
    } catch {
      setItems(SEED);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((i) => !i.read).length;

  const openPanel = () => {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      // mark all read
      const updated = items.map((i) => ({ ...i, read: true }));
      setItems(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
  };

  const goTo = (row: NotificationRow) => {
    setOpen(false);
    if (row.link) router.push(row.link);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={openPanel}
        aria-label={`اعلان‌ها${unread > 0 ? ` — ${toFa(unread)} خوانده‌نشده` : ""}`}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
          unread > 0
            ? "border-[#F58220]/40 bg-[#F58220]/10 text-[#F58220]"
            : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
        }`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F58220] px-1 text-[9px] font-black text-white">
            {toFa(unread > 9 ? "۹+" : unread)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[70] w-80 pt-2.5">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b]/98 shadow-[0_25px_80px_rgba(0,0,0,.6)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <span className="text-xs font-black text-white">اعلان‌ها</span>
              {items.length > 0 && (
                <span className="text-[10px] text-white/40">
                  {toFa(items.length)} اخیر
                </span>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs leading-6 text-white/40">
                  اعلانی ندارید — پیام‌ها و رویدادهای کمپین‌ها اینجا ظاهر می‌شوند.
                </p>
              ) : (
                items.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => goTo(row)}
                    className={`flex w-full items-start gap-2.5 border-b border-white/5 px-4 py-3 text-right transition-colors last:border-0 hover:bg-white/5 ${
                      !row.read ? "bg-[#F58220]/[0.04]" : ""
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        row.read ? "bg-white/20" : "bg-[#F58220]"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-bold text-white">
                        {row.title}
                      </span>
                      {row.message && (
                        <span className="mt-0.5 line-clamp-2 block text-[11px] leading-5 text-white/50">
                          {row.message}
                        </span>
                      )}
                      <span className="mt-1 block text-[10px] text-white/30">
                        {timeAgo(row.createdAt)}
                      </span>
                    </span>
                    {row.read && <Check className="mt-1 h-3 w-3 shrink-0 text-white/30" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
