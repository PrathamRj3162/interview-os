import "server-only";
import { randomBytes } from "node:crypto";
import { zipFiles } from "./zip";
import type { McFiles, McLang } from "./types";

/**
 * Runs a multi-file project on Judge0 ("Multi-file program", language 89): one submission compiles once and runs
 * the program once per input, with per-run random markers so printed text can't fake results. Free public CE by
 * default (set JUDGE0_URL for a self-hosted instance).
 */
const base = () => (process.env.JUDGE0_URL || "https://ce.judge0.com").replace(/\/$/, "");
const MULTI_FILE_ID = Number(process.env.JUDGE0_MULTIFILE_ID || 89);
const PER_RUN_SECONDS = 4;

// Same toolchains as the single-file round (JDK 17, Python 3.12, Node 22, GCC 14); the image's defaults are older.
const PREP: Record<McLang, string> = {
  java: "",
  python: "source /usr/local/bin/conda_init && conda activate python3.12.5",
  javascript: "source /usr/local/bin/conda_init && conda activate nodejs22.08.0",
  cpp: "source /usr/local/bin/conda_init && conda activate gxx14.1.0",
};
const COMPILE: Record<McLang, string> = {
  java: "mkdir -p build && /usr/local/jdk17/bin/javac -d build *.java",
  python: "python3 -m py_compile *.py",
  javascript: "for f in *.js; do node --check \"$f\" || exit 1; done",
  cpp: "g++ -std=c++17 -O2 -o prog *.cpp",
};
const RUN: Record<McLang, string> = { java: "/usr/local/jdk17/bin/java -cp build Main", python: "python3 main.py", javascript: "node main.js", cpp: "./prog" };

export type RunOutput = { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean };
export type ProjectRun =
  | { status: "ok"; outputs: RunOutput[]; timeMs: number | null }
  | { status: "compile_error"; message: string }
  | { status: "unavailable"; message: string };

export function buildZip(lang: McLang, files: McFiles, inputs: string[], nonce: string): Uint8Array {
  const all: Record<string, string> = { ...files };
  inputs.forEach((inp, i) => { all[`__in_${i}.txt`] = inp.endsWith("\n") ? inp : inp + "\n"; });
  all.compile = `#!/bin/bash\n${PREP[lang]}\n${COMPILE[lang]}\n`;
  all.run = [
    "#!/bin/bash",
    PREP[lang],
    `for i in $(seq 0 ${inputs.length - 1}); do`,
    `  echo "@@${nonce}:BEGIN:$i"`,
    `  timeout ${PER_RUN_SECONDS} ${RUN[lang]} < "__in_$i.txt" 2> "__err_$i.txt"`,
    "  code=$?",
    `  echo ""; echo "@@${nonce}:STDERR:$i"; head -c 2000 "__err_$i.txt"; echo ""`,
    `  echo "@@${nonce}:END:$i:$code"`,
    "done",
  ].join("\n") + "\n";
  return zipFiles(all);
}

/** Splits the combined stdout back into per-input results using the run's nonce markers. */
export function parseRunOutput(stdout: string, nonce: string, n: number): RunOutput[] {
  const out: RunOutput[] = [];
  for (let i = 0; i < n; i++) {
    const b = stdout.indexOf(`@@${nonce}:BEGIN:${i}\n`);
    const s = stdout.indexOf(`\n@@${nonce}:STDERR:${i}\n`, b);
    const e = stdout.indexOf(`@@${nonce}:END:${i}:`, s);
    if (b < 0 || s < 0 || e < 0) { out.push({ stdout: "", stderr: "", exitCode: null, timedOut: true }); continue; }
    const code = Number(/^(\d+)/.exec(stdout.slice(e + `@@${nonce}:END:${i}:`.length))?.[1] ?? NaN);
    out.push({
      stdout: stdout.slice(b + `@@${nonce}:BEGIN:${i}\n`.length, s).replace(/\n$/, ""),
      stderr: stdout.slice(s + `\n@@${nonce}:STDERR:${i}\n`.length, e).trim(),
      exitCode: Number.isFinite(code) ? code : null,
      timedOut: code === 124,
    });
  }
  return out;
}

export async function runProject(lang: McLang, files: McFiles, inputs: string[], opts: { deadlineMs?: number } = {}): Promise<ProjectRun> {
  const nonce = randomBytes(8).toString("hex");
  const zip = Buffer.from(buildZip(lang, files, inputs, nonce)).toString("base64");
  const unavailable = (message: string): ProjectRun => ({ status: "unavailable", message });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.JUDGE0_AUTH_TOKEN) headers["X-Auth-Token"] = process.env.JUDGE0_AUTH_TOKEN;
  let token: string | undefined;
  try {
    const res = await fetch(`${base()}/submissions?base64_encoded=true`, {
      method: "POST", headers, signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ language_id: MULTI_FILE_ID, additional_files: zip, cpu_time_limit: 15, wall_time_limit: 20, memory_limit: 512000 }),
    });
    if (res.status === 429) return unavailable("The free code judge is rate-limiting right now. Wait a minute and try again.");
    if (!res.ok) return unavailable(`The code judge returned HTTP ${res.status}. Try again shortly.`);
    token = ((await res.json()) as { token?: string }).token;
  } catch { return unavailable("Couldn't reach the code judge. Try again shortly."); }
  if (!token) return unavailable("The code judge didn't accept the submission.");
  const deadline = Date.now() + (opts.deadlineMs ?? 55_000);
  let delay = 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.4, 2500);
    try {
      const res = await fetch(`${base()}/submissions/${token}?base64_encoded=true&fields=status,stdout,stderr,compile_output,time`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) continue;
      const sub = (await res.json()) as { status?: { id: number; description: string }; stdout?: string | null; compile_output?: string | null; stderr?: string | null; time?: string | null };
      const id = sub.status?.id ?? 0;
      if (id === 1 || id === 2) continue;
      const dec = (s?: string | null) => (s ? Buffer.from(s, "base64").toString("utf8") : "");
      if (id === 6) return { status: "compile_error", message: (dec(sub.compile_output) || dec(sub.stderr)).slice(0, 4000) };
      const stdout = dec(sub.stdout);
      // Even if the whole run hit the judge's limit, the inputs that finished are reported.
      return { status: "ok", outputs: parseRunOutput(stdout, nonce, inputs.length), timeMs: sub.time ? Math.round(parseFloat(sub.time) * 1000) : null };
    } catch { continue; }
  }
  return unavailable("The code judge took too long to respond. Try again.");
}

/** Output comparison: trailing spaces and blank trailing lines don't matter; everything else does. */
export const normOut = (s: string) => s.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\n+$/, "");
