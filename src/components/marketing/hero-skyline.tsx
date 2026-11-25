/**
 * Original, generated neon skyline (deterministic pseudo-random buildings + lit windows),
 * a perspective grid floor and scanlines. Pure SVG/CSS: ~0 KB of images, no layout shift.
 */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

export function HeroSkyline() {
  const r = rng(42);
  const far: { x: number; w: number; h: number }[] = [];
  const near: { x: number; w: number; h: number; windows: { x: number; y: number; c: string }[] }[] = [];
  for (let x = -10; x < 1440; ) { const w = 30 + r() * 60; far.push({ x, w, h: 120 + r() * 200 }); x += w + 4; }
  for (let x = -20; x < 1440; ) {
    const w = 50 + r() * 90, h = 90 + r() * 230, windows: { x: number; y: number; c: string }[] = [];
    for (let wy = 520 - h + 14; wy < 505; wy += 14) for (let wx = x + 8; wx < x + w - 8; wx += 12) {
      const v = r(); if (v > 0.86) windows.push({ x: wx, y: wy, c: v > 0.95 ? "#ff4fd8" : v > 0.9 ? "#3ddcff" : "#ffd43b" });
    }
    near.push({ x, w, h, windows }); x += w + 6 + r() * 10;
  }
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-x-0 bottom-[22%] h-[70%] w-full" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b0a12" />
            <stop offset="0.55" stopColor="#2a1240" />
            <stop offset="1" stopColor="#5b1a5e" />
          </linearGradient>
          <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ff4fd8" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ff4fd8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1440" height="520" fill="url(#sky)" />
        <circle cx="720" cy="430" r="260" fill="url(#sun)" />
        <g fill="#1a1030" opacity="0.9">{far.map((b, i) => <rect key={i} x={b.x} y={520 - b.h} width={b.w} height={b.h} />)}</g>
        <g>
          {near.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={520 - b.h} width={b.w} height={b.h} fill="#0e0b18" stroke="#3ddcff" strokeOpacity="0.18" />
              {b.windows.map((w, j) => <rect key={j} x={w.x} y={w.y} width="5" height="6" fill={w.c} opacity="0.75" />)}
            </g>
          ))}
        </g>
      </svg>
      {/* perspective grid floor */}
      <div className="absolute inset-x-0 bottom-0 h-[24%] [perspective:400px]">
        <div
          className="absolute inset-x-[-50%] top-0 h-[220%] origin-top [transform:rotateX(68deg)]"
          style={{ backgroundImage: "linear-gradient(rgb(255 79 216 / 0.35) 1px, transparent 1px), linear-gradient(90deg, rgb(61 220 255 / 0.25) 1px, transparent 1px)", backgroundSize: "56px 56px" }}
        />
      </div>
      <div className="scanlines absolute inset-0 opacity-60" />
      {/* dark overlay keeps text AA-readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg/70 via-bg/55 to-bg" />
    </div>
  );
}
