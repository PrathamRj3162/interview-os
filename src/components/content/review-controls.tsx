"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolveReports, setContentStatus } from "@/app/actions/content";
import type { ContentStatus } from "@/lib/content/types";

export function ReviewControls({ itemId, version, status, canGoLive, hasReports }: { itemId: string; version: number; status: ContentStatus; canGoLive: boolean; hasReports: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState(false);
  const router = useRouter();
  const set = (s: ContentStatus) => start(async () => { const r = await setContentStatus({ itemId, version, status: s }); setErr(!r.ok); router.refresh(); });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "draft" && <Button size="sm" variant="ghost" disabled={pending} onClick={() => set("draft")}>Back to draft</Button>}
      {status !== "reviewed" && <Button size="sm" variant="secondary" disabled={pending} onClick={() => set("reviewed")}>Mark reviewed</Button>}
      {status !== "live" && <Button size="sm" disabled={pending || !canGoLive} onClick={() => set("live")} title={canGoLive ? undefined : "Fix the failing checks first"}>Make live</Button>}
      {hasReports && <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await resolveReports({ itemId, version }); router.refresh(); })}>Resolve reports</Button>}
      {err && <span role="status" className="text-xs text-danger">Couldn&apos;t save.</span>}
    </div>
  );
}
