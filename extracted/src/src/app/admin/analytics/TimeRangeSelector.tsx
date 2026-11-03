"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/* ============================================================
   TimeRangeSelector — 7/30/90-day switcher for /admin/analytics.
   Uses URL search params (?days=) so the page can be SSR-rendered
   with the correct window and the selection is bookmark-friendly.
   ============================================================ */

const OPTIONS = [
  { value: 7, label: "۷ روز" },
  { value: 30, label: "۳۰ روز" },
  { value: 90, label: "۹۰ روز" },
];

export default function TimeRangeSelector({ current }: { current: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setDays = useCallback(
    (days: number) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("days", String(days));
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <div
      className="inline-flex rounded-xl border border-zinc-200 bg-white p-1"
      role="group"
      aria-label="بازه زمانی"
    >
      {OPTIONS.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setDays(o.value)}
            aria-pressed={active}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              active
                ? "bg-[#F58220] text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
