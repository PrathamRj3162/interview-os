"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "./types";

const schema = z.object({ theme: z.enum(["neon", "contrast"]), vibe: z.enum(["genz", "pro"]) });

export async function savePrefs(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({ theme: fd.get("theme"), vibe: fd.get("vibe") });
  if (!parsed.success) return { message: "Pick a theme and a vibe." };
  const c = await cookies();
  const opts = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const, httpOnly: false };
  c.set("ios_theme", parsed.data.theme, opts);
  c.set("ios_vibe", parsed.data.vibe, opts);
  revalidatePath("/", "layout");
  return { ok: true, message: parsed.data.vibe === "genz" ? "Locked in. Looking good." : "Appearance saved." };
}
