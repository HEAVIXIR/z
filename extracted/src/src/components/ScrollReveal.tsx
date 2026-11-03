"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ============================================================
   ScrollReveal — wraps children with a scroll-triggered fade-in.
   Uses IntersectionObserver. Staggered via delay prop.
   ============================================================ */

export default function ScrollReveal({
  children,
  delay = 0,
  id,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  id?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      id={id}
      className={`transition-all duration-700 ease-out ${className} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {children}
    </div>
  );
}
