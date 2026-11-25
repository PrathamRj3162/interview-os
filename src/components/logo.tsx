import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-7 place-items-center rounded-md bg-accent font-mono text-xs text-accent-fg">OS</span>
      Interview OS
    </Link>
  );
}
