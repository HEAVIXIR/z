"use client";

import { useEffect, useRef, useState } from "react";
import type { WhyItem } from "./WhyUsSection";

/* ============================================================
   WhyUsClient — bento grid with scroll-reveal + guaranteed
   fallback + mouse-follow spotlight.
   ============================================================ */

export default function WhyUsClient({ items }: { items: WhyItem[] }) {
  return (
    <div className="grid auto-rows-[220px] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item, idx) => {
        const span = idx === 0 || idx === 5 ? "lg:col-span-2" : "";
        return <WhyUsCard key={item.id} item={item} idx={idx} span={span} />;
      })}
    </div>
  );
}

function WhyUsCard({
  item,
  idx,
  span,
}: {
  item: WhyItem;
  idx: number;
  span: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /* Guaranteed fallback — visible after 1.2s no matter what */
    const fallback = setTimeout(() => setVisible(true), 1200);

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return () => clearTimeout(fallback);
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          clearTimeout(fallback);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );

    io.observe(el);

    return () => {
      clearTimeout(fallback);
      io.disconnect();
    };
  }, []);

  const handleMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setMouse({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-7 transition-all duration-700 ${span} ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } hover:border-[#F58220]/40 hover:shadow-[0_0_40px_-10px_rgba(245,130,32,0.3)]`}
      style={{ transitionDelay: `${(idx % 4) * 90}ms` }}
    >
      {/* Mouse-follow spotlight */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mouse.x}% ${mouse.y}%, rgba(245,130,32,0.12), transparent 40%)`,
        }}
      />

      <div className="absolute top-5 left-5 text-[10px] font-black text-white/20">
        {String(idx + 1).padStart(2, "0")}
      </div>

      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F58220]/20 to-[#F58220]/5 text-3xl transition-transform duration-500 group-hover:rotate-3 group-hover:scale-110">
        <span>{item.icon}</span>
      </div>

      <div className="relative mt-5">
        {item.subtitle && (
          <div className="text-[10px] font-black tracking-wider text-[#F58220]">
            {item.subtitle}
          </div>
        )}
        <h3 className="mt-1 text-lg font-black leading-tight text-white lg:text-xl">
          {item.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-white/55">
          {item.description}
        </p>
      </div>

      {item.stat && (
        <div className="absolute bottom-5 left-5 flex flex-col items-end">
          <span className="bg-gradient-to-br from-[#F58220] to-[#c2680a] bg-clip-text text-3xl font-black text-transparent lg:text-4xl">
            {item.stat}
          </span>
          {item.statLabel && (
            <span className="text-[10px] font-bold text-white/40">{item.statLabel}</span>
          )}
        </div>
      )}

      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[#F58220] to-transparent transition-all duration-500 group-hover:w-full" />
    </div>
  );
}
