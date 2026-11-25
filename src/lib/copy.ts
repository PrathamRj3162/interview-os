/**
 * UI-chrome micro-copy with two registers. Gen-Z is the default; "pro" is neutral.
 * Rule: at most one slang phrase per screen, and NEVER in reports or feedback content.
 */
export type Vibe = "genz" | "pro";

const COPY = {
  heroCta: { genz: "Let's cook", pro: "Start preparing" },
  dashboardGreeting: { genz: "Hey {name} 👋", pro: "Hi {name}" },
  noTasks: { genz: "Nothing queued. Finish a mock and we'll line up your next moves.", pro: "No tasks yet. Completing a mock interview adds tasks targeted at the weaknesses it found." },
  noInterviews: { genz: "No interviews yet — your first one is the hardest. Lowkey easy after that.", pro: "No interviews yet." },
  noResumes: { genz: "No resume yet. Drop one in and we'll find what interviewers will grill.", pro: "No resumes uploaded yet." },
  interviewEmptyCta: { genz: "Start your first round", pro: "Start your first interview" },
  profileSaved: { genz: "Saved. You're all set.", pro: "Profile saved." },
  allTestsPassed: { genz: "W submission — all tests passed.", pro: "All tests passed." },
  quotaHit: { genz: "You've used today's free AI quota. Touch grass, it resets in 24h. Everything non-AI still works.", pro: "You've reached today's free AI limit. It resets within 24 hours; non-AI features still work." },
  reportReady: { genz: "Your report is ready. Let's see the damage.", pro: "Your report is ready." },
} as const;
export type CopyKey = keyof typeof COPY;

export function copy(vibe: Vibe, key: CopyKey, vars: Record<string, string> = {}) {
  return COPY[key][vibe].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
