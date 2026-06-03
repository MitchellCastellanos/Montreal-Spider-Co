/**
 * SpiderGraphic — a deterministic, animated SVG tarantula used in place of
 * photography. Colour is derived from the species hue so every card feels
 * unique and on-brand without shipping image assets.
 */
type Props = {
  hue: number;
  accent?: string;
  className?: string;
  animate?: boolean;
  seed?: number;
};

export default function SpiderGraphic({ hue, accent, className, animate = true, seed = 0 }: Props) {
  const base = `hsl(${hue} 45% 60%)`;
  const dark = `hsl(${hue} 40% 28%)`;
  const glow = accent ?? `hsl(${hue} 70% 55%)`;
  const id = `g${hue}-${seed}`;

  // eight legs mirrored around the body
  const legAngles = [-58, -30, 18, 52];

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-hidden="true"
      className={className}
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id={`${id}-body`} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor={base} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={glow} stopOpacity="0.35" />
          <stop offset="70%" stopColor={glow} stopOpacity="0.08" />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      {/* web rings */}
      <g stroke={glow} strokeOpacity="0.16" fill="none" strokeWidth="0.6">
        <circle cx="100" cy="100" r="86" />
        <circle cx="100" cy="100" r="62" />
        <circle cx="100" cy="100" r="38" />
        {[0, 45, 90, 135].map((a) => (
          <line
            key={a}
            x1={100 + 86 * Math.cos((a * Math.PI) / 180)}
            y1={100 + 86 * Math.sin((a * Math.PI) / 180)}
            x2={100 - 86 * Math.cos((a * Math.PI) / 180)}
            y2={100 - 86 * Math.sin((a * Math.PI) / 180)}
          />
        ))}
      </g>

      <circle cx="100" cy="100" r="92" fill={`url(#${id}-halo)`} />

      <g className={animate ? "spider-breathe" : undefined} style={{ transformOrigin: "100px 105px" }}>
        {/* legs */}
        <g stroke={dark} strokeWidth="5.5" strokeLinecap="round" fill="none" filter={`url(#${id}-soft)`}>
          {legAngles.map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const sx = 100;
            const sy = 100;
            const midR = 34;
            const endR = 70;
            const mx = sx + Math.cos(rad) * midR;
            const my = sy + Math.sin(rad) * midR - 10;
            const ex = sx + Math.cos(rad) * endR;
            const ey = sy + Math.sin(rad) * endR + 18;
            return (
              <g key={`r${i}`}>
                <path d={`M${sx} ${sy} Q ${mx} ${my - 14} ${ex} ${ey}`} />
                <path
                  d={`M${sx} ${sy} Q ${sx - Math.cos(rad) * midR} ${my - 14} ${
                    sx - Math.cos(rad) * endR
                  } ${ey}`}
                />
              </g>
            );
          })}
        </g>

        {/* pedipalps */}
        <g stroke={dark} strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M100 118 Q 86 134 80 150" />
          <path d="M100 118 Q 114 134 120 150" />
        </g>

        {/* abdomen */}
        <ellipse cx="100" cy="120" rx="26" ry="32" fill={`url(#${id}-body)`} />
        {/* abdomen marking */}
        <path d="M100 96 q 12 18 0 46 q -12 -28 0 -46Z" fill={glow} fillOpacity="0.55" />

        {/* cephalothorax */}
        <ellipse cx="100" cy="86" rx="20" ry="18" fill={`url(#${id}-body)`} />
        <ellipse cx="100" cy="82" rx="9" ry="7" fill={glow} fillOpacity="0.4" />

        {/* eyes */}
        <g fill="#0a0a0c">
          <circle cx="96" cy="74" r="1.6" />
          <circle cx="104" cy="74" r="1.6" />
          <circle cx="100" cy="72" r="1.3" />
        </g>
        {/* chelicerae */}
        <path d="M93 92 q 7 8 14 0" stroke={dark} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      <style>{`
        .spider-breathe { animation: sbreathe 5.5s ease-in-out infinite; }
        @keyframes sbreathe { 0%,100% { transform: translateY(0) scale(1) } 50% { transform: translateY(-2px) scale(1.015) } }
        @media (prefers-reduced-motion: reduce) { .spider-breathe { animation: none } }
      `}</style>
    </svg>
  );
}
