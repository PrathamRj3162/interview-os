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
    const transcript = inner(users.find((u) => u.includes('source="interview_transcript"')) ?? last);
    const answers = [...transcript.matchAll(/^A(\d+): (.+)$/gm)];
    const quote = (answers[0]?.[2] ?? "").split(/\s+/).slice(0, 6).join(" ");
    // Code annotations quote a real line from the numbered final code, so validation can be exercised.
    const codeMsg = users.find((u) => u.includes('source="final_code"'));
    const codeLine = codeMsg ? inner(codeMsg).split("\n").map((l) => /^\s*(\d+)\| (.*)$/.exec(l)).find((m) => m && m[2].trim().length > 8) : null;
    return JSON.stringify({
      summary: "Mock evaluation of the candidate's answers.",
      categories: ids.map((id) => ({ id, score: 3, evidence: quote ? [quote] : [], comment: "Mock comment.", fix: `Mock fix for ${id}.` })),
      drills: [
        { title: "Mock drill one", how: "Do the first thing.", minutes: 20, kind: "dsa" },
        { title: "Mock drill two", how: "Do the second thing.", minutes: 30, kind: "lesson" },
        { title: "Mock drill three", how: "Do the third thing.", minutes: 25, kind: "mock" },
      ],
      code_notes: codeLine ? [
        { line: Number(codeLine[1]), quote: codeLine[2].trim(), kind: "edge_case", note: "Mock note: check the empty input here." },
        { line: 1, quote: "this text is not in the code", kind: "bug", note: "Fabricated note that must be dropped." },
      ] : [],
      questions: answers.map((a) => ({ index: Number(a[1]), correct: ["Gave a direct answer"], missing: ["Trade-offs"], strong_answer: "Mock strong answer.", study: ["Mock topic"] })),
      strengths: ["Clear structure"], weaknesses: ["Limited depth"], mistakes: [], missed_concepts: ["k-fold cross-validation"],
      communication_comment: "Mock communication comment.",
    });
  }

  if (system.includes('{"hint"')) return JSON.stringify({ hint: "Consider the constraints again." });

  if (system.includes("defend a software project")) {
    const repo = /Repository: ([^\s]+)/.exec(inner(last))?.[1] ?? "the repository";
    return JSON.stringify({
      summary: `Mock summary of ${repo}.`, architecture: "Mock architecture paragraph.",
      questions: [{ question: `Why is ${repo} structured this way?`, probing: "Design reasoning." }, { question: "What would you test first?", probing: "Testing." }],
      verify: ["Mock claim to verify"],
    });
  }

  if (system.includes("LIVE CODING ROUND")) {
    const phase = /CURRENT PHASE: (\w+)/.exec(system)?.[1] ?? "clarify";
    const lines: Record<string, string> = {
      clarify: "Good. Any questions about the input before you start?",
      brute: "What's the simplest correct approach, and its complexity?",
      optimise: "Can you do better than that? Go ahead and code it when ready.",
      code: "Sounds good — keep going and run it when you're ready.",
      test: "Walk me through your code on the first example.",
      complexity: "What are the final time and space complexities?",
      wrap: "Thanks, that's time. Any questions for me?",
    };
    return JSON.stringify({ say: lines[phase] ?? lines.clarify, topic: phase, is_follow_up: false, advance_phase: true, should_end: phase === "wrap" });
  }

  if (system.includes('Return JSON: {"say"')) {
    const candidate = users.filter((u) => u.includes("candidate_answer")).at(-1);
    if (!candidate) return JSON.stringify({ say: "Hi! Let's begin. Walk me through the project you're proudest of.", topic: "intro", is_follow_up: false, should_end: false });
    const words = inner(candidate).split(/\s+/).slice(0, 6).join(" ");
    return JSON.stringify({ say: `You mentioned "${words}". Why that choice over the alternatives?`, topic: "justification", is_follow_up: true, should_end: false });
  }
  return JSON.stringify({ ok: true });
}
