/* HEAVIX — Roller rig (animated SVG). Ported from Aria MJ. */

export default function RollerRig() {
  return (
    <svg
      width="130"
      height="79"
      viewBox="0 0 200 122"
      fill="none"
      className="drop-shadow-[0_10px_24px_rgba(245,130,32,.22)]"
    >
      <defs>
        <linearGradient id="rlPaint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF8A3C" />
          <stop offset="1" stopColor="#D95F08" />
        </linearGradient>
        <linearGradient id="rlGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4a5a" />
          <stop offset="1" stopColor="#0b0f14" />
        </linearGradient>
      </defs>

      <ellipse cx="105" cy="116" rx="88" ry="5" fill="#000" opacity="0.45" />

      <g>
        <circle cx="50" cy="86" r="28" fill="#2b2f33" />
        <circle cx="50" cy="86" r="28" fill="none" stroke="#4a5056" strokeWidth="3" />
        <path d="M28 74 a28 28 0 0 1 20 -14" stroke="#6a7178" strokeWidth="3" fill="none" opacity="0.6" />
        <g className="rig-wheel">
          <circle cx="50" cy="86" r="8" fill="#151515" stroke="#F58220" strokeWidth="2.5" />
          <rect x="48" y="62" width="4" height="10" rx="2" fill="#F58220" />
          <rect x="48" y="100" width="4" height="10" rx="2" fill="#F58220" />
        </g>
      </g>

      <path d="M78 52 L52 62 L52 94 L68 94 L68 66 L84 60 Z" fill="#b34a06" />

      <g className="rig-body fast">
        <path d="M84 44 h88 a8 8 0 0 1 8 8 v16 h-96 Z" fill="url(#rlPaint)" />
        <text
          x="140"
          y="60"
          textAnchor="middle"
          fontSize="10"
          fontWeight="900"
          fill="#160b02"
          letterSpacing="1.5"
          style={{ fontFamily: "inherit" }}
        >
          HEAVIX
        </text>
        <rect x="168" y="48" width="3" height="14" fill="#7a3a05" />
        <rect x="174" y="48" width="3" height="14" fill="#7a3a05" />
        <circle cx="88" cy="58" r="2.5" fill="#FFB25C" className="rig-signal" />
        <circle cx="178" cy="62" r="2.5" fill="#FFB25C" className="rig-signal delay" />
        <path d="M96 18 h36 a5 5 0 0 1 5 5 v21 h-46 v-21 a5 5 0 0 1 5-5 Z" fill="url(#rlPaint)" />
        <path d="M101 24 h26 v16 h-26 Z" fill="url(#rlGlass)" />
        <path d="M103 26 l8 14" stroke="#fff" strokeWidth="1.5" opacity="0.15" />
        <rect x="109" y="12" width="7" height="6" rx="2" fill="#FFB25C" className="rig-beacon" />
        <rect x="146" y="26" width="6" height="18" rx="2" fill="#2b2f33" />
      </g>

      <g>
        <circle cx="158" cy="92" r="22" fill="#0c0c0c" />
        <circle cx="158" cy="92" r="19" fill="none" stroke="#2b2b2b" strokeWidth="4" strokeDasharray="4 6" />
        <g className="rig-wheel">
          <circle cx="158" cy="92" r="9" fill="#151515" stroke="#F58220" strokeWidth="2.5" />
          <path d="M158 84 V100 M150 92 H166" stroke="#F58220" strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}
