"use client";

/* ============================================================
   IndustrialSkyline v4 — animated vector-style silhouettes.
   Real machinery images transformed into dark silhouettes with
   orange edge glow, scrolling across smoothly.
   
   CSS filters: brightness(0) + drop-shadow(orange) = silhouette
   ============================================================ */

const MACHINES = [
  { src: "/images/machinery/excavator.png", alt: "بیل مکانیکی" },
  { src: "/images/machinery/loader.png", alt: "لودر" },
  { src: "/images/machinery/dump-truck.png", alt: "دامپ‌تراک" },
  { src: "/images/machinery/grader.png", alt: "گریدر" },
];

export default function IndustrialSkyline() {
  const allMachines = [...MACHINES, ...MACHINES];

  return (
    <div className="relative h-14 w-full overflow-hidden" aria-hidden>
      {/* Ground line */}
      <div className="absolute inset-x-0 bottom-0.5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Dashed track */}
      <div
        className="absolute inset-x-0 bottom-1.5 h-px"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(245,130,32,0.15) 0 8px, transparent 8px 20px)",
        }}
      />

      {/* Scrolling machinery — silhouette style */}
      <div className="skyline-track absolute inset-0 flex items-end">
        {allMachines.map((m, i) => (
          <div
            key={i}
            className="skyline-item relative flex h-full shrink-0 items-end"
            style={{ width: "160px" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.src}
              alt={m.alt}
              className="mach-silhouette h-[85%] w-full object-contain object-bottom"
            />
          </div>
        ))}
      </div>

      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0a0a0a] to-transparent" />

      <style jsx>{`
        .skyline-track {
          animation: skyline-scroll 45s linear infinite;
          width: max-content;
        }
        .skyline-track:hover {
          animation-play-state: paused;
        }
        @keyframes skyline-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .skyline-item {
          animation: item-bob 3s ease-in-out infinite;
        }
        .skyline-item:nth-child(2n) {
          animation-delay: 0.5s;
        }
        .skyline-item:nth-child(3n) {
          animation-delay: 1s;
        }
        .skyline-item:nth-child(4n) {
          animation-delay: 1.5s;
        }
        @keyframes item-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }
        /* Silhouette effect: make image fully dark, then add orange glow */
        .mach-silhouette {
          filter: brightness(0) drop-shadow(0 0 3px rgba(245, 130, 32, 0.4));
          opacity: 0.6;
          transition: filter 0.3s ease;
        }
        .skyline-item:hover .mach-silhouette {
          filter: brightness(0.3) drop-shadow(0 0 8px rgba(245, 130, 32, 0.6));
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
