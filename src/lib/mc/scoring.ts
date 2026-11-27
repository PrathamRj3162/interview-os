/**
 * Machine coding scores computed in code (shown as "measured", like the DSA judge's correctness).
 *   Completeness  = share of core hidden tests passed by the final submit.
 *   Extensibility = extension tests passed, then how much EXISTING code had to change after the reveal.
 * The size thresholds are deliberately rough and published in the report; a good design usually adds a class or a
 * strategy and touches a few existing lines.
 */
import type { ExtensionDiff } from "./analysis";

export type Measured = { score: number | null; evidence: string };

export function completenessScore(core: { passed: number; total: number } | null): Measured {
  if (!core || core.total === 0) return { score: null, evidence: "Not measured: the hidden tests were never run (no submit)." };
  const r = core.passed / core.total;
  const score = r === 1 ? 4 : r >= 0.75 ? 3 : r >= 0.4 ? 2 : 1;
  return { score, evidence: `Final submit: ${core.passed}/${core.total} core tests passed.` };
}

/** Lines of pre-existing code changed for the extension (new files don't count as "changing existing code"). */
export const existingLinesChanged = (d: ExtensionDiff) => d.perFile.filter((f) => f.status !== "added").reduce((s, f) => s + f.added + f.removed, 0);

export function extensibilityScore(ext: { passed: number; total: number } | null, diff: ExtensionDiff | null): Measured {
  if (!ext || ext.total === 0) return { score: null, evidence: "Not measured: there was no submit after the new requirement was revealed." };
  const r = ext.passed / ext.total;
  const where = diff ? ` Since the reveal: ${diff.filesAdded} file(s) added, ${diff.filesChanged} changed, ${existingLinesChanged(diff)} existing line(s) changed.` : "";
  if (r < 0.5) return { score: 1, evidence: `New requirement: ${ext.passed}/${ext.total} tests passed.${where}` };
  if (r < 1 || !diff) return { score: 2, evidence: `New requirement: ${ext.passed}/${ext.total} tests passed.${where}` };
  const changed = existingLinesChanged(diff);
  const score = changed <= 40 && diff.filesChanged <= 3 ? 4 : changed <= 120 ? 3 : 2;
  return { score, evidence: `New requirement: all ${ext.total} tests passed.${where} (4: ≤40 existing lines in ≤3 files · 3: ≤120 lines · otherwise 2)` };
}
