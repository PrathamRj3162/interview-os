"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import { uploadResume } from "@/app/actions/resume";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";

export function UploadForm() {
  const [state, action, pending] = useActionState(uploadResume, null);
  const [name, setName] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <form action={action} className="space-y-3">
      <label
        htmlFor="resume"
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface px-6 py-10 text-center hover:border-accent focus-within:border-accent"
      >
        <Upload className="size-6 text-accent" aria-hidden />
        <span className="font-medium">{name ?? "Choose your resume"}</span>
        <span className="text-sm text-muted">PDF or DOCX, up to 5 MB. Text-based files only (not scanned images).</span>
        <input
          id="resume" name="resume" type="file" className="sr-only" required
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setName(f?.name ?? null);
            setClientError(f && f.size > 5 * 1024 * 1024 ? "That file is larger than 5 MB." : null);
          }}
        />
      </label>
      {(clientError || state?.message) && <FormMessage kind="error">{clientError ?? state?.message}</FormMessage>}
      <Button type="submit" disabled={pending || !name || Boolean(clientError)}>
        {pending ? "Reading your resume…" : "Upload and analyse"}
      </Button>
      <p className="text-xs text-muted">
        The file is stored privately. Rule-based checks run on our server; nothing is sent to an AI provider unless you choose to.
      </p>
    </form>
  );
}
