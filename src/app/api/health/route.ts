import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { aiStatus } from "@/lib/ai";

export const dynamic = "force-dynamic";

/** Public health check: reports which subsystems are configured (never secrets). */
export function GET() {
  return NextResponse.json({
    ok: true,
    database: isSupabaseConfigured() ? "configured" : "not_configured",
    ai: aiStatus().map((p) => p.id),
  });
}
