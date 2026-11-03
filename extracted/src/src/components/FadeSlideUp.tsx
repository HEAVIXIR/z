"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ============================================================
   FadeSlideUp — wraps children with the `fade-slide-up` CSS
   animation. The animation starts when the element enters the
   viewport (IntersectionObserver, threshold 0.15). Stagger via
   the `delay` prop (ms). (FIX-SALE-ANIM)
   ============================================================ */

export default function FadeSlideUp({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            const t = setTimeout(() => setInView(true), delay);
            return () => {
              clearTimeout(t);
              obs.disconnect();
            };
          }
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  const Component = Tag as any;
  return (
    <Component
      ref={ref as any}
      className={`fade-slide-up ${inView ? "in-view" : ""} ${className}`}
    >
      {children}
    </Component>
  );
}
