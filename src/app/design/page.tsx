import type { Metadata } from "next";
import { Gauge } from "lucide-react";
import { Logo } from "@/components/logo";
import { Stat, PageHeader } from "@/components/ui/card";
import { InteractiveShowcase } from "@/components/design/showcase";
import { THEMES, TEXT_PAIRS, contrastRatio, SPACING, RADII, MOTION } from "@/lib/design/tokens";

export const metadata: Metadata = { title: "Design system" };

export default function DesignPage() {
  const neon = THEMES.neon;
  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between"><Logo /><span className="text-sm text-muted">Design system</span></div>
      <PageHeader title="Interview OS design system" description="Tokens and components. 80% calm dev tool, 20% neon-retro flavour." />

      <section aria-labelledby="colours" className="space-y-4">
        <h2 id="colours" className="text-lg font-semibold">Colour — neon theme</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {Object.entries(neon).map(([name, hex]) => (
            <div key={name} className="overflow-hidden rounded-[var(--radius-md)] border border-border">
              <div className="h-14" style={{ background: hex }} />
              <div className="bg-surface p-2"><p className="text-xs font-medium">{name}</p><p className="font-mono text-[11px] text-muted">{hex}</p></div>
            </div>
          ))}
        </div>
        <h3 className="pt-2 font-medium">Contrast (WCAG AA ≥ 4.5)</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead><tr className="text-left text-muted"><th className="py-1 font-medium">Pair</th>{Object.keys(THEMES).map((t) => <th key={t} className="py-1 font-medium">{t}</th>)}</tr></thead>
            <tbody>
              {TEXT_PAIRS.map(([fg, bg]) => (
                <tr key={fg + bg} className="border-t border-border">
                  <td className="py-1.5">{fg} on {bg}</td>
                  {Object.entries(THEMES).map(([t, p]) => {
                    const r = contrastRatio(p[fg as keyof typeof p], p[bg as keyof typeof p]);
                    return <td key={t} className={`py-1.5 font-mono tabular-nums ${r >= 4.5 ? "text-success" : "text-danger"}`}>{r.toFixed(2)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="type" className="space-y-3">
        <h2 id="type" className="text-lg font-semibold">Typography</h2>
        <p className="font-display text-5xl font-bold">Pixelify — display</p>
        <p className="text-xs text-muted">Display font only for the logo and the landing H1.</p>
        {["text-3xl", "text-2xl", "text-xl", "text-lg", "text-base", "text-sm", "text-xs"].map((c) => <p key={c} className={c}>Geist {c.replace("text-", "")} — The quick brown fox</p>)}
        <p className="font-mono text-sm">Geist Mono — const answer = 42;</p>
      </section>

      <section aria-labelledby="space" className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2"><h2 id="space" className="text-lg font-semibold">Spacing (4/8 grid)</h2>
          {SPACING.map((s) => <div key={s} className="flex items-center gap-3 text-xs"><span className="w-8 font-mono text-muted">{s}</span><span className="h-2 rounded bg-accent" style={{ width: s * 2 }} /></div>)}</div>
        <div className="space-y-2"><h2 className="text-lg font-semibold">Radii</h2>
          <div className="flex gap-3">{Object.entries(RADII).map(([k, v]) => <div key={k} className="grid size-14 place-items-center border border-border-strong bg-surface-2 text-xs" style={{ borderRadius: v }}>{k}</div>)}</div></div>
        <div className="space-y-2"><h2 className="text-lg font-semibold">Shadows & motion</h2>
          <div className="flex gap-4"><div className="size-14 rounded-[var(--radius-md)] bg-surface shadow-[var(--shadow-card)]" title="card" /><div className="size-14 rounded-[var(--radius-md)] bg-primary shadow-[var(--shadow-retro)]" title="retro" /></div>
          <p className="text-xs text-muted">Durations {MOTION.fast} / {MOTION.base} / {MOTION.slow}, easing {MOTION.easing}. Disabled under prefers-reduced-motion.</p></div>
      </section>

      <section aria-labelledby="components" className="space-y-4">
        <h2 id="components" className="text-lg font-semibold">Components</h2>
        <div className="grid gap-4 sm:grid-cols-3"><Stat icon={Gauge} label="Stat tile" value="72 / 100" hint="With a hint line" /></div>
        <InteractiveShowcase />
      </section>
    </main>
  );
}
