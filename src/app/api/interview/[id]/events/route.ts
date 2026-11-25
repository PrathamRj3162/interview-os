import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { codeBody, loadDsaRoute } from "@/lib/dsa/route-helpers";
import { logEvent, saveWorkspace, type Workspace } from "@/lib/dsa/server";

const lang = z.enum(["python", "javascript", "cpp", "java"]);
const event = z.discriminatedUnion("type", [
  // Browser runs (Python/JS samples) are reported by the client; the report labels them as unverified.
  z.object({ type: z.literal("run"), payload: z.object({ language: lang, status: z.string().max(30), passed: z.number().int().min(0).max(100), total: z.number().int().min(0).max(100), runner: z.literal("browser"), firstFailure: z.object({ input: z.string().max(400).optional(), expected: z.string().max(300).optional(), actual: z.string().max(300).optional(), hidden: z.boolean().optional() }).optional() }) }),
  z.object({ type: z.literal("paste"), payload: z.object({ chars: z.number().int().min(1).max(100000) }) }),
  z.object({ type: z.literal("idle"), payload: z.object({ seconds: z.number().int().min(60).max(7200) }) }),
  z.object({ type: z.literal("language"), payload: z.object({ from: lang, to: lang }) }),
  z.object({ type: z.literal("reset"), payload: z.object({ language: lang }) }),
]);
const bodySchema = z.object({ events: z.array(event).max(10).default([]), workspace: codeBody.partial({ code: true }).extend({ code: z.string().max(50000) }).optional() });

/** Room telemetry + editor autosave for the DSA round. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadDsaRoute(id);
  if ("error" in ctx) return ctx.error;
  const { supabase, user, iv } = ctx;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  for (const e of parsed.data.events) {
    await logEvent(supabase, id, user.id, e.type, e.payload as Record<string, unknown>);
  }
  if (parsed.data.workspace) {
    const prev = (iv.workspace as Workspace | null) ?? null;
    await saveWorkspace(supabase, id, { ...(prev ?? {}), language: parsed.data.workspace.language, code: parsed.data.workspace.code } as Workspace);
  }
  return NextResponse.json({ ok: true });
}
