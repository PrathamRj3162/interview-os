import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]", className)} {...props} />;
}

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "primary";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-3 text-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-danger/12 text-danger",
  info: "bg-info/12 text-info",
  primary: "bg-primary/15 text-primary",
};

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium", tones[tone], className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[var(--radius-md)] bg-surface-2", className)} />;
}

export function EmptyState({ icon: Icon, title, children, action }: { icon?: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border px-6 py-10 text-center">
      {Icon && <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent"><Icon className="size-5" aria-hidden /></span>}
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function ProgressBar({ value, max = 100, label, tone = "accent" }: { value: number; max?: number; label: string; tone?: "accent" | "primary" | "success" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bar = { accent: "bg-accent", primary: "bg-primary", success: "bg-success" }[tone];
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div className={cn("h-full rounded-full transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out)]", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ icon: Icon, label, value, hint }: { icon?: LucideIcon; label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="flex items-start gap-3 p-4">
      {Icon && <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 truncate text-lg font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </Card>
  );
}

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
