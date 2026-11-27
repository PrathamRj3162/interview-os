"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAttempted } from "@/app/actions/learn";

/** Self-reported: reveals the reference answer for a design case. */
export function AttemptButton({ kind, slug }: { kind: "hld" | "lld"; slug: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button size="sm" variant="secondary" disabled={pending} data-testid="attempted"
      onClick={() => start(async () => { await markAttempted({ kind, slug }); router.refresh(); })}>
      <Unlock className="size-4" aria-hidden />I&apos;ve attempted it — show the reference
    </Button>
  );
}
