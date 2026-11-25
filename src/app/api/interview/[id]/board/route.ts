import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { loadInterview } from "@/lib/interview/server";
import { compactScene } from "@/lib/interview/board";

/** Saved board size cap (the workspace column allows < 200 KB in total). */
const MAX_BYTES = 180_000;
const bodySchema = z.object({ elements: z.array(z.record(z.string(), z.unknown())).max(2000) });

/**
 * Whiteboard autosave for system design rounds, so a reload never loses the drawing. This is only the
 * redraw state; what the interviewer saw (and what report evidence is checked against) is the text stored
 * with each answer by the server.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const iv = await loadInterview(supabase, id);
  if (!iv) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  if (!["hld", "lld"].includes(iv.kind)) return NextResponse.json({ error: "This round has no whiteboard." }, { status: 400 });
  if (iv.status !== "in_progress") return NextResponse.json({ error: "This interview has ended." }, { status: 409 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid board" }, { status: 400 });
  const elements = compactScene(parsed.data.elements);
  if (JSON.stringify(elements).length > MAX_BYTES) return NextResponse.json({ error: "The board is too large to save. Remove some elements." }, { status: 413 });

  const prev = (iv.workspace as Record<string, unknown> | null) ?? {};
  const { error } = await supabase.from("mock_interviews").update({ workspace: { ...prev, board: { elements, updatedAt: new Date().toISOString() } } }).eq("id", id);
  return error ? NextResponse.json({ error: "Couldn't save the board." }, { status: 500 }) : NextResponse.json({ ok: true });
}
