import { describe, it, expect, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

vi.mock("server-only", () => ({}));

import { PROBLEMS } from "@/lib/dsa/bank";
import { SOLUTIONS } from "@/lib/dsa/solutions";
import { testsFor } from "@/lib/dsa/tests";
import { outputsMatch } from "@/lib/dsa/compare";
import { buildProgram, encodeStdin, makeNonce } from "@/lib/dsa/harness";
import { grade } from "@/lib/dsa/grade";

const dir = mkdtempSync(path.join(tmpdir(), "ios-dsa-"));

describe("problem bank", () => {
  it("has ~50+ problems with unique slugs, a solution each, and 3 hints", () => {
    expect(PROBLEMS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(PROBLEMS.map((p) => p.slug)).size).toBe(PROBLEMS.length);
    for (const p of PROBLEMS) {
      expect(SOLUTIONS[p.slug], p.slug).toBeDefined();
      expect(SOLUTIONS[p.slug].hints).toHaveLength(3);
      expect(p.examples.length, p.slug).toBeGreaterThanOrEqual(2);
      for (const e of p.examples) expect(e.input, p.slug).toHaveLength(p.params.length);
    }
    expect(Object.keys(SOLUTIONS).length).toBe(PROBLEMS.length);
  });

  it.each(PROBLEMS.map((p) => [p.slug]))("%s: every statement example agrees with the reference solution", (slug) => {
    const p = PROBLEMS.find((x) => x.slug === slug)!;
    for (const e of p.examples) {
      const got = SOLUTIONS[slug].ref(...structuredClone(e.input));
      expect(outputsMatch(p.compare, e.output, got, { slug, input: e.input }), `${slug} ${JSON.stringify(e.input)} → ${JSON.stringify(got)}`).toBe(true);
    }
  });

  it("generates deterministic hidden tests", () => {
    const a = testsFor("two-sum")!.tests, b = testsFor("two-sum")!.tests;
    expect(a.length).toBeGreaterThan(5);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  // The real pipeline: reference solution as candidate code → JS harness → node → parse → grade.
  it.each(PROBLEMS.map((p) => [p.slug]))("%s: reference passes all tests through the JavaScript harness", (slug) => {
    const { problem, tests } = testsFor(slug)!;
    const code = `const ${problem.fn} = ${SOLUTIONS[slug].ref.toString()};\n`;
    const nonce = makeNonce();
    const file = path.join(dir, `${slug}.js`);
    writeFileSync(file, buildProgram("javascript", problem, code, nonce));
    const stdout = execFileSync("node", [file], { input: encodeStdin("javascript", problem, tests.map((t) => t.input)), maxBuffer: 64 * 1024 * 1024 }).toString();
    const outcome = grade(problem, tests, { status: "ok", stdout, stderr: "", timeMs: null }, nonce, "browser");
    const failing = outcome.tests.filter((t) => t.verdict !== "pass");
    expect(failing, JSON.stringify(failing.slice(0, 2))).toEqual([]);
    expect(outcome.status).toBe("accepted");
  });
});
