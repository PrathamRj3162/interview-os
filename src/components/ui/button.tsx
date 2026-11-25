import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

/**
 * primary  — the ONE main action per screen: neon yellow with a crisp retro offset shadow that "presses".
 * secondary/ghost — flat and calm.
 */
const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-fg font-semibold shadow-[var(--shadow-retro)] hover:brightness-105 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[var(--shadow-retro-pressed)]",
  secondary: "bg-surface-2 border border-border text-text hover:bg-surface-3 hover:border-border-strong",
  ghost: "text-text hover:bg-surface-2",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center rounded-[var(--radius-md)] font-medium",
    "transition-[transform,box-shadow,background-color,border-color,filter] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
    "disabled:pointer-events-none disabled:opacity-45",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant, size, className, ...props }, ref) {
  return <button ref={ref} className={buttonClasses(variant, size, className)} {...props} />;
});
