import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { MicCheck } from "@/components/voice/mic-check";
import { sttAvailable } from "@/lib/voice/server";

export const metadata: Metadata = { title: "Mic check" };

export default async function MicCheckPage() {
  await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mic check</h1>
        <p className="text-sm text-muted">Test your microphone, background noise, speech recognition and the interviewer&apos;s voice before a voice interview.</p>
      </div>
      <MicCheck sttServer={sttAvailable()} />
    </div>
  );
}
