import "server-only";
import { z } from "zod";
import { generateObject } from "@/lib/ai";
import { untrusted } from "@/lib/ai/json";
import type { RepoSnapshot } from "./github";

export type ProjectAnalysis = {
  summary: string;
  architecture: string;
  facts: string[];
  questions: { question: string; probing: string }[];
  verify: string[];
  source: "ai" | "rules";
  provider?: string; model?: string;
  analysedAt: string;
};

const list = (n: number, len: number) => z.array(z.string().trim().min(1).max(len)).max(n).catch([]);
const schema = z.object({
  summary: z.string().trim().min(1).max(800),
  architecture: z.string().trim().max(1200).catch(""),
  questions: z.array(z.object({ question: z.string().trim().min(5).max(300), probing: z.string().trim().max(300).catch("") })).max(10).catch([]),
  verify: list(6, 300),
});

/** Facts we can state without AI, straight from the repository snapshot. */
export function repoFacts(s: RepoSnapshot): string[] {
  const f = [
    `${s.fileCount} files; top folders: ${s.topDirs.slice(0, 8).join(", ") || "—"}.`,
    s.languages.length ? `Languages: ${s.languages.slice(0, 4).map((l) => `${l.name} ${l.pct}%`).join(", ")}.` : "",
    s.dependencies.length ? `Key dependencies: ${notableDeps(s.dependencies).slice(0, 12).join(", ")}.` : "",
    `Tests ${s.signals.tests ? "present" : "not found"} · CI ${s.signals.ci ? "configured" : "not found"} · Docker ${s.signals.docker ? "yes" : "no"} · licence ${s.signals.license ? "yes" : "none"}.`,
    s.pushedAt ? `Last push: ${new Date(s.pushedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}.` : "",
  ];
  return f.filter(Boolean);
}

const TOOLING = /^(@types\/|eslint|prettier|typescript$|ts-node|tsx$|vitest|jest|@testing-library|husky|lint-staged|@playwright|playwright|nodemon|autoprefixer|postcss|pytest|black|flake8|mypy)/;

/** Dependencies worth asking about: no build/test tooling, and scoped packages collapsed to their scope. */
const KNOWN = ["next", "react", "vue", "@angular", "svelte", "express", "fastify", "@nestjs", "django", "flask", "fastapi", "spring-boot-starter-web", "@supabase", "firebase", "prisma", "@prisma", "mongoose", "mongodb", "pg", "mysql2", "sqlalchemy", "redis", "ioredis", "kafkajs", "socket.io", "graphql", "@apollo", "tensorflow", "torch", "scikit-learn", "pandas", "langchain", "openai", "stripe", "@codemirror"];

export function notableDeps(deps: string[]): string[] {
  const out = [...new Set(deps.filter((d) => !TOOLING.test(d)).map((d) => (d.startsWith("@") ? d.split("/")[0] : d)))];
  const rank = (d: string) => { const i = KNOWN.indexOf(d.toLowerCase()); return i < 0 ? KNOWN.length : i; };
  return out.sort((a, b) => rank(a) - rank(b));
}

/** Template questions from the snapshot alone (used when no AI provider is available). */
export function ruleQuestions(s: RepoSnapshot, title: string): ProjectAnalysis["questions"] {
  const q: ProjectAnalysis["questions"] = [
    { question: `Walk me through how a request flows through ${title}, from the entry point to storage.`, probing: "Whether you understand the architecture end to end." },
    { question: `What part of ${title} did you personally build, and what would break first at 10× the users?`, probing: "Ownership and scaling awareness." },
  ];
  for (const d of notableDeps(s.dependencies).slice(0, 3)) q.push({ question: `Why did you choose ${d}? What did you consider instead?`, probing: "Justified technology decisions." });
  if (!s.signals.tests) q.push({ question: "I don't see automated tests. How did you make sure changes didn't break things?", probing: "Testing discipline." });
  if (!s.signals.ci) q.push({ question: "How was this deployed, and how would you automate it?", probing: "Deployment and CI/CD." });
  q.push({ question: "What was the hardest bug you hit in this project, and how did you find it?", probing: "Debugging depth and honesty." });
  return q.slice(0, 8);
}

export async function analyseRepo(s: RepoSnapshot, project: { title: string; description: string | null; technologies: string[] }): Promise<ProjectAnalysis> {
  const facts = repoFacts(s);
  const { data, provider, model } = await generateObject(schema, [
    {
      role: "system",
      content: [
        "You help a candidate prepare to defend a software project in an SDE interview. You are given facts about its PUBLIC GitHub repository (README, structure, dependencies).",
        "Base everything ONLY on the provided repository data and the candidate's own description. Do not invent features, numbers or results. If something is unclear, say so.",
        "Return JSON: {summary: 2–3 sentences on what the project does and how, architecture: a short paragraph on components and data flow as far as the files show, questions: up to 8 {question, probing} an interviewer would ask about THIS repo (decisions, trade-offs, scaling, testing, security, personal contribution), verify: up to 5 claims in the README or resume description the candidate should be ready to back with specifics}.",
      ].join("\n"),
    },
    { role: "user", content: untrusted("repository", [
      `Project title (from the candidate): ${project.title}`,
      `Candidate's description: ${project.description ?? "(none)"}`,
      `Technologies listed by the candidate: ${project.technologies.join(", ") || "(none)"}`,
      `Repository: ${s.fullName} — ${s.description ?? ""} (${s.stars} stars)`,
      ...facts,
      "README (truncated):", s.readme.slice(0, 6000) || "(no README)",
    ].join("\n")) },
  ], { temperature: 0.3, maxTokens: 2500 });
  return { ...data, facts, source: "ai", provider, model, analysedAt: new Date().toISOString() };
}
