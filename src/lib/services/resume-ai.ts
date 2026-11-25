import "server-only";
import { z } from "zod";
import { generateObject } from "@/lib/ai";
import { untrusted } from "@/lib/ai/json";

const str = (max: number) => z.string().trim().min(1).max(max);

const SECTION_SYNONYMS: [RegExp, Section][] = [
  [/experience|intern|work|employ|job/, "experience"], [/project/, "projects"], [/skill|tech|stack|tool/, "skills"],
  [/achiev|award|honou?r|certif|accomplish|extra/, "achievements"], [/educat|academ|degree|school|universit|college/, "education"],
];
type Section = "experience" | "projects" | "skills" | "achievements" | "education" | "summary";
/** Models label sections in their own words ("Work Experience", "PROJECTS"): normalise instead of rejecting the whole analysis. */
const sectionField = z.string().transform((v): Section => {
  const l = v.toLowerCase();
  return SECTION_SYNONYMS.find(([re]) => re.test(l))?.[1] ?? "summary";
});
const riskField = z.string().transform((v): "low" | "medium" | "high" => {
  const l = v.toLowerCase();
  return l.startsWith("h") ? "high" : l.startsWith("l") ? "low" : "medium";
});

export const resumeAiSchema = z.object({
  profile: z.object({
    education: z.array(z.object({ institution: str(200), degree: z.string().max(200).default(""), year: z.string().max(40).default("") })).max(8).default([]),
    skills: z.array(str(60)).max(80).default([]),
    experience: z.array(z.object({
      company: str(200), role: z.string().max(200).default(""), period: z.string().max(80).default(""),
      bullets: z.array(str(500)).max(15).default([]),
    })).max(10).default([]),
    projects: z.array(z.object({
      name: str(200), technologies: z.array(str(60)).max(25).default([]),
      summary: z.string().max(600).default(""), bullets: z.array(str(500)).max(15).default([]),
    })).max(12).default([]),
    achievements: z.array(str(400)).max(20).default([]),
  }),
  claims: z.array(z.object({
    claim: z.string().max(500).default(""),
    section: sectionField,
    risk: riskField,
    concern: z.string().max(400).default(""),
    questions: z.array(z.string().max(300)).max(15).default([]).transform((q) => q.map((x) => x.trim()).filter(Boolean).slice(0, 12)),
  })).max(25),
  rewrites: z.array(z.object({ original: z.string().max(500).default(""), improved: z.string().max(500).default(""), why: z.string().max(300).default("") })).max(12).default([]),
  recruiter_concerns: z.array(str(300)).max(10).default([]),
  prep_questions: z.array(z.object({ question: z.string().max(200).default(""), guidance: z.string().max(1200).default("") })).max(10).default([]),
});
export type ResumeAi = z.infer<typeof resumeAiSchema>;

const ROLE_NAMES: Record<string, string> = {
  sde1: "SDE-1", sde_intern: "SDE intern", backend: "backend developer", frontend: "frontend developer",
  fullstack: "full-stack developer", swe: "software engineer",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9%]+/g, " ").trim();

/** Keeps only items whose quoted text really occurs in the resume (hallucination guard). */
export function keepVerbatim<T>(items: T[], pick: (t: T) => string, resumeText: string): T[] {
  const hay = norm(resumeText);
  return items.filter((it) => {
    const needle = norm(pick(it));
    if (needle.length < 8) return false;
    if (hay.includes(needle)) return true;
    // tolerate small PDF-extraction differences: 85% of 4-word shingles must match
    const w = needle.split(" ");
    if (w.length < 6) return false;
    let hit = 0, total = 0;
    for (let i = 0; i + 4 <= w.length; i++) { total++; if (hay.includes(w.slice(i, i + 4).join(" "))) hit++; }
    return total > 0 && hit / total >= 0.85;
  });
}

export async function analyzeResumeWithAI(resumeText: string, targetRole: string | null, experience: string | null) {
  const role = ROLE_NAMES[targetRole ?? "swe"] ?? "software engineer";
  const { data, provider, model } = await generateObject(resumeAiSchema, [
    {
      role: "system",
      content: [
        `You are a senior ${role} interviewer and resume reviewer at a product company.`,
        `The candidate's experience level: ${experience ?? "unknown"}.`,
        "Analyse the resume and return JSON with keys: profile, claims, rewrites, recruiter_concerns, prep_questions.",
        "RULES:",
        "- profile: extract ONLY what is written. Never invent employers, dates, numbers or technologies.",
        "- claims: 6-15 of the most interview-relevant claims. `section` is one of: experience, projects, skills, achievements, education, summary. `risk` is one of: low, medium, high. `claim` MUST be copied verbatim from the resume. Prefer technical claims an interviewer would probe (architecture, model choices, metrics, performance numbers, 'built X using Y').",
        "  risk=high when a claim includes unexplained metrics, advanced technology without supporting detail, or vague ownership; medium when depth is unclear; low when well-supported.",
        "  `concern` states neutrally what an interviewer would want verified. Never accuse the candidate of dishonesty.",
        "  `questions`: 5-12 specific, progressively deeper questions about THAT claim (why this choice, how it works, alternatives, data, metrics validation, failure modes, scaling, personal contribution). Never generic.",
        "- rewrites: up to 8 weak bullets. `original` verbatim. `improved` must keep the same facts; where a number would help but is not given, use a placeholder like [X%] or [N users] — NEVER invent numbers or achievements.",
        "- recruiter_concerns: gaps a skeptical recruiter might notice (missing sections, unclear dates, thin projects).",
        "- prep_questions: tailored versions of: Tell me about yourself; Walk me through your resume; Strongest technical achievement; Biggest challenge; What would you improve; What did you personally implement; Why should we hire you. `guidance` = a strong answer STRUCTURE using the candidate's real content, not a fabricated script.",
      ].join("\n"),
    },
    { role: "user", content: untrusted("resume", resumeText) },
  ], { temperature: 0.2, maxTokens: 8000 });

  return {
    provider,
    model,
    result: {
      ...data,
      // A claim needs questions to be useful; a rewrite needs both sides.
      claims: keepVerbatim(data.claims.filter((c) => c.questions.length >= 2), (c) => c.claim, resumeText),
      rewrites: keepVerbatim(data.rewrites.filter((r) => r.improved.trim()), (r) => r.original, resumeText),
      prep_questions: data.prep_questions.filter((q) => q.question.trim() && q.guidance.trim()),
    },
    dropped: {
      claims: data.claims.length - keepVerbatim(data.claims, (c) => c.claim, resumeText).length,
      rewrites: data.rewrites.length - keepVerbatim(data.rewrites, (r) => r.original, resumeText).length,
    },
  };
}
