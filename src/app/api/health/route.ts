import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { aiStatus } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * Public health check: reports which subsystems are configured (never secrets).
 * `?db=1` also runs one trivial query (`ping()`) and reports the database round trip from this function's
 * region — used for latency checks. It reads no user data.
 */
export async function GET(request: NextRequest) {
  const body: Record<string, unknown> = {
    ok: true,
    database: isSupabaseConfigured() ? "configured" : "not_configured",
    ai: aiStatus().map((p) => p.id),
    region: process.env.VERCEL_REGION ?? "local",
  };
  const headers: Record<string, string> = {};
  if (request.nextUrl.searchParams.get("db") === "1" && isSupabaseConfigured()) {
    const sb = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, { auth: { persistSession: false } });
    const runs: number[] = [];
    let ok = true;
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      const { error } = await sb.rpc("ping");
      runs.push(Math.round(performance.now() - t0));
      if (error) { ok = false; break; }
    }
    body.db = { ok, roundTripsMs: runs };
    headers["Server-Timing"] = `db;dur=${Math.min(...runs)}`;
    if (!ok) return NextResponse.json({ ...body, ok: false }, { status: 503, headers });
  }
  return NextResponse.json(body, { headers });
}
