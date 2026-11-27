/**
 * Generates src/lib/mc/expected.json: the output of each Java reference (mc-refs/<slug>) for the problem's sample and
 * every hidden test input. Uses Judge0 (the same free judge the app uses). Run:
 *   npx tsx --conditions=react-server scripts/mc-expected.mts [slug…]
 * CI re-runs the references with a local JDK and checks they still produce exactly these outputs.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runProject, normOut } from "../src/lib/mc/runner";
import { MC_PROBLEMS } from "../src/lib/mc/problems";
import { MC_TEST_INPUTS } from "../src/lib/mc/test-inputs";

const OUT = "src/lib/mc/expected.json";
const only = process.argv.slice(2);
const existing: Record<string, { sample: string; tests: Record<string, string> }> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
let failed = false;

for (const p of MC_PROBLEMS) {
  if (only.length && !only.includes(p.slug)) continue;
  const dir = join("mc-refs", p.slug);
  const files = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith(".java")).map((f) => [f, readFileSync(join(dir, f), "utf8")]));
  const tests = MC_TEST_INPUTS[p.slug] ?? [];
  const r = await runProject("java", files, [p.sample.input, ...tests.map((t) => t.input)], { deadlineMs: 90_000 });
  if (r.status !== "ok") { console.error(`✗ ${p.slug}: ${r.status} ${"message" in r ? r.message : ""}`); failed = true; continue; }
  const bad = r.outputs.findIndex((o) => o.timedOut || o.exitCode !== 0);
  if (bad >= 0) { console.error(`✗ ${p.slug}: input ${bad} exit ${r.outputs[bad].exitCode}\n${r.outputs[bad].stderr}`); failed = true; continue; }
  const sample = normOut(r.outputs[0].stdout);
  if (sample !== normOut(p.sample.output)) { console.error(`✗ ${p.slug}: sample mismatch\n--- expected (statement)\n${p.sample.output}\n--- reference\n${sample}`); failed = true; }
  existing[p.slug] = { sample, tests: Object.fromEntries(tests.map((t, i) => [t.name, normOut(r.outputs[i + 1].stdout)])) };
  console.log(`✓ ${p.slug}: ${tests.length} tests`);
}
writeFileSync(OUT, JSON.stringify(existing, null, 1) + "\n");
if (failed) process.exit(1);
