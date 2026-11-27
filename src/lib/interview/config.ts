/** Interview configuration shared by the setup form, the interviewer engine and the evaluator. */

export const PERSONAS = {
  mentor: {
    name: "Friendly Mentor",
    blurb: "Warm and encouraging; probes gently and helps you relax.",
    style: "Warm, encouraging and patient. Acknowledge good points briefly. When an answer is weak, ask a gentler, more scaffolded follow-up rather than moving on. Still never give away the answer in mock mode.",
  },
  professional: {
    name: "Professional Technical Interviewer",
    blurb: "Neutral, structured, like most real SDE loops.",
    style: "Neutral, concise and structured, like a typical product-company interviewer. Short acknowledgements, then the next question or follow-up. Keep a steady pace across topics.",
  },
  strict: {
    name: "Strict Senior Engineer",
    blurb: "Direct, demanding precision and justification.",
    style: "Direct and demanding. Do not accept hand-wavy answers: ask for precise definitions, concrete numbers, and justification for every choice. Point out contradictions plainly but professionally.",
  },
  skeptic: {
    name: "Skeptical Project Evaluator",
    blurb: "Cross-questions every claim on your resume.",
    style: "Skeptical senior engineer verifying resume claims. For each claim, dig into: why this choice over alternatives, how exactly it works, what YOU personally built, how results were measured, what broke and how it was fixed. Ask for specifics whenever an answer is generic.",
  },
  dsa: {
    name: "DSA Specialist",
    blurb: "Problem-solving process: clarify, brute force, optimise, complexity.",
    style: "Algorithms interviewer. Present ONE problem with constraints and an example. Expect the candidate to clarify, propose brute force, then optimise. Ask for time/space complexity, edge cases and a dry run. Evaluate process, not just the final answer.",
  },
  architect: {
    name: "System Design Architect",
    blurb: "Requirements, estimates, architecture and trade-offs.",
    style: "System design interviewer. Drive the classic flow: functional and non-functional requirements, capacity estimates, APIs, data model, high-level architecture, then deep dives into bottlenecks, scaling, failure modes and trade-offs. Push on 'why this and not that'.",
  },
  hr: {
    name: "HR Interviewer",
    blurb: "Motivation, fit, expectations and logistics.",
    style: "Friendly HR/recruiter screen. Ask about motivation, career goals, why this company/role, strengths and weaknesses, relocation and expectations. Probe for genuineness and specifics; avoid technical depth.",
  },
  behavioral: {
    name: "Behavioral Interviewer",
    blurb: "STAR-format stories: ownership, conflict, failure.",
    style: "Behavioral interviewer using STAR. Ask for a specific past situation, then probe Situation, Task, the candidate's OWN Actions (not 'we'), and measurable Results. Ask what they learned. Push back when the story is hypothetical or vague.",
  },
  bar_raiser: {
    name: "Bar Raiser",
    blurb: "Raises difficulty until you hit your limit.",
    style: "Bar raiser. Start at the selected level, then escalate depth with every good answer until the candidate reaches the edge of their knowledge; then explore how they reason under uncertainty. Mix technical depth with ownership and judgement questions.",
  },
} as const;
export type PersonaId = keyof typeof PERSONAS;

/** Interviewer tiers: how hard the interviewer pushes, independent of question difficulty. */
export const TIERS = {
  warmup: { label: "Warm-up", desc: "Patient and encouraging — good for a first attempt." },
  standard: { label: "Standard", desc: "Like a typical SDE loop." },
  tough: { label: "Tough", desc: "Demands precision and justification." },
  bar_raiser: { label: "Bar raiser", desc: "Escalates until you hit your limit." },
} as const;
export type TierId = keyof typeof TIERS;

/**
 * Original characters for each interviewer style (fictional people; any resemblance is coincidental).
 * The avatar is generated from `look`, never a photo.
 */
export const CHARACTERS: Record<PersonaId, { first: string; tier: TierId; look: { bg: string; fg: string; hair: 0 | 1 | 2 | 3; glasses: boolean } }> = {
  mentor: { first: "Meera", tier: "warmup", look: { bg: "#34d399", fg: "#0b2e22", hair: 1, glasses: false } },
  hr: { first: "Priya", tier: "warmup", look: { bg: "#f472b6", fg: "#3a0d24", hair: 2, glasses: false } },
  professional: { first: "Arjun", tier: "standard", look: { bg: "#60a5fa", fg: "#0b1f3a", hair: 0, glasses: true } },
  dsa: { first: "Ishaan", tier: "standard", look: { bg: "#a78bfa", fg: "#1d1240", hair: 3, glasses: true } },
  behavioral: { first: "Sam", tier: "standard", look: { bg: "#fbbf24", fg: "#3a2a05", hair: 1, glasses: false } },
  strict: { first: "Kavya", tier: "tough", look: { bg: "#fb923c", fg: "#3a1705", hair: 2, glasses: true } },
  skeptic: { first: "Rohan", tier: "tough", look: { bg: "#f87171", fg: "#3a0b0b", hair: 0, glasses: false } },
  architect: { first: "Nisha", tier: "tough", look: { bg: "#22d3ee", fg: "#06303a", hair: 3, glasses: true } },
  bar_raiser: { first: "Vikram", tier: "bar_raiser", look: { bg: "#ffd43b", fg: "#2b2405", hair: 0, glasses: true } },
};

export const KINDS = {
  resume_screen: { name: "Resume-based interview", defaultPersona: "skeptic", coding: false },
  project: { name: "Project deep dive", defaultPersona: "skeptic", coding: false },
  dsa: { name: "DSA & live coding", defaultPersona: "dsa", coding: true },
  fundamentals: { name: "CS fundamentals (OS, DBMS, CN, OOP)", defaultPersona: "professional", coding: false },
  lld: { name: "Low-level design", defaultPersona: "architect", coding: true },
  hld: { name: "High-level system design", defaultPersona: "architect", coding: false },
  behavioral: { name: "Behavioral", defaultPersona: "behavioral", coding: false },
  hr: { name: "HR screening", defaultPersona: "hr", coding: false },
  full: { name: "Complete SDE mock interview", defaultPersona: "professional", coding: true },
  company: { name: "Company-style mock", defaultPersona: "bar_raiser", coding: true },
} as const;
export type KindId = keyof typeof KINDS;

export const DIFFICULTIES = {
  beginner: "Beginner — fundamentals, lots of room to think",
  easy: "Easy — standard questions, light follow-ups",
  medium: "Medium — typical SDE-1 bar",
  hard: "Hard — deep follow-ups, product-company bar",
  expert: "Expert — senior-level depth and ambiguity",
} as const;
export type Difficulty = keyof typeof DIFFICULTIES;

export const DURATIONS = [10, 20, 30, 45, 60] as const;

/** Rubric categories per interview kind. Every category is scored 1–5 with quoted evidence. */
export const RUBRICS: Record<KindId, { id: string; name: string; desc: string }[]> = {
  dsa: [
    { id: "understanding", name: "Problem understanding", desc: "Restated the problem, asked clarifying questions about constraints/inputs" },
    { id: "approach", name: "Approach & optimisation", desc: "Brute force first, then a justified optimisation; chose suitable data structures" },
    { id: "correctness", name: "Correctness", desc: "Solution/code is logically correct" },
    { id: "edge_cases", name: "Edge cases & testing", desc: "Identified edge cases and dry-ran the solution" },
    { id: "complexity", name: "Complexity analysis", desc: "Correct time and space complexity with reasoning" },
    { id: "code_quality", name: "Code quality", desc: "Readable, well-named, idiomatic code" },
    { id: "communication", name: "Communication", desc: "Thought aloud clearly and structured explanations" },
  ],
  // System design rubric v2 (level-calibrated anchors in lib/interview/rubric.ts → HLD_ANCHORS).
  hld: [
    { id: "requirements", name: "Requirements", desc: "Functional and non-functional requirements clarified, with numbers" },
    { id: "estimation", name: "Estimation", desc: "Traffic/storage estimates that drive later choices" },
    { id: "api_data", name: "API & data model", desc: "Main endpoints and a data model fitted to the access patterns" },
    { id: "architecture", name: "Architecture", desc: "Coherent components and request flow (scored partly from the whiteboard)" },
    { id: "deep_dive", name: "Deep dive", desc: "Depth on the component the interviewer chose" },
    { id: "scaling", name: "Scaling & reliability", desc: "Caching, sharding, replication, failure handling where the numbers need it" },
    { id: "tradeoffs", name: "Trade-offs", desc: "Named the alternative and what was given up" },
    { id: "operations", name: "Operations", desc: "Monitoring, failure handling, rollout, security basics" },
    { id: "communication", name: "Communication", desc: "Drove the discussion and used the whiteboard" },
  ],
  lld: [
    { id: "requirements", name: "Requirements", desc: "Clarified scope and use cases" },
    { id: "modeling", name: "Entities & relationships", desc: "Sensible classes, interfaces and relationships" },
    { id: "principles", name: "Design principles", desc: "SOLID, appropriate design patterns" },
    { id: "extensibility", name: "Extensibility", desc: "Design accommodates change" },
    { id: "communication", name: "Communication", desc: "Explained the design clearly" },
  ],
  project: [
    { id: "architecture", name: "Architecture understanding", desc: "Could explain how the system fits together" },
    { id: "decisions", name: "Technology decisions", desc: "Justified choices against alternatives" },
    { id: "depth", name: "Implementation depth", desc: "Concrete details of how things were built" },
    { id: "ownership", name: "Personal contribution", desc: "Clear about what they personally did" },
    { id: "reflection", name: "Limitations & improvements", desc: "Honest about weaknesses; credible improvements" },
    { id: "communication", name: "Communication", desc: "Clear, structured answers" },
  ],
  resume_screen: [
    { id: "claims", name: "Defending resume claims", desc: "Backed claims with specifics and evidence" },
    { id: "depth", name: "Technical depth", desc: "Understood the technologies they listed" },
    { id: "ownership", name: "Personal contribution", desc: "Clear about their own role" },
    { id: "reflection", name: "Self-awareness", desc: "Honest about gaps and what they'd improve" },
    { id: "communication", name: "Communication", desc: "Concise, structured answers" },
  ],
  fundamentals: [
    { id: "correctness", name: "Conceptual correctness", desc: "Definitions and explanations are accurate" },
    { id: "depth", name: "Depth of understanding", desc: "Goes beyond definitions to how/why" },
    { id: "application", name: "Practical application", desc: "Connects concepts to real systems" },
    { id: "vocabulary", name: "Technical vocabulary", desc: "Uses precise terminology" },
    { id: "communication", name: "Communication", desc: "Clear explanations" },
  ],
  behavioral: [
    { id: "structure", name: "STAR structure", desc: "Situation, Task, Action, Result clearly present" },
    { id: "specificity", name: "Specificity", desc: "Real, concrete examples rather than hypotheticals" },
    { id: "ownership", name: "Ownership", desc: "Describes own actions ('I'), not just the team's" },
    { id: "results", name: "Results & learning", desc: "Measurable outcomes and reflection" },
    { id: "communication", name: "Communication", desc: "Concise and relevant" },
  ],
  hr: [
    { id: "motivation", name: "Motivation & fit", desc: "Clear, genuine reasons for the role/company" },
    { id: "self_awareness", name: "Self-awareness", desc: "Credible strengths/weaknesses with examples" },
    { id: "professionalism", name: "Professionalism", desc: "Appropriate, considered answers" },
    { id: "communication", name: "Communication", desc: "Clear and concise" },
  ],
  full: [
    { id: "problem_solving", name: "Problem solving", desc: "Structured approach to technical problems" },
    { id: "technical_depth", name: "Technical depth", desc: "Accurate, deep technical knowledge" },
    { id: "projects", name: "Project defence", desc: "Could explain and justify their own work" },
    { id: "fundamentals", name: "CS fundamentals", desc: "Accurate core CS knowledge" },
    { id: "communication", name: "Communication", desc: "Clear, structured, concise" },
  ],
  company: [
    { id: "problem_solving", name: "Problem solving", desc: "Structured approach to technical problems" },
    { id: "technical_depth", name: "Technical depth", desc: "Accurate, deep technical knowledge" },
    { id: "ownership", name: "Ownership & judgement", desc: "Takes responsibility; sound decisions" },
    { id: "communication", name: "Communication", desc: "Clear, structured, concise" },
  ],
};

export const KIND_FOCUS: Record<KindId, string> = {
  resume_screen: "Walk through the candidate's resume. Pick the most important or hardest-to-defend claims and cross-question them one at a time.",
  project: "Deep-dive into one or two of the candidate's projects: problem, architecture, tech choices, data model, APIs, auth, deployment, performance, testing, failures, personal contribution, improvements.",
  dsa: "Run a coding round: one problem appropriate to the difficulty (a second only if time allows). The candidate may write code in the editor; their code is included with their messages.",
  fundamentals: "Cover core CS: operating systems, DBMS/SQL, computer networks and OOP. Move between areas; go deeper where answers are strong, probe misconceptions where they are weak.",
  lld: "Low-level design of one system (e.g. parking lot, splitwise, elevator). Drive: requirements → entities → classes/interfaces → relationships → patterns → extensibility. The candidate may sketch classes in the editor.",
  hld: "High-level design of one system (e.g. URL shortener, chat app, news feed) following the standard flow.",
  behavioral: "Behavioral round with 3–5 STAR questions (ownership, conflict, failure, deadlines, teamwork). Follow up on each until Situation/Task/Action/Result are clear.",
  hr: "HR screening: introductions, motivation, career goals, strengths/weaknesses, expectations and logistics.",
  full: "A compressed full loop: brief intro, one resume/project probe, one DSA problem, a few CS fundamentals questions, and one behavioral question.",
  company: "A company-style loop for the stated target company: emphasise the values and bar that company is publicly known for, but never claim a question was actually asked there.",
};
