/**
 * Deterministic resume checks. Every point awarded is explained, so the score is auditable.
 * This is a readability/quality heuristic — NOT a prediction of any ATS's decision.
 */

export type Check = {
  id: string;
  label: string;
  weight: number;   // max points
  earned: number;
  detail: string;
  tip?: string;
};

export type RuleReport = {
  score: number;    // 0-100, sum of earned / sum of weights
  checks: Check[];
  stats: {
    words: number;
    bullets: number;
    quantifiedBullets: number;
    actionVerbBullets: number;
    weakPhrases: { phrase: string; count: number }[];
    sections: Record<SectionId, boolean>;
    contact: { email: boolean; phone: boolean; linkedin: boolean; github: boolean };
    skillsFound: string[];
    unsupportedSkills: string[];
    missingKeywords: string[];
    longBullets: string[];
    shortBullets: string[];
    dateIssues: string[];
  };
};

export type SectionId = "education" | "experience" | "projects" | "skills" | "achievements";

const SECTION_PATTERNS: Record<SectionId, RegExp> = {
  education: /^\s*(education|academic (background|details)|academics)\b/im,
  experience: /^\s*(work experience|experience|professional experience|internships?|employment)\b/im,
  projects: /^\s*(projects|personal projects|academic projects|key projects)\b/im,
  skills: /^\s*(technical skills|skills|technologies|tech stack|core competencies)\b/im,
  achievements: /^\s*(achievements|awards|honors|accomplishments|certifications|extra.?curricular)\b/im,
};

export const ACTION_VERBS = [
  "built", "developed", "designed", "implemented", "engineered", "created", "led", "optimized", "optimised",
  "reduced", "improved", "increased", "automated", "deployed", "architected", "migrated", "refactored",
  "launched", "integrated", "scaled", "delivered", "analyzed", "analysed", "trained", "wrote", "established",
  "streamlined", "debugged", "resolved", "spearheaded", "mentored", "owned", "shipped", "accelerated",
  "configured", "containerized", "modeled", "researched", "tested", "maintained", "collaborated", "won",
];

const WEAK_PHRASES = ["responsible for", "worked on", "helped with", "helped", "assisted", "involved in", "participated in", "various", "etc", "duties included", "familiar with"];

/** Canonical skill → aliases (lowercase). Kept deliberately small and well-known. */
export const SKILLS: Record<string, string[]> = {
  "C++": ["c++", "cpp"], Python: ["python"], Java: ["java"], JavaScript: ["javascript", "js"],
  TypeScript: ["typescript", "ts"], Go: ["golang"], SQL: ["sql"], React: ["react", "react.js", "reactjs"],
  "Next.js": ["next.js", "nextjs"], "Node.js": ["node.js", "nodejs", "node"], Express: ["express", "express.js"],
  Django: ["django"], Flask: ["flask"], FastAPI: ["fastapi"], Spring: ["spring", "spring boot"],
  MongoDB: ["mongodb", "mongo"], PostgreSQL: ["postgresql", "postgres"], MySQL: ["mysql"], Redis: ["redis"],
  Docker: ["docker"], Kubernetes: ["kubernetes", "k8s"], AWS: ["aws", "amazon web services"], GCP: ["gcp", "google cloud"],
  Azure: ["azure"], Git: ["git"], "REST APIs": ["rest", "restful", "rest api", "rest apis"], GraphQL: ["graphql"],
  Kafka: ["kafka"], "Machine Learning": ["machine learning", "ml"], TensorFlow: ["tensorflow"], PyTorch: ["pytorch"],
  Linux: ["linux"], "CI/CD": ["ci/cd", "github actions", "jenkins"], Tailwind: ["tailwind", "tailwindcss"],
  HTML: ["html"], CSS: ["css"], Firebase: ["firebase"], "System Design": ["system design"],
  DSA: ["data structures", "algorithms", "dsa"],
};

/** Skills evidenced by using a more specific technology. */
const IMPLIED_BY: Record<string, string[]> = {
  SQL: ["PostgreSQL", "MySQL"],
  JavaScript: ["TypeScript", "React", "Next.js", "Node.js", "Express"],
  "REST APIs": ["Express", "FastAPI", "Django", "Flask", "Spring"],
  Python: ["Django", "Flask", "FastAPI", "PyTorch", "TensorFlow"],
};
const KNOWLEDGE_AREAS = new Set(["DSA", "System Design", "Machine Learning"]);

export const ROLE_KEYWORDS: Record<string, string[]> = {
  sde1: ["Data Structures", "Algorithms", "OOP", "SQL", "Git", "REST APIs", "Testing", "System Design"],
  sde_intern: ["Data Structures", "Algorithms", "OOP", "Git", "SQL", "Projects"],
  backend: ["REST APIs", "SQL", "Databases", "Caching", "Docker", "Testing", "Authentication", "Scalability"],
  frontend: ["React", "JavaScript", "TypeScript", "HTML", "CSS", "Accessibility", "Performance", "Testing"],
  fullstack: ["React", "Node.js", "REST APIs", "SQL", "Authentication", "Docker", "Testing", "Git"],
  swe: ["Data Structures", "Algorithms", "OOP", "Git", "Testing", "SQL"],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (alias: string) => new RegExp(`(^|[^a-z0-9+#.])${escape(alias)}(?=$|[^a-z0-9+#])`, "i");

export function findSkills(text: string): string[] {
  return Object.entries(SKILLS)
    .filter(([, aliases]) => aliases.some((a) => wordRe(a).test(text)))
    .map(([name]) => name);
}

/** Splits text into sections by detected headings (best effort). */
export function splitSections(text: string): Partial<Record<SectionId, string>> {
  const lines = text.split("\n");
  const out: Partial<Record<SectionId, string>> = {};
  let current: SectionId | null = null;
  for (const line of lines) {
    const heading = line.trim().length <= 40
      ? (Object.keys(SECTION_PATTERNS) as SectionId[]).find((id) => SECTION_PATTERNS[id].test(line))
      : undefined;
    if (heading) { current = heading; out[heading] = out[heading] ?? ""; continue; }
    if (current) out[current] += line + "\n";
  }
  return out;
}

export function getBullets(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^([•●▪◦‣\-–*]|\d+[.)])\s+/.test(l)).map((l) => l.replace(/^([•●▪◦‣\-–*]|\d+[.)])\s+/, ""));
  // Some PDFs lose bullet glyphs: fall back to sentence-like lines that start with a verb.
  if (bullets.length >= 3) return bullets;
  return lines.filter((l) => l.split(" ").length >= 6 && ACTION_VERBS.includes(l.split(" ")[0].toLowerCase()));
}

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

// ───────────── Dates ─────────────

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE_RE = `(?:${MONTH_RE}\\.?,?\\s+(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])\\/(?:19|20)\\d{2}|(?:19|20)\\d{2}-(?:0[1-9]|1[0-2])|(?:19|20)\\d{2})`;
const RANGE_RE = new RegExp(`(${DATE_RE})\\s*(?:–|—|-|to|until)\\s*(${DATE_RE}|present|current|now|ongoing|till date|expected\\s+${DATE_RE})?`, "gi");

type DateStyle = "Mon YYYY" | "Month YYYY" | "MM/YYYY" | "YYYY-MM" | "YYYY";
function parseDate(raw: string): { ym: number; style: DateStyle } | null {
  const t = raw.trim().toLowerCase().replace(/^expected\s+/, "");
  let m: RegExpMatchArray | null;
  if ((m = t.match(new RegExp(`^(${MONTH_RE})\\.?,?\\s+(\\d{4})$`)))) {
    const mon = MONTHS.indexOf(m[1].slice(0, 3));
    return { ym: Number(m[2]) * 12 + mon, style: m[1].length <= 4 ? "Mon YYYY" : "Month YYYY" };
  }
  if ((m = t.match(/^(\d{1,2})\/(\d{4})$/))) return { ym: Number(m[2]) * 12 + Number(m[1]) - 1, style: "MM/YYYY" };
  if ((m = t.match(/^(\d{4})-(\d{2})$/))) return { ym: Number(m[1]) * 12 + Number(m[2]) - 1, style: "YYYY-MM" };
  if ((m = t.match(/^(\d{4})$/))) return { ym: Number(m[1]) * 12, style: "YYYY" };
  return null;
}

/**
 * Date checks over "start – end" ranges: one consistent format, end not before start, no end date in the
 * future (unless marked Expected/Present), no open-ended ranges, and Experience listed newest first.
 */
export function checkDates(text: string, experienceText: string | undefined, now = new Date()): { ranges: number; issues: string[] } {
  const nowYm = now.getFullYear() * 12 + now.getMonth();
  const issues: string[] = [];
  const styles = new Set<DateStyle>();
  let ranges = 0;
  const fmt = (r: string) => r.replace(/\s+/g, " ").trim();
  for (const m of text.matchAll(RANGE_RE)) {
    const a = parseDate(m[1]);
    if (!a) continue;
    const endRaw = m[2]?.trim();
    // Bare years are only a date range when both sides are years (avoid "2023 - present" false matches being fine anyway).
    ranges++;
    styles.add(a.style);
    if (!endRaw) { if (a.style !== "YYYY") issues.push(`"${fmt(m[0])}" has no end date — add one, or "Present".`); continue; }
    if (/^(present|current|now|ongoing|till date)$/i.test(endRaw)) continue;
    const b = parseDate(endRaw);
    if (!b) continue;
    styles.add(b.style);
    if (b.ym < a.ym) issues.push(`"${fmt(m[0])}" ends before it starts.`);
    else if (b.ym > nowYm + 1 && !/^expected/i.test(endRaw)) issues.push(`"${fmt(m[0])}" ends in the future — write "Expected ${endRaw}" or "Present".`);
  }
  const monthStyles = [...styles].filter((x) => x !== "YYYY");
  if (monthStyles.length > 1) issues.push(`Mixed date formats (${monthStyles.join(", ")}) — pick one, e.g. "Jan 2024".`);
  if (experienceText) {
    const starts = [...experienceText.matchAll(RANGE_RE)].map((m) => parseDate(m[1])?.ym).filter((x): x is number => x != null);
    for (let i = 1; i < starts.length; i++) if (starts[i] > starts[i - 1]) { issues.push("Experience isn't in reverse-chronological order — list the most recent role first."); break; }
  }
  return { ranges, issues: [...new Set(issues)].slice(0, 8) };
}

/** Bullets are easiest to scan at 8–30 words (one or two lines). */
export const BULLET_MIN_WORDS = 5;
export const BULLET_MAX_WORDS = 30;

export function analyzeResume(text: string, targetRole: string | null): RuleReport {
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;
  const bullets = getBullets(text);
  // A bullet is quantified if it contains a number other than a bare year (e.g. "2024").
  const quantified = bullets.filter((b) => (b.replace(/\b(19|20)\d{2}\b/g, "").match(/\d/) ?? []).length > 0);
  const actionStart = bullets.filter((b) => ACTION_VERBS.includes(b.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "")));
  const weak = WEAK_PHRASES.map((p) => ({ phrase: p, count: (lower.match(new RegExp(`\\b${escape(p)}\\b`, "g")) ?? []).length }))
    .filter((w) => w.count > 0);
  // "helped" is counted within "helped with" too; drop the overlap
  const helpedWith = weak.find((w) => w.phrase === "helped with")?.count ?? 0;
  const weakClean = weak.map((w) => (w.phrase === "helped" ? { ...w, count: w.count - helpedWith } : w)).filter((w) => w.count > 0);

  const sectionsText = splitSections(text);
  const sections = Object.fromEntries(
    (Object.keys(SECTION_PATTERNS) as SectionId[]).map((id) => [id, SECTION_PATTERNS[id].test(text)]),
  ) as Record<SectionId, boolean>;

  const contact = {
    email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text),
    phone: /(\+?\d[\d\s().-]{8,}\d)/.test(text),
    linkedin: /linkedin\.com\/in\//i.test(text) || /\blinkedin\b/i.test(text),
    github: /github\.com\//i.test(text) || /\bgithub\b/i.test(text),
  };

  const skillsFound = findSkills(text);
  // A skill is "supported" if it appears outside the skills section (in projects/experience).
  const evidenceText = (sectionsText.projects ?? "") + "\n" + (sectionsText.experience ?? "");
  const unsupportedSkills = sectionsText.skills && evidenceText.trim()
    ? findSkills(sectionsText.skills).filter((s) => {
        if (KNOWLEDGE_AREAS.has(s)) return false; // studied, not "used in a project"
        const evidence = [s, ...(IMPLIED_BY[s] ?? [])];
        return !evidence.some((name) => (SKILLS[name] ?? []).some((a) => wordRe(a).test(evidenceText)));
      })
    : [];

  const roleKw = ROLE_KEYWORDS[targetRole ?? "swe"] ?? ROLE_KEYWORDS.swe;
  const kwAliases: Record<string, string[]> = {
    "Data Structures": ["data structures", "dsa"], Algorithms: ["algorithms", "dsa"], OOP: ["oop", "object-oriented", "object oriented"],
    Testing: ["test", "testing", "jest", "pytest", "junit", "unit tests"], Databases: ["database", "sql", "mongodb", "postgres"],
    Caching: ["cache", "caching", "redis"], Authentication: ["auth", "authentication", "jwt", "oauth"],
    Scalability: ["scalab", "scale", "load balanc"], Accessibility: ["accessibility", "a11y", "wcag"],
    Performance: ["performance", "latency", "optimiz", "optimis"], Projects: ["project"],
  };
  const missingKeywords = roleKw.filter((k) => {
    const aliases = kwAliases[k] ?? SKILLS[k] ?? [k.toLowerCase()];
    return !aliases.some((a) => lower.includes(a.toLowerCase()));
  });

  const nb = Math.max(bullets.length, 1);
  const wc = (b: string) => b.split(/\s+/).filter(Boolean).length;
  const longBullets = bullets.filter((b) => wc(b) > BULLET_MAX_WORDS);
  const shortBullets = bullets.filter((b) => wc(b) < BULLET_MIN_WORDS);
  const dates = checkDates(text, sectionsText.experience);
  const clip = (b: string) => (b.length > 70 ? b.slice(0, 70) + "…" : b);
  const checks: Check[] = [
    {
      id: "sections", label: "Standard sections", weight: 15,
      earned: Math.round(15 * (["education", "experience", "projects", "skills"] as SectionId[]).filter((s) => sections[s] || (s === "experience" && sections.projects)).length / 4),
      detail: `Found: ${(Object.keys(sections) as SectionId[]).filter((s) => sections[s]).join(", ") || "none"}.`,
      tip: "Use clear headings (Education, Experience, Projects, Skills) so ATS parsers can map your content.",
    },
    {
      id: "contact", label: "Contact details", weight: 10,
      earned: (contact.email ? 4 : 0) + (contact.phone ? 2 : 0) + (contact.linkedin ? 2 : 0) + (contact.github ? 2 : 0),
      detail: `Email ${contact.email ? "✓" : "✗"} · Phone ${contact.phone ? "✓" : "✗"} · LinkedIn ${contact.linkedin ? "✓" : "✗"} · GitHub ${contact.github ? "✓" : "✗"}`,
      tip: "SDE resumes should include an email, phone, LinkedIn and GitHub.",
    },
    {
      id: "length", label: "Length", weight: 10,
      earned: words >= 300 && words <= 900 ? 10 : words >= 200 && words <= 1200 ? 6 : 2,
      detail: `${words} words.`,
      tip: "For students and early-career engineers, 350–800 words (one page) is typical.",
    },
    {
      id: "bullets", label: "Bullet-point structure", weight: 10,
      earned: bullets.length >= 8 ? 10 : bullets.length >= 4 ? 6 : bullets.length > 0 ? 3 : 0,
      detail: `${bullets.length} bullet points detected.`,
      tip: "Describe experience and projects in concise bullets rather than paragraphs.",
    },
    {
      id: "action", label: "Action verbs", weight: 15,
      earned: Math.round(15 * clamp(actionStart.length / nb / 0.7)),
      detail: `${actionStart.length} of ${bullets.length} bullets start with a strong action verb.`,
      tip: "Start each bullet with what you did: Built, Designed, Reduced, Implemented…",
    },
    {
      id: "quantified", label: "Quantified impact", weight: 15,
      earned: Math.round(15 * clamp(quantified.length / nb / 0.4)),
      detail: `${quantified.length} of ${bullets.length} bullets include a measurable result.`,
      tip: "Add real numbers you can defend (latency, users, accuracy, time saved). Never invent them.",
    },
    {
      id: "weak", label: "Weak phrasing", weight: 10,
      earned: Math.max(0, 10 - 2 * weakClean.reduce((s, w) => s + w.count, 0)),
      detail: weakClean.length ? weakClean.map((w) => `"${w.phrase}" ×${w.count}`).join(", ") : "No weak phrases found.",
      tip: "Replace passive phrases like “responsible for” or “worked on” with what you specifically did.",
    },
    {
      id: "keywords", label: "Role keywords", weight: 10,
      earned: Math.round(10 * (roleKw.length - missingKeywords.length) / roleKw.length),
      detail: missingKeywords.length ? `Not found: ${missingKeywords.join(", ")}.` : "All core keywords for your target role are present.",
      tip: "Only add keywords you genuinely have experience with — interviewers will ask about them.",
    },
    {
      id: "bullet_length", label: "Bullet length", weight: 5,
      earned: bullets.length ? Math.round(5 * clamp((bullets.length - longBullets.length - shortBullets.length) / bullets.length / 0.85)) : 0,
      detail: !bullets.length ? "No bullets found." : longBullets.length + shortBullets.length === 0
        ? `All ${bullets.length} bullets are ${BULLET_MIN_WORDS}–${BULLET_MAX_WORDS} words.`
        : [longBullets.length ? `${longBullets.length} too long (over ${BULLET_MAX_WORDS} words), e.g. "${clip(longBullets[0])}"` : "", shortBullets.length ? `${shortBullets.length} too short (under ${BULLET_MIN_WORDS} words), e.g. "${clip(shortBullets[0])}"` : ""].filter(Boolean).join("; ") + ".",
      tip: "Keep each bullet to one or two lines: action, what you built, and the result.",
    },
    {
      id: "dates", label: "Dates", weight: 5,
      earned: dates.ranges === 0 ? 1 : Math.max(0, 5 - 2 * dates.issues.length),
      detail: dates.ranges === 0 ? "No date ranges found for your experience or education." : dates.issues.length ? dates.issues.join(" ") : `${dates.ranges} date range${dates.ranges === 1 ? "" : "s"}, consistent and in order.`,
      tip: "Use one format (e.g. \"Jan 2024 – Present\"), newest role first, and mark future dates as Expected.",
    },
    {
      id: "evidence", label: "Skills backed by evidence", weight: 5,
      earned: unsupportedSkills.length === 0 ? 5 : unsupportedSkills.length <= 2 ? 3 : 1,
      detail: unsupportedSkills.length ? `Listed in Skills but not used in any project/experience: ${unsupportedSkills.join(", ")}.` : "Every listed skill appears in a project or experience entry (or no separate Skills section found).",
      tip: "Interviewers probe listed skills. Show where you used each one, or be ready to discuss it.",
    },
  ];

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const score = Math.round((100 * checks.reduce((s, c) => s + c.earned, 0)) / total);
  return {
    score,
    checks,
    stats: {
      words, bullets: bullets.length, quantifiedBullets: quantified.length, actionVerbBullets: actionStart.length,
      weakPhrases: weakClean, sections, contact, skillsFound, unsupportedSkills, missingKeywords,
      longBullets: longBullets.map(clip), shortBullets: shortBullets.map(clip), dateIssues: dates.issues,
    },
  };
}
