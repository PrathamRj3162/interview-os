/** Simple accessible bar chart of XP per day (server-rendered SVG, no chart library). */
export function XpChart({ data }: { data: { date: string; xp: number }[] }) {
  const max = Math.max(10, ...data.map((d) => d.xp));
  const w = 600, h = 140, gap = 3, bw = (w - gap * (data.length - 1)) / data.length;
  const total = data.reduce((s, d) => s + d.xp, 0);
  const active = data.filter((d) => d.xp > 0).length;
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h + 18}`} className="h-auto w-full" role="img" aria-label={`XP per day for the last ${data.length} days: ${total} XP over ${active} active days`}>
        <line x1="0" x2={w} y1={h} y2={h} stroke="var(--border)" />
        {data.map((d, i) => {
          const bh = d.xp ? Math.max(3, (d.xp / max) * (h - 8)) : 0;
          return (
            <g key={d.date}>
              <title>{`${d.date}: ${d.xp} XP`}</title>
              <rect x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx="2" fill={d.xp ? "var(--accent)" : "transparent"} />
            </g>
          );
        })}
        <text x="0" y={h + 14} fontSize="11" fill="var(--muted)">{data[0]?.date.slice(5)}</text>
        <text x={w} y={h + 14} fontSize="11" fill="var(--muted)" textAnchor="end">today</text>
        <text x={w} y="10" fontSize="11" fill="var(--muted)" textAnchor="end">max {max} XP/day</text>
      </svg>
      <figcaption className="mt-1 text-xs text-muted">{total} XP over {active} active day{active === 1 ? "" : "s"} in the last {data.length} days.</figcaption>
    </figure>
  );
}
