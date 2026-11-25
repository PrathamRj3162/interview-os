import Link from "next/link";
import { cn } from "@/lib/utils";

/** Original wordmark: a pixel "OS" chip + pixel display type. */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 rounded-[var(--radius-sm)]", className)} aria-label="Interview OS home">
      <span aria-hidden className="grid size-7 place-items-center rounded-[6px] bg-primary font-display text-[13px] font-bold leading-none text-primary-fg shadow-[2px_2px_0_0_var(--primary-shadow)]">
        OS
      </span>
      <span className="font-display text-lg font-bold tracking-wide">
        Interview<span className="text-accent">OS</span>
      </span>
    </Link>
  );
}
