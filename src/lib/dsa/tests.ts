import "server-only";
import { PROBLEM_BY_SLUG } from "./bank";
import { SOLUTIONS } from "./solutions";
import { makeRng, seedFrom } from "./rng";
import type { Problem } from "./types";

export type TestCase = { input: unknown[]; expected: unknown; hidden: boolean };

const cache = new Map<string, TestCase[]>();

/** Samples (from the statement) followed by seeded hidden tests; expected values come from the reference. */
export function testsFor(slug: string): { problem: Problem; tests: TestCase[] } | null {
  const problem = PROBLEM_BY_SLUG[slug];
  const sol = SOLUTIONS[slug];
  if (!problem || !sol) return null;
  let tests = cache.get(slug);
  if (!tests) {
    const samples = problem.examples.map((e) => ({ input: e.input, expected: e.output, hidden: false }));
    const hidden = sol.gen(makeRng(seedFrom(slug))).map((input) => ({
      input,
      expected: sol.ref(...structuredClone(input)),
      hidden: true,
    }));
    tests = [...samples, ...hidden];
    cache.set(slug, tests);
  }
  return { problem, tests };
}
