"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/form";
import { Card, Badge, Skeleton, EmptyState, ProgressBar } from "@/components/ui/card";
import { Tabs, Dialog, Tooltip } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";

export function InteractiveShowcase() {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="space-y-4">
        <h3 className="font-medium">Buttons</h3>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button><Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button><Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap gap-3"><Button size="sm">Small</Button><Button size="lg">Large</Button></div>
      </Card>
      <Card className="space-y-4">
        <h3 className="font-medium">Form controls</h3>
        <Field label="Input" htmlFor="d-in" hint="Helper text"><Input id="d-in" placeholder="Type here" /></Field>
        <Field label="Invalid" htmlFor="d-inv" error="This field is required"><Input id="d-inv" aria-invalid /></Field>
        <Field label="Select" htmlFor="d-sel"><Select id="d-sel" defaultValue="b"><option value="a">Option A</option><option value="b">Option B</option></Select></Field>
        <Field label="Textarea" htmlFor="d-ta"><Textarea id="d-ta" placeholder="Longer text" /></Field>
      </Card>
      <Card className="space-y-4">
        <h3 className="font-medium">Badges, progress, skeleton</h3>
        <div className="flex flex-wrap gap-2">{(["neutral", "accent", "primary", "success", "warning", "danger", "info"] as const).map((t) => <Badge key={t} tone={t}>{t}</Badge>)}</div>
        <ProgressBar value={64} label="Example progress" />
        <ProgressBar value={30} label="Primary progress" tone="primary" />
        <div className="space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-20" /></div>
      </Card>
      <Card className="space-y-4">
        <h3 className="font-medium">Overlays &amp; feedback</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
          <Button variant="secondary" onClick={() => toast("Saved successfully", "success")}>Success toast</Button>
          <Button variant="secondary" onClick={() => toast("Something went wrong — retry?", "error")}>Error toast</Button>
          <Tooltip content="Tooltips also show on focus"><Button variant="ghost">Hover me</Button></Tooltip>
        </div>
        <Tabs label="Example tabs" tabs={[{ label: "Overview", content: <p className="text-sm text-muted">Arrow keys switch tabs.</p> }, { label: "Details", content: <p className="text-sm text-muted">Second panel.</p> }]} />
      </Card>
      <div className="md:col-span-2">
        <EmptyState icon={Inbox} title="Empty state" action={<Button size="sm">Do the thing</Button>}>Explain what will appear here and the one action that gets it there.</EmptyState>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Dialog title" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => setOpen(false)}>Confirm</Button></>}>
        Native dialog: focus is trapped, Esc closes, clicking the backdrop closes.
      </Dialog>
    </div>
  );
}
