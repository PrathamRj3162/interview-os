import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/settings",
  "/resume",
  "/dsa",
  "/fundamentals",
  "/system-design",
  "/projects",
  "/interview",
  "/planner",
  "/analytics",
  "/revision",
  "/progress",
  "/companies",
  "/mic-check",
];
const AUTH_PAGES = ["/login", "/signup"];

/** Refreshes the auth session cookie and performs optimistic route guarding. */
export async function updateSession(request: NextRequest, extraHeaders?: Headers) {
  // Extra request headers (the CSP nonce) are forwarded to the app on every pass-through response.
  const reqHeaders = new Headers(request.headers);
  extraHeaders?.forEach((v, k) => reqHeaders.set(k, v));
  const pass = () => NextResponse.next({ request: { headers: reqHeaders } });
  let response = pass();
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        reqHeaders.set("cookie", request.cookies.getAll().map((c) => `${c.name}=${c.value}`).join("; "));
        response = pass();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // getClaims() verifies the JWT signature; do not run code between client creation and this call.
  const { data } = await supabase.auth.getClaims();
  const isAuthed = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (!isAuthed && PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (isAuthed && AUTH_PAGES.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
