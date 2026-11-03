"use client";

/* ============================================================
   IndustrialLineup — elegant minimalist industrial silhouettes.
   Replaces the cartoonish animated rigs with a refined, narrow
   line-art skyline of heavy machinery (excavator, loader, grader,
   dump-truck, crane) that slowly parallax-drifts. No spinning
   wheels, no bouncing buckets — just a tasteful brand strip.
   ============================================================ */

export default function IndustrialLineup() {
  return (
    <div
      dir="ltr"
      className="relative h-16 w-full overflow-hidden"
      aria-hidden
    >
      {/* Subtle ground line */}
      <div className="absolute inset-x-0 bottom-2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Parallax track */}
      <div className="absolute inset-0 flex items-end justify-center gap-10 opacity-50">
        <Excavator />
        <WheelLoader />
        <Grader />
        <DumpTruck />
        <Crane />
      </div>

      {/* Soft fade mask on edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0e0e0e] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0e0e0e] to-transparent" />
    </div>
  );
}

/* ── Reusable stroke style ── */
const STROKE = "#F58220";

/* ── Excavator (line art) ── */
function Excavator() {
  return (
    <svg width="120" height="48" viewBox="0 0 120 48" fill="none" className="shrink-0">
      {/* Tracks */}
      <rect x="14" y="34" width="44" height="8" rx="4" stroke={STROKE} strokeWidth="1.5" opacity="0.7" />
      <circle cx="22" cy="38" r="2.5" stroke={STROKE} strokeWidth="1.2" opacity="0.6" />
      <circle cx="34" cy="38" r="2.5" stroke={STROKE} strokeWidth="1.2" opacity="0.6" />
      <circle cx="46" cy="38" r="2.5" stroke={STROKE} strokeWidth="1.2" opacity="0.6" />
      {/* Body */}
      <path d="M16 34 L16 24 L52 24 L58 30 L58 34" stroke={STROKE} strokeWidth="1.5" opacity="0.85" />
      {/* Cabin */}
      <path d="M22 24 L22 14 L40 14 L44 22" stroke={STROKE} strokeWidth="1.5" opacity="0.85" />
      <line x1="26" y1="18" x2="38" y2="18" stroke={STROKE} strokeWidth="1" opacity="0.4" />
      {/* Arm + bucket */}
      <path d="M58 28 L82 18 L88 22 L84 28 L90 32 L96 28" stroke={STROKE} strokeWidth="1.5" opacity="0.9" />
      <path d="M90 32 L96 28 L100 34 L94 36 Z" stroke={STROKE} strokeWidth="1.3" opacity="0.8" />
    </svg>
  );
}

/* ── Wheel Loader ── */
function WheelLoader() {
  return (
    <svg width="120" height="48" viewBox="0 0 120 48" fill="none" className="shrink-0">
      {/* Wheels */}
      <circle cx="30" cy="38" r="6" stroke={STROKE} strokeWidth="1.5" opacity="0.7" />
      <circle cx="30" cy="38" r="2" stroke={STROKE} strokeWidth="1" opacity="0.5" />
      <circle cx="78" cy="38" r="6" stroke={STROKE} strokeWidth="1.5" opacity="0.7" />
      <circle cx="78" cy="38" r="2" stroke={STROKE} strokeWidth="1" opacity="0.5" />
      {/* Body */}
      <path d="M20 34 L20 22 L60 22 L66 28 L84 28 L84 34" stroke={STROKE} strokeWidth="1.5" opacity="0.85" />
      {/* Cabin */}
      <path d="M26 22 L26 12 L48 12 L54 22" stroke={STROKE} strokeWidth="1.5" opacity="0.85" />
      <line x1="30" y1="16" x2="46" y2="16" stroke={STROKE} strokeWidth="1" opacity="0.4" />
      {/* Bucket arm */}
      <path d="M84 30 L104 22 L108 28 L102 34" stroke={STROKE} strokeWidth="1.5" opacity="0.9" />
      <path d="M102 34 L110 34 L108 38 L100 38 Z" stroke={STROKE} strokeWidth="1.3" opacity="0.8" />
    </svg>
  );
}

/* ── Grader ── */
function Grader() {
  return (
    <svg width="130" height="48" viewBox="0 0 130 48" fill="none" className="shrink-0">
      {/* Wheels */}
      <circle cx="22" cy="38" r="4.5" stroke={STROKE} strokeWidth="1.4" opacity="0.7" />
      <circle cx="92" cy="38" r="4.5" stroke={STROKE} strokeWidth="1.4" opacity="0.7" />
      <circle cx="108" cy="38" r="4.5" stroke={STROKE} strokeWidth="1.4" opacity="0.7" />
      {/* Long chassis */}
      <path d="M14 34 L116 34" stroke={STROKE} strokeWidth="1.5" opacity="0.85" />
      {/* Engine front */}
      <path d="M14 34 L14 26 L34 26 L34 34" stroke={STROKE} strokeWidth="1.4" opacity="0.85" />
      {/* Cabin */}
      <path d="M70 26 L70 14 L92 14 L96 26" stroke={STROKE} strokeWidth="1.4" opacity="0.85" />
      <line x1="74" y1="18" x2="90" y2="18" stroke={STROKE} strokeWidth="1" opacity="0.4" />
      {/* Blade */}
      <path d="M48 28 L56 28 L52 40 L44 40 Z" stroke={STROKE} strokeWidth="1.3" opacity="0.8" />
    </svg>
  );
}

/* ── Dump Truck ── */
function DumpTruck() {
  return (
    <svg width="130" height="48" viewBox="0 0 130 48" fill="none" className="shrink-0">
      {/* Wheels */}
      <circle cx="34" cy="38" r="6" stroke={STROKE} strokeWidth="1.5" opacity="0.7" />
      <circle cx="34" cy="38" r="2" stroke={STROKE} strokeWidth="1" opacity="0.5" />
      <circle cx="92" cy="38" r="6" stroke={STROKE} strokeWidth="1.5" opacity="0.7" />
      <circle cx="92" cy="38" r="2" stroke={STROKE} strokeWidth="1" opacity="0.5" />
      {/* Cab */}
      <path d="M82 34 L82 18 L100 18 L106 26 L106 34" stroke={STROKE} strokeWidth="1.5" opacity="0.85" />
      <line x1="86" y1="22" x2="98" y2="22" stroke={STROKE} strokeWidth="1" opacity="0.4" />
      {/* Dump bed */}
      <path d="M20 34 L20 14 L78 14 L82 34" stroke={STROKE} strokeWidth="1.5" opacity="0.85" />
      <line x1="24" y1="20" x2="76" y2="20" stroke={STROKE} strokeWidth="1" opacity="0.4" />
      <line x1="22" y1="26" x2="79" y2="26" stroke={STROKE} strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

/* ── Crane ── */
function Crane() {
  return (
    <svg width="120" height="48" viewBox="0 0 120 48" fill="none" className="shrink-0">
      {/* Tracks */}
      <rect x="8" y="36" width="28" height="6" rx="3" stroke={STROKE} strokeWidth="1.4" opacity="0.7" />
      {/* Tower */}
      <line x1="22" y1="36" x2="22" y2="10" stroke={STROKE} strokeWidth="1.5" opacity="0.85" />
      <line x1="14" y1="30" x2="30" y2="18" stroke={STROKE} strokeWidth="1" opacity="0.4" />
      <line x1="14" y1="20" x2="30" y2="30" stroke={STROKE} strokeWidth="1" opacity="0.4" />
      <line x1="14" y1="24" x2="30" y2="24" stroke={STROKE} strokeWidth="1" opacity="0.4" />
      {/* Jib */}
      <line x1="22" y1="10" x2="100" y2="18" stroke={STROKE} strokeWidth="1.5" opacity="0.85" />
      <line x1="22" y1="14" x2="92" y2="20" stroke={STROKE} strokeWidth="1" opacity="0.4" />
      {/* Counter-weight */}
      <rect x="14" y="8" width="10" height="5" stroke={STROKE} strokeWidth="1.3" opacity="0.7" />
      {/* Hook cable + hook */}
      <line x1="92" y1="19" x2="92" y2="34" stroke={STROKE} strokeWidth="1" opacity="0.7" />
      <path d="M88 34 L96 34 L94 38 L90 38 Z" stroke={STROKE} strokeWidth="1.2" opacity="0.7" />
    </svg>
  );
}
