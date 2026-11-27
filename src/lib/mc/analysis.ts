/**
 * Facts about a machine-coding project computed in code (no AI). They are FACTS for the evaluator and the report,
 * not grades: e.g. a long method is worth asking about, not automatically wrong.
 */
import type { McFiles, McLang } from "./types";

// ───────────── Extensibility diff (minute-60 snapshot → final) ─────────────

/** Number of lines added and removed between two texts (LCS on lines). */
export function lineChanges(before: string, after: string): { added: number; removed: number } {
  const a = before.split("\n").map((l) => l.trim()).filter(Boolean), b = after.split("\n").map((l) => l.trim()).filter(Boolean);
  if (a.length * b.length > 4_000_000) {
    // Very large files: fall back to a multiset difference (an upper-bound-ish estimate, documented as such).
    const count = (xs: string[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>());
    const ca = count(a), cb = count(b);
    let common = 0; for (const [k, v] of ca) common += Math.min(v, cb.get(k) ?? 0);
    return { added: b.length - common, removed: a.length - common };
  }
  const prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let diag = 0;
    for (let j = 1; j <= b.length; j++) { const tmp = prev[j]; prev[j] = a[i - 1] === b[j - 1] ? diag + 1 : Math.max(prev[j], prev[j - 1]); diag = tmp; }
  }
  const lcs = prev[b.length];
  return { added: b.length - lcs, removed: a.length - lcs };
}

export type ExtensionDiff = { filesChanged: number; filesAdded: number; filesDeleted: number; linesAdded: number; linesRemoved: number; perFile: { file: string; added: number; removed: number; status: "added" | "deleted" | "changed" }[] };

export function extensionDiff(snapshot: McFiles, final: McFiles): ExtensionDiff {
  const names = [...new Set([...Object.keys(snapshot), ...Object.keys(final)])].sort();
  const perFile: ExtensionDiff["perFile"] = [];
  for (const f of names) {
    const a = snapshot[f], b = final[f];
    if (a === b) continue;
    const c = lineChanges(a ?? "", b ?? "");
    if (!c.added && !c.removed && a !== undefined && b !== undefined) continue; // whitespace-only
    perFile.push({ file: f, ...c, status: a === undefined ? "added" : b === undefined ? "deleted" : "changed" });
  }
  return {
    filesChanged: perFile.filter((p) => p.status === "changed").length,
    filesAdded: perFile.filter((p) => p.status === "added").length,
    filesDeleted: perFile.filter((p) => p.status === "deleted").length,
    linesAdded: perFile.reduce((s, p) => s + p.added, 0),
    linesRemoved: perFile.reduce((s, p) => s + p.removed, 0),
    perFile,
  };
}

// ───────────── Static facts ─────────────

export type StaticFacts = {
  files: number; lines: number;
  types: number; // classes + interfaces + enums (+ structs)
  interfaces: number;
  methods: number;
  longestMethod: { name: string; file: string; lines: number } | null;
  duplicateBlocks: number; // 5-line windows that appear more than once (normalised)
  unvalidatedPublicMethods: string[]; // public methods with parameters whose body never checks them
  sharedMutableState: string[]; // concurrency problems only: mutable fields touched without any synchronisation
  usesConcurrencyPrimitives: boolean;
};

const stripComments = (src: string, lang: McLang) =>
  lang === "python" ? src.replace(/#.*$/gm, "").replace(/"""[\s\S]*?"""/g, "") : src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

type Method = { name: string; file: string; params: string[]; body: string; lines: number; isPublic: boolean };

/** Brace-matched method bodies for C-like languages; indentation blocks for Python. Heuristic, not a parser. */
function methodsOf(file: string, src: string, lang: McLang): Method[] {
  const out: Method[] = [];
  if (lang === "python") {
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const m = /^(\s*)def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/.exec(lines[i]);
      if (!m) continue;
      const indent = m[1].length; let j = i + 1;
      while (j < lines.length && (lines[j].trim() === "" || lines[j].search(/\S/) > indent)) j++;
      const params = m[3].split(",").map((p) => p.split(/[:=]/)[0].trim()).filter((p) => p && p !== "self" && p !== "cls" && !p.startsWith("*"));
      out.push({ name: m[2], file, params, body: lines.slice(i + 1, j).join("\n"), lines: lines.slice(i + 1, j).filter((l) => l.trim()).length, isPublic: !m[2].startsWith("_") });
    }
    return out;
  }
  const re = lang === "javascript"
    ? /(?:^|\n)\s*(?:async\s+)?(?:function\s+)?([A-Za-z_$][\w$]*)\s*\(([^()]*)\)\s*\{/g
    : /(?:^|\n)\s*((?:public|private|protected|static|final|synchronized|virtual|override|const|inline|\s)*)[\w<>\[\],.?: *&]+\s+([A-Za-z_]\w*)\s*\(([^()]*)\)\s*(?:const\s*)?(?:throws [\w., ]+)?\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const name = lang === "javascript" ? m[1] : m[2];
    if (["if", "for", "while", "switch", "catch", "return", "new", "else", "synchronized"].includes(name)) continue;
    const mods = lang === "javascript" ? "" : m[1] ?? "";
    const rawParams = lang === "javascript" ? m[2] : m[3];
    let depth = 1, k = re.lastIndex;
    while (k < src.length && depth > 0) { if (src[k] === "{") depth++; else if (src[k] === "}") depth--; k++; }
    const body = src.slice(re.lastIndex, k - 1);
    const params = rawParams.split(",").map((p) => p.trim().split(/\s+/).pop()?.replace(/[&*]/g, "") ?? "").filter((p) => /^[A-Za-z_$]\w*$/.test(p));
    out.push({ name, file, params, body, lines: body.split("\n").filter((l) => l.trim()).length, isPublic: lang === "javascript" ? !name.startsWith("_") : /\bpublic\b/.test(mods) });
  }
  return out;
}

const VALIDATION = /\b(if|throw|raise|assert|require|Objects\.requireNonNull|IllegalArgument|ValueError|TypeError|invalid|validate)\b/;

export function staticFacts(files: McFiles, lang: McLang, opts: { concurrency: boolean }): StaticFacts {
  const srcs = Object.entries(files).map(([f, s]) => [f, stripComments(s, lang)] as const);
  const all = srcs.map(([, s]) => s).join("\n");
  const typeRe = lang === "python" ? /^\s*class\s+\w+/gm : /\b(class|interface|enum|struct|record)\s+[A-Z_]\w*/g;
  const ifaceRe = lang === "python" ? /^\s*class\s+\w+\((ABC|Protocol)\)/gm : /\binterface\s+\w+|\babstract\s+class\s+\w+/g;
  const methods = srcs.flatMap(([f, s]) => methodsOf(f, s, lang));
  const longest = methods.reduce<Method | null>((b, x) => (!b || x.lines > b.lines ? x : b), null);

  // Duplicate 5-line windows (ignoring blank lines, braces-only lines and imports).
  const norm = srcs.flatMap(([, s]) => s.split("\n").map((l) => l.trim()).filter((l) => l && !/^[{}()\[\];]+$/.test(l) && !/^(import|from|#include|package)\b/.test(l)));
  const seen = new Map<string, number>();
  for (let i = 0; i + 5 <= norm.length; i++) { const w = norm.slice(i, i + 5).join("\n"); seen.set(w, (seen.get(w) ?? 0) + 1); }
  const duplicateBlocks = [...seen.values()].filter((c) => c > 1).length;

  const unvalidated = methods
    .filter((m) => m.isPublic && m.params.length > 0 && m.name !== "main" && !/^(get|is|has|to|equals|hashCode|compare|run|__)/.test(m.name))
    .filter((m) => !(VALIDATION.test(m.body) && m.params.some((p) => new RegExp(`\\b${p}\\b`).test(m.body.split("\n").slice(0, 8).join("\n")))))
    .map((m) => `${m.file}: ${m.name}(${m.params.join(", ")})`);

  const usesConc = /\b(synchronized|ReentrantLock|ReadWriteLock|AtomicInteger|AtomicLong|ConcurrentHashMap|Semaphore|threading\.Lock|asyncio\.Lock|std::mutex|lock_guard|Mutex)\b/.test(all);
  const shared: string[] = [];
  if (opts.concurrency) {
    const fieldRe = lang === "python" ? /self\.(\w+)\s*=\s*(\[|\{|dict\(|list\(|set\(|0\b)/g : /(?:private|protected|public)?\s*(?!final)(?:static\s+)?(?:Map|HashMap|List|ArrayList|Set|HashSet|int|long|Queue|Deque)\b[^;=(]*\s(\w+)\s*(=|;)/g;
    for (const [f, s] of srcs) {
      let fm: RegExpExecArray | null;
      while ((fm = fieldRe.exec(s))) {
        const field = fm[1];
        if (/ConcurrentHashMap|Atomic|final\s/.test(s.slice(Math.max(0, fm.index - 30), fm.index + fm[0].length + 40))) continue;
        if (!usesConc) shared.push(`${f}: ${field}`);
      }
    }
  }
  return {
    files: srcs.length, lines: all.split("\n").filter((l) => l.trim()).length,
    types: (all.match(typeRe) ?? []).length, interfaces: (all.match(ifaceRe) ?? []).length,
    methods: methods.length,
    longestMethod: longest ? { name: longest.name, file: longest.file, lines: longest.lines } : null,
    duplicateBlocks,
    unvalidatedPublicMethods: unvalidated.slice(0, 12),
    sharedMutableState: [...new Set(shared)].slice(0, 12),
    usesConcurrencyPrimitives: usesConc,
  };
}

/** Readable summary for the evaluator and the report. */
export function describeFacts(f: StaticFacts, concurrency: boolean): string[] {
  return [
    `${f.files} file(s), ${f.lines} non-blank lines, ${f.types} type(s) (${f.interfaces} interface/abstract), ${f.methods} method(s).`,
    f.longestMethod ? `Longest method: ${f.longestMethod.name} in ${f.longestMethod.file} (${f.longestMethod.lines} lines).` : "No methods found.",
    `Repeated 5-line blocks: ${f.duplicateBlocks}.`,
    f.unvalidatedPublicMethods.length ? `Public methods that never check their inputs: ${f.unvalidatedPublicMethods.slice(0, 6).join("; ")}.` : "Every public method with parameters checks at least one of them.",
    concurrency ? (f.usesConcurrencyPrimitives ? "Uses concurrency primitives (locks/atomics/concurrent collections)." : `No synchronisation primitives found${f.sharedMutableState.length ? `; mutable shared fields: ${f.sharedMutableState.slice(0, 6).join("; ")}` : ""}.`) : "",
  ].filter(Boolean);
}
