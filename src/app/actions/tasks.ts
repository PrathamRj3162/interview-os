"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export async function toggleTask(fd: FormData) {
  const { supabase } = await requireUser();
  const id = String(fd.get("task_id") ?? "");
  const done = fd.get("done") === "1";
  await supabase.from("study_tasks").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath("/dashboard");
}
