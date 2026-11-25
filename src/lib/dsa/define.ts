import type { CompareMode, Example, Problem, ProblemDifficulty, ValueType } from "./types";

/** Builds a problem from a compact signature like "twoSum(nums: int[], target: int)". */
export function P(
  slug: string, title: string, difficulty: ProblemDifficulty, topics: string[],
  signature: string, returns: ValueType, compare: CompareMode,
  statement: string, constraints: string[], examples: Example[],
): Problem {
  const [fn, args] = signature.split("(");
  const params = args.replace(/\)$/, "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    const [name, type] = s.split(":").map((x) => x.trim());
    return { name, type: type as ValueType };
  });
  return { slug, title, difficulty, topics, fn, params, returns, compare, statement, constraints, examples };
}
