import { Skeleton } from "@/components/ui/card";

/** Shown instantly while any app page streams in. */
export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading">
      <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-72" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-48 lg:col-span-2" /><Skeleton className="h-48" /></div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
