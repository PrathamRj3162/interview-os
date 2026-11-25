import "server-only";
import { PROBLEM_BY_SLUG } from "./bank";
import { SOLUTIONS } from "./solutions";
import { makeRng, seedFrom } from "./rng";
import { STRESS } from "./stress";
import { callRef } from "./nodes";
import type { Problem } from "./types";

export type TestCase = { input: unknown[]; expected: unknown; hidden: boolean; stress?: boolean };

const cache = new Map<string, TestCase[]>();

/** Samples (from the statement), seeded hidden tests, then stress tests; expected values come from the reference. */
export function testsFor(slug: string): { problem: Problem; tests: TestCase[] } | null {
  const problem = PROBLEM_BY_SLUG[slug];
  const sol = SOLUTIONS[slug];
  if (!problem || !sol) return null;
  let tests = cache.get(slug);
  if (!tests) {
    const samples = problem.examples.map((e) => ({ input: e.input, expected: e.output, hidden: false }));
    const hidden = sol.gen(makeRng(seedFrom(slug))).map((input) => ({
      input,
      expected: callRef(problem, sol.ref, input),
      hidden: true,
    }));
    // Stress tests go last: if a slow solution hits the judge's time limit, every earlier result is still printed.
    const stressGen = STRESS[slug];
    const stress = stressGen ? [stressGen(makeRng(seedFrom(`${slug}:stress`)))].map((input) => ({
      input, expected: callRef(problem, sol.ref, input), hidden: true, stress: true,
    })) : [];
    tests = [...samples, ...hidden, ...stress];
    cache.set(slug, tests);
  }
  return { problem, tests };
}
