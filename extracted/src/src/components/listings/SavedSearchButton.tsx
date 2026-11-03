"use client";

import { useState, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   SavedSearchButton — "خبرم کن" button on /listings page.
   Saves current search URL to localStorage and shows a toast.
   Innovation catalog item #2 (saved searches + alerts).
   ============================================================ */

type SavedSearch = {
  id: string;
  url: string;
  label: string;
  createdAt: string;
};

const STORAGE_KEY = "heavix-saved-searches";

export default function SavedSearchButton({
  searchUrl,
  label,
}: {
  searchUrl: string;
  label: string;
}) {
  const [saved, setSaved] = useState(false);
  const [totalSaved, setTotalSaved] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const items: SavedSearch[] = raw ? JSON.parse(raw) : [];
      setTotalSaved(items.length);
      setSaved(items.some((s) => s.url === searchUrl));
    } catch {}
  }, [searchUrl]);

  const toggle = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const items: SavedSearch[] = raw ? JSON.parse(raw) : [];
      let updated: SavedSearch[];
      if (saved) {
        updated = items.filter((s) => s.url !== searchUrl);
      } else {
        updated = [
          ...items,
          {
            id: `s-${Date.now()}`,
            url: searchUrl,
            label,
            createdAt: new Date().toISOString(),
          },
        ];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSaved(!saved);
      setTotalSaved(updated.length);
    } catch {}
  };

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition ${
        saved
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : "border-white/15 bg-white/[0.04] text-white/80 hover:border-[#F58220]/40 hover:text-[#F58220]"
      }`}
      title={saved ? "این جستجو ذخیره شده — کلیک برای حذف" : "ذخیره این جستجو و دریافت هشدار آگهی‌های جدید"}
    >
      {saved ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {saved ? "ذخیره شد" : "خبرم کن"}
      {totalSaved > 0 && (
        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-black">
          {toFa(totalSaved)}
        </span>
      )}
    </button>
  );
}
