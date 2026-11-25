"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Retryable error state for any app page. No internals are shown to the user. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md py-20 text-center">
      <p className="font-mono text-sm text-danger">Something broke</p>
      <h1 className="mt-2 text-xl font-semibold">This page couldn&apos;t load</h1>
      <p className="mt-2 text-sm text-muted">It may be a network blip or a temporary database issue. Your data is safe.</p>
      <Button className="mt-6" variant="secondary" onClick={reset}><RotateCcw className="size-4" aria-hidden /> Try again</Button>
    </div>
  );
}
