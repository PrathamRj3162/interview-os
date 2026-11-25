import "server-only";
import type { ExecResult, Lang } from "./types";

/**
 * Judge0 client. Defaults to the free public Judge0 CE instance (no key, no card); set JUDGE0_URL to a
 * self-hosted instance (and JUDGE0_LANGUAGE_IDS if its ids differ) for higher limits.
 * The public instance doesn't allow `wait=true`, so we submit and then poll.
 * Note: code sent here leaves our servers — the room tells the user so.
 */
const DEFAULT_IDS: Record<Lang, number> = { cpp: 105, java: 91, python: 100, javascript: 102 }; // GCC 14, JDK 17, Python 3.12, Node 22

function languageIds(): Record<Lang, number> {
  const ids = { ...DEFAULT_IDS };
  for (const pair of (process.env.JUDGE0_LANGUAGE_IDS ?? "").split(",")) {
    const [k, v] = pair.split(":").map((s) => s.trim());
    if (k in ids && Number(v) > 0) ids[k as Lang] = Number(v);
  }
  return ids;
}

const base = () => (process.env.JUDGE0_URL || "https://ce.judge0.com").replace(/\/$/, "");
const headers = (): Record<string, string> => {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.JUDGE0_AUTH_TOKEN) h["X-Auth-Token"] = process.env.JUDGE0_AUTH_TOKEN;
  return h;
};
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s: string | null | undefined) => (s ? Buffer.from(s, "base64").toString("utf8") : "");

// CPU seconds for the whole test set (all tests run in one process). Interpreters get more headroom.
const CPU_LIMIT: Record<Lang, number> = { cpp: 4, java: 6, python: 10, javascript: 8 };

type Judge0Submission = {
  status?: { id: number; description: string };
  stdout?: string | null; stderr?: string | null; compile_output?: string | null; message?: string | null;
  time?: string | null; memory?: number | null;
};

export async function judge0Execute(lang: Lang, source: string, stdin: string, opts: { deadlineMs?: number } = {}): Promise<ExecResult> {
  const deadline = Date.now() + (opts.deadlineMs ?? 50_000);
  const unavailable = (message: string): ExecResult => ({ status: "unavailable", stdout: "", stderr: "", timeMs: null, message });
  let token: string | undefined;
  try {
    const res = await fetch(`${base()}/submissions?base64_encoded=true`, {
      method: "POST", headers: headers(), signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        language_id: languageIds()[lang], source_code: b64(source), stdin: b64(stdin),
        cpu_time_limit: CPU_LIMIT[lang], wall_time_limit: CPU_LIMIT[lang] * 2 + 4, memory_limit: 512000,
      }),
    });
    if (res.status === 429) return unavailable("The free code judge is rate-limiting right now. Wait a minute and try again.");
    if (!res.ok) return unavailable(`The code judge returned HTTP ${res.status}. Try again shortly.`);
    token = ((await res.json()) as { token?: string }).token;
  } catch {
    return unavailable("Couldn't reach the code judge. Check your connection or try again shortly.");
  }
  if (!token) return unavailable("The code judge didn't accept the submission.");

  let delay = 800;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.4, 2500);
    let sub: Judge0Submission;
    try {
      const res = await fetch(`${base()}/submissions/${token}?base64_encoded=true&fields=status,stdout,stderr,compile_output,message,time,memory`, { headers: headers(), signal: AbortSignal.timeout(10_000) });
      if (!res.ok) continue;
      sub = (await res.json()) as Judge0Submission;
    } catch { continue; }
    const id = sub.status?.id ?? 0;
    if (id === 1 || id === 2) continue; // queued / processing
    const out = {
      stdout: unb64(sub.stdout), stderr: unb64(sub.stderr),
      timeMs: sub.time ? Math.round(parseFloat(sub.time) * 1000) : null, memoryKb: sub.memory ?? null,
    };
    if (id === 3 || id === 4) return { status: "ok", ...out };
    if (id === 5) return { status: "timeout", ...out };
    if (id === 6) return { status: "compile_error", ...out, stderr: unb64(sub.compile_output) || out.stderr };
    if (id >= 7 && id <= 12) return { status: "runtime_error", ...out, message: sub.status?.description };
    return unavailable(`The code judge had an internal error (${sub.status?.description ?? "unknown"}). Try again.`);
  }
  return unavailable("The code judge is busy (queue took too long). Try again in a minute.");
}
