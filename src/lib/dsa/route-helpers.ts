import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { loadInterview } from "@/lib/interview/server";
import { dsaContextFor } from "./server";

export const codeBody = z.object({
  language: z.enum(["python", "javascript", "cpp", "java"]),
  code: z.string().min(1, "Write some code first").max(50000, "Code is too long (50,000 characters max)"),
});

/** Shared guard for DSA routes: signed in, own interview (RLS), in progress, has a problem. */
export async function loadDsaRoute(id: string) {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) } as const;
  const iv = await loadInterview(supabase, id);
  if (!iv) return { error: NextResponse.json({ error: "Interview not found" }, { status: 404 }) } as const;
  const dsa = dsaContextFor(iv);
  if (!dsa) return { error: NextResponse.json({ error: "This interview has no coding problem." }, { status: 400 }) } as const;
  if (iv.status !== "in_progress") return { error: NextResponse.json({ error: "This interview has ended." }, { status: 409 }) } as const;
  return { supabase, user, iv, dsa } as const;
}
