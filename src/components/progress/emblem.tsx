import { cn } from "@/lib/utils";
import { DIVISIONS, type Rank } from "@/lib/progress/xp";

/** Tier colours: a calm-to-neon progression. */
export const TIER_COLOR: Record<string, string> = {
  intern: "#94a3b8", junior: "#34d399", sde1: "#60a5fa", sde2: "#a78bfa", senior: "#fb923c", staff: "#f472b6", principal: "#ffd43b",
};

/** Original hexagon emblem: tier colour, tier initials, and 1–3 pips for the division (III → I). */
export function Emblem({ rank, size = 72, className }: { rank: Rank; size?: number; className?: string }) {
  const c = TIER_COLOR[rank.tier.id] ?? "#a78bfa";
  const pips = DIVISIONS.indexOf(rank.division) + 1;
  const initials = rank.tier.name.replace(/[^A-Z0-9-]/g, "").slice(0, 5) || rank.tier.name.slice(0, 2);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={cn("shrink-0", className)} role="img" aria-label={`${rank.label} emblem`}>
      <defs>
        <linearGradient id={`g-${rank.tier.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c} stopOpacity="0.95" />
          <stop offset="1" stopColor={c} stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="var(--surface-2)" stroke={c} strokeWidth="4" />
      <polygon points="50,16 80,33 80,67 50,84 20,67 20,33" fill={`url(#g-${rank.tier.id})`} opacity="0.28" />
      <text x="50" y="56" textAnchor="middle" fontSize={initials.length > 3 ? 17 : 22} fontWeight="700" fill={c} fontFamily="var(--font-geist-mono), monospace">{initials}</text>
      {Array.from({ length: pips }, (_, i) => (
        <circle key={i} cx={50 + (i - (pips - 1) / 2) * 11} cy="74" r="3.6" fill={c} />
      ))}
    </svg>
  );
}
