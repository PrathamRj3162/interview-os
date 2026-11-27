/** Machine coding round: shared (client-safe) types. Hidden tests live server-side in ./tests. */
import type { ContentStatus } from "@/lib/content/types";

export type McLang = "java" | "python" | "javascript" | "cpp";
export const MC_LANGS: McLang[] = ["java", "python", "javascript", "cpp"];
export const MC_LANG_LABEL: Record<McLang, string> = { java: "Java", python: "Python", javascript: "JavaScript", cpp: "C++" };
/** Entry file per language (the run command always starts here). */
export const MC_ENTRY: Record<McLang, string> = { java: "Main.java", python: "main.py", javascript: "main.js", cpp: "main.cpp" };
export const MC_EXT: Record<McLang, string> = { java: ".java", python: ".py", javascript: ".js", cpp: ".cpp" };

export type McProblem = {
  slug: string; title: string; version?: number; status?: ContentStatus;
  level: "Starter" | "Intermediate" | "Advanced";
  /** Plain paragraphs. */
  statement: string[];
  /** Command-line I/O contract: each input line is a command; output lines are compared exactly (trimmed). */
  io: string[];
  core: string[]; bonus: string[];
  /** Revealed at minute 60 (two-thirds of the build time). */
  extension: { title: string; text: string[]; io: string[] };
  /** The interviewer probes concurrency and the report scores it only when true. */
  concurrency: boolean;
  sample: { input: string; output: string };
  /** LLD discussion case sharing this statement (same problem as a 45-min design talk). */
  lldCase?: string;
};

export type McFiles = Record<string, string>;
export const MC_FILE_RE = /^[A-Za-z_][A-Za-z0-9_]{0,40}\.(java|py|js|cpp|h|hpp)$/;
export const MC_LIMITS = { files: 25, bytesPerFile: 30_000, totalBytes: 120_000 };

export function validateFiles(files: McFiles, lang: McLang): string | null {
  const names = Object.keys(files);
  if (!names.length) return "Add at least one file.";
  if (names.length > MC_LIMITS.files) return `At most ${MC_LIMITS.files} files.`;
  if (!names.includes(MC_ENTRY[lang])) return `The entry file ${MC_ENTRY[lang]} is required.`;
  let total = 0;
  for (const n of names) {
    if (!MC_FILE_RE.test(n)) return `"${n}" isn't a valid file name (letters, digits, _ and an extension; no folders).`;
    const len = files[n].length;
    if (len > MC_LIMITS.bytesPerFile) return `${n} is too long (${MC_LIMITS.bytesPerFile.toLocaleString()} characters max).`;
    total += len;
  }
  return total > MC_LIMITS.totalBytes ? "The project is too large." : null;
}
