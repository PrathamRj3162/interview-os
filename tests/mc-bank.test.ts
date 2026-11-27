import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MC_PROBLEMS } from "@/lib/mc/problems";
import { MC_TEST_INPUTS } from "@/lib/mc/test-inputs";
import expected from "@/lib/mc/expected.json";

const EXP = expected as Record<string, { sample: string; tests: Record<string, string> }>;
const norm = (s: string) => s.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\n+$/, "");
const javaMajor = (() => { try { const v = execFileSync("javac", ["-version"], { stdio: ["ignore", "pipe", "pipe"] }).toString() + ""; return Number(/(\d+)/.exec(v)?.[1] ?? 0); } catch { return 0; } })();

describe("machine coding bank", () => {
  it("15 problems with full statements, core + extension tests and stored expected outputs", () => {
    expect(MC_PROBLEMS).toHaveLength(15);
    expect(new Set(MC_PROBLEMS.map((p) => p.slug)).size).toBe(15);
    for (const p of MC_PROBLEMS) {
      expect(p.io.length, p.slug).toBeGreaterThanOrEqual(2);
      expect(p.core.length && p.bonus.length && p.extension.io.length, p.slug).toBeTruthy();
      const tests = MC_TEST_INPUTS[p.slug];
      expect(tests.filter((t) => !t.ext).length, `${p.slug} core tests`).toBeGreaterThanOrEqual(3);
      expect(tests.filter((t) => t.ext).length, `${p.slug} extension tests`).toBeGreaterThanOrEqual(1);
      expect(new Set(tests.map((t) => t.name)).size, p.slug).toBe(tests.length);
      expect(EXP[p.slug]?.sample, `${p.slug} sample`).toBe(norm(p.sample.output));
      for (const t of tests) expect(EXP[p.slug].tests[t.name], `${p.slug}: ${t.name}`).toBeTypeOf("string");
    }
  });

  // Runs in CI (JDK 17+). Locally without a JDK the expected outputs come from scripts/mc-expected.mts via Judge0.
  it.skipIf(javaMajor < 17)("every Java reference reproduces its stored outputs", { timeout: 300_000 }, () => {
    for (const p of MC_PROBLEMS) {
      const dir = join("mc-refs", p.slug), out = mkdtempSync(join(tmpdir(), `mc-${p.slug}-`));
      execFileSync("javac", ["-d", out, ...readdirSync(dir).filter((f) => f.endsWith(".java")).map((f) => join(dir, f))]);
      const run = (input: string) => norm(spawnSync("java", ["-cp", out, "Main"], { input: input + "\n", timeout: 10_000 }).stdout.toString());
      expect(run(p.sample.input), `${p.slug} sample`).toBe(EXP[p.slug].sample);
      for (const t of MC_TEST_INPUTS[p.slug]) expect(run(t.input), `${p.slug}: ${t.name}`).toBe(EXP[p.slug].tests[t.name]);
    }
  });
});
