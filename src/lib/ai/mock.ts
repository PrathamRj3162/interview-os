import "server-only";
import type { ChatMessage } from "./index";

/**
 * Deterministic offline provider for automated tests (AI_MOCK=1). Never enabled on Vercel.
 * It recognises each feature by its system prompt and returns schema-valid JSON built from the real input,
 * so verbatim/evidence checks still run against genuine text.
 */
export function mockEnabled() {
  return process.env.AI_MOCK === "1" && !process.env.VERCEL;
}

const inner = (s: string) => s.replace(/^[\s\S]*?<untrusted[^>]*>\n?/, "").replace(/\n?<\/untrusted>[\s\S]*$/, "");

export function mockReply(messages: ChatMessage[]): string {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const users = messages.filter((m) => m.role === "user").map((m) => m.content);
  const last = users.at(-1) ?? "";

  if (system.includes("resume reviewer")) {
    const lines = inner(last).split("\n").map((l) => l.trim());
    const bullets = lines.filter((l) => /^[-•]\s+/.test(l)).map((l) => l.replace(/^[-•]\s+/, "")).filter((l) => l.split(" ").length >= 6);
    return JSON.stringify({
      profile: { skills: [], experience: [], projects: [{ name: "Mock Project", technologies: ["Python"], summary: "From mock", bullets: [] }], achievements: [], education: [] },
      claims: bullets.slice(0, 6).map((b, i) => ({
        claim: b, section: i < 3 ? "Experience" : "Projects", risk: ["high", "medium", "low"][i % 3],
        concern: "Interviewer will want specifics.", questions: ["Why this approach?", "How did you measure it?", "What would you change?"],
      })),
      rewrites: bullets.slice(0, 1).map((b) => ({ original: b, improved: b + " (by [X%])", why: "Adds a measurable outcome." })),
      recruiter_concerns: ["Mock concern"],
      prep_questions: [{ question: "Tell me about yourself", guidance: "Present → past → future." }],
    });
  }

  if (system.includes("rigorous, fair evaluation")) {
    const ids = [...system.matchAll(/^- (\w+): /gm)].map((m) => m[1]);
    const transcript = inner(last);
    const answers = [...transcript.matchAll(/^A(\d+): (.+)$/gm)];
    const quote = (answers[0]?.[2] ?? "").split(/\s+/).slice(0, 6).join(" ");
    return JSON.stringify({
      summary: "Mock evaluation of the candidate's answers.",
      categories: ids.map((id) => ({ id, score: 3, evidence: quote ? [quote] : [], comment: "Mock comment." })),
      questions: answers.map((a) => ({ index: Number(a[1]), correct: ["Gave a direct answer"], missing: ["Trade-offs"], strong_answer: "Mock strong answer.", study: ["Mock topic"] })),
      strengths: ["Clear structure"], weaknesses: ["Limited depth"], mistakes: [], missed_concepts: ["k-fold cross-validation"],
      priorities: [{ topic: "Validation", why: "Mock reason", action: "Practise explaining validation", kind: "lesson" }],
      communication_comment: "Mock communication comment.",
    });
  }

  if (system.includes('{"hint"')) return JSON.stringify({ hint: "Consider the constraints again." });

  if (system.includes('Return JSON: {"say"')) {
    const candidate = users.filter((u) => u.includes("candidate_answer")).at(-1);
    if (!candidate) return JSON.stringify({ say: "Hi! Let's begin. Walk me through the project you're proudest of.", topic: "intro", is_follow_up: false, should_end: false });
    const words = inner(candidate).split(/\s+/).slice(0, 6).join(" ");
    return JSON.stringify({ say: `You mentioned "${words}". Why that choice over the alternatives?`, topic: "justification", is_follow_up: true, should_end: false });
  }
  return JSON.stringify({ ok: true });
}
