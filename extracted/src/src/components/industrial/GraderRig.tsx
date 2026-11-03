/* HEAVIX — Grader rig (animated SVG). Ported from Aria MJ. */

function GWheel({ cx }: { cx: number }) {
  return (
    <g>
      <circle cx={cx} cy="98" r="16" fill="#0c0c0c" />
      <circle cx={cx} cy="98" r="13.5" fill="none" stroke="#2b2b2b" strokeWidth="3" strokeDasharray="3 5" />
      <g className="rig-wheel">
        <circle cx={cx} cy="98" r="7" fill="#151515" stroke="#F58220" strokeWidth="2" />
        <path d={`M${cx} 92 V104 M${cx - 6} 98 H${cx + 6}`} stroke="#F58220" strokeWidth="1.5" />
      </g>
    </g>
  );
}

export default function GraderRig() {
  return (
    <svg
      width="150"
      height="83"
      viewBox="0 0 220 122"
      fill="none"
      className="drop-shadow-[0_10px_24px_rgba(245,130,32,.22)]"
    >
      <defs>
        <linearGradient id="grPaint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF8A3C" />
          <stop offset="1" stopColor="#D95F08" />
        </linearGradient>
        <linearGradient id="grGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4a5a" />
          <stop offset="1" stopColor="#0b0f14" />
        </linearGradient>
      </defs>

      <ellipse cx="110" cy="116" rx="98" ry="5" fill="#000" opacity="0.45" />

      <g className="rig-blade">
        <path d="M92 70 L106 70 L100 110 L86 110 Z" fill="#3a3f45" />
        <path d="M86 110 L100 110" stroke="#8f969e" strokeWidth="3" />
        <path d="M56 112 Q74 90 90 112 Z" fill="#7a5230" />
        <circle cx="70" cy="104" r="2" fill="#5d3d20" />
        <circle cx="79" cy="102" r="1.5" fill="#8a613a" />
      </g>

      <g className="rig-body slow">
        <rect x="18" y="58" width="186" height="12" rx="3" fill="#b34a06" />
        <text
          x="130"
          y="67"
          textAnchor="middle"
          fontSize="8"
          fontWeight="900"
          fill="#160b02"
          letterSpacing="1"
          style={{ fontFamily: "inherit" }}
        >
          HEAVIX
        </text>
        <path d="M20 42 h48 a6 6 0 0 1 6 6 v10 h-54 Z" fill="url(#grPaint)" />
        <rect x="20" y="46" width="5" height="5" rx="1" fill="#FFD9A0" />
        <circle cx="23" cy="55" r="2" fill="#FFB25C" className="rig-signal" />
        <path d="M120 26 h36 a5 5 0 0 1 5 5 v27 h-46 v-27 a5 5 0 0 1 5-5 Z" fill="url(#grPaint)" />
        <path d="M125 32 h26 v18 h-26 Z" fill="url(#grGlass)" />
        <path d="M127 34 l8 16" stroke="#fff" strokeWidth="1.5" opacity="0.15" />
        <rect x="133" y="20" width="7" height="6" rx="2" fill="#FFB25C" className="rig-beacon" />
        <rect x="166" y="38" width="6" height="20" rx="2" fill="#2b2f33" />
        <circle cx="201" cy="64" r="2" fill="#FFB25C" className="rig-signal delay" />
      </g>

      <GWheel cx={42} />
      <GWheel cx={162} />
      <GWheel cx={192} />
    </svg>
  );
}
