import { NextResponse, type NextRequest } from "next/server";

/** Receives CSP violation reports (report-only first, then enforced) and logs a compact line per violation. */
export async function POST(request: NextRequest) {
  const text = (await request.text().catch(() => "")).slice(0, 10_000);
  try {
    const data = JSON.parse(text);
    const reports = Array.isArray(data) ? data.map((r) => r.body ?? r) : [data["csp-report"] ?? data];
    for (const r of reports.slice(0, 10)) {
      const directive = r.effectiveDirective ?? r["effective-directive"] ?? r["violated-directive"];
      const blocked = r.blockedURL ?? r["blocked-uri"];
      const source = r.sourceFile ?? r["source-file"] ?? "";
      console.warn(`[csp] ${directive} blocked=${blocked} source=${String(source).slice(0, 120)}`);
    }
  } catch { /* ignore malformed reports */ }
  return new NextResponse(null, { status: 204 });
}
