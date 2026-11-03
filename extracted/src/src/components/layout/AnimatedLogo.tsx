"use client";

import { useEffect, useState } from "react";

/* ============================================================
   AnimatedLogo v4 — uses the ORIGINAL heavix-logo.svg design.
   CHAT-2026-09-21 (user feedback: "use the correct logos that
   existed before"). The original heavix-logo.svg + mekanix-logo.svg
   already have: white #ffffff icon + wordmark + orange #F58220 "IX"
   + diamond. No currentColor — explicit white + orange.

   - Logo 2x bigger (height prop, default 80px).
   - Persian "هویکس" wordmark: "هوی" white + "کس" orange.
   - 10s fade-in/out animation cycle.
   ============================================================ */

export default function AnimatedLogo({
  logoUrl,
  durationMs = 10000,
  height = 80,
  showPersianName = true,
}: {
  logoUrl?: string | null;
  durationMs?: number;
  height?: number;
  showPersianName?: boolean;
}) {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCycle((c) => c + 1);
    }, durationMs);
    return () => clearInterval(id);
  }, [durationMs]);

  // Use the ORIGINAL logo SVG — has correct icon design + "HEAV" white + "IX" orange.
  // Falls back to logoUrl if admin uploaded a custom logo.
  const src = logoUrl || "/logos/heavix-logo.svg";

  return (
    <div
      key={cycle}
      className="flex items-center gap-3"
      aria-label="هویکس — HEAVIX"
    >
      {/* Logo icon + English wordmark */}
      <img
        src={src}
        alt="HEAVIX"
        style={{
          height: `${height}px`,
          width: "auto",
          animation: `logoFadeInOut ${durationMs}ms ease-in-out both`,
        }}
        draggable={false}
      />
      {/* Persian wordmark: هوی + کس(orange) */}
      {showPersianName && (
        <span
          className="select-none text-2xl font-black tracking-tight"
          style={{
            animation: `logoFadeInOut ${durationMs}ms ease-in-out both`,
          }}
        >
          <span className="text-white">هوی</span>
          <span className="text-[#F58220]">کس</span>
        </span>
      )}
    </div>
  );
}
