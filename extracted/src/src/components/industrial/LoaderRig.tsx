/* HEAVIX — Loader rig (animated SVG). Ported from Aria MJ. */

function Wheel({ cx }: { cx: number }) {
  return (
    <g>
      <circle cx={cx} cy="90" r="24" fill="#0c0c0c" />
      <circle cx={cx} cy="90" r="24" fill="none" stroke="#1f1f1f" strokeWidth="3" />
      <circle cx={cx} cy="90" r="21" fill="none" stroke="#2b2b2b" strokeWidth="4" strokeDasharray="4 6" />
      <g className="rig-wheel">
        <circle cx={cx} cy="90" r="11" fill="#151515" stroke="#F58220" strokeWidth="2.5" />
        <path
          d={`M${cx} 81 V99 M${cx - 9} 90 H${cx + 9} M${cx - 6} 84 L${cx + 6} 96 M${cx + 6} 84 L${cx - 6} 96`}
          stroke="#F58220"
          strokeWidth="2"
        />
        <circle cx={cx} cy="90" r="3" fill="#F58220" />
      </g>
    </g>
  );
}

export default function LoaderRig({ active = false }: { active?: boolean }) {
  return (
    <svg
      width="140"
      height="72"
      viewBox="0 0 240 122"
      fill="none"
      className="drop-shadow-[0_10px_24px_rgba(245,130,32,.28)]"
    >
      <defs>
        <linearGradient id="lgPaint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF8A3C" />
          <stop offset="1" stopColor="#D95F08" />
        </linearGradient>
        <linearGradient id="lgGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4a5a" />
          <stop offset="1" stopColor="#0b0f14" />
        </linearGradient>
      </defs>

      <ellipse cx="120" cy="116" rx="102" ry="5" fill="#000" opacity="0.45" />

      <g className={`rig-arm ${active ? "active" : ""}`}>
        <rect x="66" y="52" width="52" height="5" rx="2.5" fill="#8f969e" />
        <rect x="98" y="50" width="26" height="9" rx="4" fill="#3a3f45" />
        <path d="M104 50 L44 62 L44 76 L104 66 Z" fill="url(#lgPaint)" />
        <path d="M48 60 L48 98 L10 98 L10 80 L17 80 L17 91 L41 91 L41 60 Z" fill="url(#lgPaint)" />
        <path d="M10 98 L2 101 L12 102 Z" fill="#8f4a06" />
        <path d="M20 98 L12 102 L22 103 Z" fill="#8f4a06" />
        <path d="M15 80 Q29 62 43 80 Z" fill="#7a5230" />
        <circle cx="24" cy="73" r="2" fill="#5d3d20" />
        <circle cx="33" cy="71" r="2" fill="#5d3d20" />
        <circle cx="29" cy="76" r="1.5" fill="#8a613a" />
      </g>

      <g className="rig-body">
        <rect x="62" y="60" width="142" height="24" rx="5" fill="#b34a06" />
        <path d="M112 38 h84 a8 8 0 0 1 8 8 v16 h-92 Z" fill="url(#lgPaint)" />
        <text
          x="156"
          y="55"
          textAnchor="middle"
          fontSize="11"
          fontWeight="900"
          fill="#160b02"
          letterSpacing="1.5"
          style={{ fontFamily: "inherit" }}
        >
          HEAVIX
        </text>
        <rect x="190" y="44" width="3" height="14" fill="#7a3a05" />
        <rect x="196" y="44" width="3" height="14" fill="#7a3a05" />
        <rect x="112" y="44" width="6" height="6" rx="1" fill="#FFD9A0" />
        <circle cx="115" cy="56" r="2.5" fill="#FFB25C" className="rig-signal" />
        <circle cx="202" cy="56" r="2.5" fill="#FFB25C" className="rig-signal delay" />
        <rect x="168" y="20" width="7" height="20" rx="2" fill="#2b2f33" />
        <rect x="166" y="18" width="11" height="4" rx="2" fill="#2b2f33" />
        <path d="M120 16 h40 a6 6 0 0 1 6 6 v40 h-52 v-40 a6 6 0 0 1 6-6 Z" fill="url(#lgPaint)" />
        <path d="M126 22 h30 v22 h-30 Z" fill="url(#lgGlass)" />
        <path d="M128 24 l10 20" stroke="#fff" strokeWidth="2" opacity="0.15" />
        <rect x="136" y="10" width="8" height="6" rx="2" fill="#FFB25C" className="rig-beacon" />
        <path d="M52 62 a26 26 0 0 1 52 0" fill="none" stroke="url(#lgPaint)" strokeWidth="6" />
        <path d="M156 62 a26 26 0 0 1 52 0" fill="none" stroke="url(#lgPaint)" strokeWidth="6" />
        <g>
          <rect x="70" y="70" width="26" height="6" fill="#141414" />
          <path d="M72 76 l6 -6 M80 76 l6 -6 M88 76 l6 -6" stroke="#F58220" strokeWidth="3" />
        </g>
      </g>

      <Wheel cx={78} />
      <Wheel cx={182} />
    </svg>
  );
}
