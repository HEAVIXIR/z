"use client";

import { useEffect, useMemo, useRef } from "react";
import CategoryRingCard from "./CategoryRingCard";

/* ============================================================
   CategoryRing — tilted 3D rotating ring of category cards.
   Pure JS (requestAnimationFrame) + CSS 3D transforms.
   ✅ Caps card count to avoid giant radius
   ✅ Pauses on hover, respects prefers-reduced-motion
   ============================================================ */

export type RingCategory = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  imageUrl?: string | null;
  featured?: boolean;
  listingCount?: number;
};

export default function CategoryRing({
  categories,
  cardWidth = 225,
  cardHeight = 320,
  secondsPerCard = 4.6,
  tilt = -4,
  maxCards = 12,
}: {
  categories: RingCategory[];
  cardWidth?: number;
  cardHeight?: number;
  secondsPerCard?: number;
  tilt?: number;
  maxCards?: number;
}) {
  const items = useMemo(() => categories.slice(0, maxCards), [categories, maxCards]);
  const n = items.length;
  const step = n > 0 ? 360 / n : 0;

  const radius = useMemo(
    () => Math.max(280, Math.round(((cardWidth - 28) * n) / (2 * Math.PI))),
    [cardWidth, n],
  );
  const perspective = Math.max(1500, radius * 10);

  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rotationRef = useRef(0);
  const pausedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const paint = (rotation: number) => {
    for (let i = 0; i < n; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const angle = rotation + i * step;
      const rad = (angle * Math.PI) / 180;
      const front = Math.cos(rad);
      const opacity = 0.12 + ((front + 1) / 2) * 0.88;
      const brightness = 0.4 + ((front + 1) / 2) * 0.6;
      const blur = front < -0.15 ? Math.min(-(front + 0.15) * 4, 5) : 0;
      const radiusX = radius * 1.35;
      const radiusZ = radius * 0.75;
      const x = Math.sin(rad) * radiusX;
      const z = Math.cos(rad) * radiusZ;
      el.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) rotateY(${angle}deg)`;
      el.style.opacity = opacity.toFixed(3);
      el.style.filter =
        blur > 0
          ? `brightness(${brightness.toFixed(2)}) blur(${blur.toFixed(1)}px)`
          : `brightness(${brightness.toFixed(2)})`;
      el.style.zIndex = String(Math.round(front * 1000));
      el.style.pointerEvents = front > 0.1 ? "auto" : "none";
    }
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      paint(0);
      return;
    }
    const speed = 360 / (n * secondsPerCard);
    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      if (!pausedRef.current) {
        rotationRef.current = (rotationRef.current + speed * dt) % 360;
      }
      paint(rotationRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
     
  }, [n, step, radius, secondsPerCard]);

  if (n < 4) return null;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height: cardHeight + 150 }}
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F58220]/10 blur-[90px]"
      />
      <div
        className="relative"
        style={{
          perspective: `${perspective}px`,
          width: radius * 2 + cardWidth,
          height: cardHeight + 120,
        }}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            transformStyle: "preserve-3d",
            transform: `translate(-50%, -50%) rotateX(${tilt}deg)`,
            width: 0,
            height: 0,
          }}
        >
          {items.map((category, i) => (
            <div
              key={category.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="absolute left-0 top-0 will-change-transform"
              style={{
                width: cardWidth,
                height: cardHeight,
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
              }}
            >
              <CategoryRingCard category={category} />
            </div>
          ))}
        </div>
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-6 left-1/2 h-6 w-[58%] -translate-x-1/2 rounded-[100%] bg-black/60 blur-2xl"
      />
    </div>
  );
}
