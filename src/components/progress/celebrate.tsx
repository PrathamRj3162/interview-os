"use client";

import { useEffect, useState } from "react";
import { PartyPopper, X } from "lucide-react";

/**
 * Celebrates a new level or rank once per device: compares with what this browser last saw.
 * Pure CSS confetti; respects prefers-reduced-motion (the banner still shows, without animation).
 */
export function Celebrate({ level, rankIndex, rankLabel, earned, genz }: { level: number; rankIndex: number; rankLabel: string; earned: string[]; genz: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let seen: { level: number; rank: number; earned: string[] } | null = null;
    try { seen = JSON.parse(localStorage.getItem("ios-progress-seen") ?? "null"); } catch { /* storage blocked */ }
    const fresh = earned.filter((e) => !seen?.earned?.includes(e));
    let m: string | null = null;
    if (seen && rankIndex > seen.rank) m = genz ? `You just hit ${rankLabel}. Absolute cinema.` : `New rank: ${rankLabel}.`;
    else if (seen && level > seen.level) m = genz ? `Level ${level} unlocked. We move.` : `You reached level ${level}.`;
    else if (seen && fresh.length) m = genz ? `New achievement${fresh.length > 1 ? "s" : ""}: ${fresh.join(", ")} 🔥` : `New achievement${fresh.length > 1 ? "s" : ""}: ${fresh.join(", ")}.`;
    try { localStorage.setItem("ios-progress-seen", JSON.stringify({ level, rank: rankIndex, earned })); } catch { /* ignore */ }
    if (m) setMsg(m); // eslint-disable-line react-hooks/set-state-in-effect -- one-time comparison with stored state
  }, [level, rankIndex, rankLabel, earned, genz]);
  if (!msg) return null;
  return (
    <div role="status" className="relative overflow-hidden rounded-[var(--radius-lg)] border border-primary/50 bg-primary/10 px-4 py-3 text-sm">
      <div aria-hidden className="confetti pointer-events-none absolute inset-0">
        {Array.from({ length: 18 }, (_, i) => <span key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 6) * 0.12}s`, background: ["var(--primary)", "var(--accent)", "var(--success)", "var(--info)"][i % 4] }} />)}
      </div>
      <p className="relative flex items-center gap-2 font-medium"><PartyPopper className="size-4 text-primary" aria-hidden />{msg}
        <button type="button" onClick={() => setMsg(null)} className="ml-auto rounded p-1 text-muted hover:text-text" aria-label="Dismiss"><X className="size-4" /></button>
      </p>
    </div>
  );
}
