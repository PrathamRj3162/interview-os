import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { buildCsp, cspMode } from "@/lib/csp";

export async function proxy(request: NextRequest) {
  const mode = cspMode();
  if (mode === "off" || request.nextUrl.pathname.startsWith("/api/")) return updateSession(request);
  // A fresh nonce per request; Next reads it from the request's CSP header and applies it to its scripts.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV === "development" });
  const extra = new Headers({ "x-nonce": nonce, "Content-Security-Policy": csp });
  const response = await updateSession(request, extra);
  response.headers.set(mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }],
    },
  ],
};
