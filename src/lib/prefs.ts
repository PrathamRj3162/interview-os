import "server-only";
import { cookies } from "next/headers";
import type { ThemeId } from "@/lib/design/tokens";
import type { Vibe } from "@/lib/copy";

/** Per-device UI preferences, stored in cookies so the server renders the right theme with no flash. */
export async function getPrefs(): Promise<{ theme: ThemeId; vibe: Vibe }> {
  const c = await cookies();
  const theme = c.get("ios_theme")?.value === "contrast" ? "contrast" : "neon";
  const vibe = c.get("ios_vibe")?.value === "pro" ? "pro" : "genz";
  return { theme, vibe };
}
