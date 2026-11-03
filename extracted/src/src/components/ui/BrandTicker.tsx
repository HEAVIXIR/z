"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ============================================================
   BrandTicker v2 — 3D rotating cylinder of brand cards.
   Completely new effect: brands rotate around a vertical axis
   in 3D space (like a showcase carousel), with the front card
   highlighted. Pure CSS 3D transforms + rAF, no Swiper.
   ============================================================ */

export type TickerBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  nameEn?: string | null;
  listingCount?: number;
};

export default function BrandTicker({ brands }: { brands: TickerBrand[] }) {
  const items = brands.slice(0, 14);
  const n = items.length;

  const ringRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rotationRef = useRef(0);
  const pausedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const radius = Math.max(220, Math.round((220 * n) / (2 * Math.PI)));
  const perspective = radius * 3.2;
  const step = n > 0 ? 360 / n : 0;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const speed = 360 / (n * 6); // full rotation in n*6 seconds
    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      if (!pausedRef.current) {
        rotationRef.current = (rotationRef.current + speed * dt) % 360;
      }
      const rot = rotationRef.current;
      if (ringRef.current) {
        ringRef.current.style.transform = `translateZ(-${radius}px) rotateY(${rot}deg)`;
      }
      // track which card is front-most
      const frontIdx = Math.round(((360 - rot) % 360) / step) % n;
      if (frontIdx !== activeIdx) setActiveIdx(frontIdx < 0 ? n + frontIdx : frontIdx);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, radius, step]);

  if (n < 3) return null;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ perspective: `${perspective}px` }}
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      {/* Floor reflection glow */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 h-16 w-[60%] -translate-x-1/2 rounded-[100%] bg-[#F58220]/8 blur-3xl" />

      {/* 3D ring */}
      <div
        className="relative"
        style={{ width: 240, height: 140, transformStyle: "preserve-3d" }}
      >
        <div
          ref={ringRef}
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `translateZ(-${radius}px)`,
          }}
        >
          {items.map((b, i) => {
            const angle = i * step;
            return (
              <div
                key={b.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: 200,
                  height: 110,
                  marginLeft: -100,
                  marginTop: -55,
                  transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                }}
              >
                <BrandChip b={b} active={i === activeIdx} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Active brand label */}
      <div className="mt-6 h-6 text-center">
        <span className="text-sm font-bold text-white/60">
          {items[activeIdx]?.name}
          {items[activeIdx]?.listingCount ? (
            <span className="mr-2 text-[#F58220]">
              {items[activeIdx].listingCount.toLocaleString("fa-IR")} دستگاه
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function BrandChip({ b, active }: { b: TickerBrand; active: boolean }) {
  return (
    <Link
      href={`/listings?brand=${b.slug}`}
      className={`flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border bg-gradient-to-br transition-all duration-300 ${
        active
          ? "border-[#F58220]/60 from-[#1c1c1c] to-[#0c0c0c] shadow-[0_15px_40px_-10px_rgba(245,130,32,0.4)]"
          : "border-white/10 from-[#141414] to-[#0a0a0a]"
      }`}
    >
      <span className="flex h-12 w-24 items-center justify-center overflow-hidden rounded-lg bg-white/95 p-1.5 shadow-inner">
        {b.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b.logoUrl}
            alt={b.name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-2xl font-black text-[#F58220]">
            {(b.nameEn ?? b.name).charAt(0)}
          </span>
        )}
      </span>
      <span
        className={`text-[11px] font-bold transition ${
          active ? "text-[#F58220]" : "text-white/45"
        }`}
      >
        {b.name}
      </span>
    </Link>
  );
}
