"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { Dialog } from "@/components/ui/interactive";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { reportProblem } from "@/app/actions/content";
import { REPORT_REASONS, type ReportReason } from "@/lib/content/types";

/** "Report a problem" for any content item. Items reported by 3+ people are hidden until fixed. */
export function ReportButton({ itemId, version, title }: { itemId: string; version: number; title: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submit = () => start(async () => {
    if (!reason) { setMsg("Please pick a reason."); return; }
    const r = await reportProblem({ itemId, version, reason, note });
    setMsg(r.message);
    if (r.ok) setTimeout(() => setOpen(false), 1200);
  });
  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setMsg(null); }} className="inline-flex items-center gap-1 text-xs text-muted hover:text-text" data-testid="report-problem">
        <Flag className="size-3.5" aria-hidden />Report a problem
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Report a problem: ${title}`}
        footer={<><Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button><Button size="sm" disabled={pending} onClick={submit}>Send report</Button></>}>
        <fieldset className="space-y-2">
          <legend className="text-sm text-muted">What&apos;s wrong?</legend>
          {(Object.keys(REPORT_REASONS) as ReportReason[]).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="radio" name="reason" checked={reason === k} onChange={() => setReason(k)} className="accent-[var(--accent)]" />{REPORT_REASONS[k]}
            </label>
          ))}
        </fieldset>
        <label className="mt-3 block text-sm">Details (optional)
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} className="mt-1" />
        </label>
        {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
      </Dialog>
    </>
  );
}
