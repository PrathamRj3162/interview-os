import { describe, expect, it } from "vitest";
import { analyzeResume, findSkills, getBullets, splitSections } from "@/lib/resume/rules";

const STRONG = `Asha Rao
asha@example.com | +91 98765 43210 | linkedin.com/in/asha | github.com/asha

EDUCATION
B.Tech Computer Science, XYZ University, 2026. CGPA 8.7

EXPERIENCE
Software Engineering Intern, Acme Corp
• Built a Redis caching layer for the catalog API in Node.js, reducing p95 latency from 420ms to 90ms
• Implemented JWT authentication with refresh tokens for 3 internal services
• Wrote 120 unit tests with Jest, raising coverage from 40% to 85%

PROJECTS
Pneumonia Detection | Python, PyTorch
• Trained a DenseNet121 transfer-learning model on 5,800 chest X-rays reaching 92% recall
• Deployed the model with FastAPI and Docker on a free cloud tier
Realtime Chat | React, Node.js, PostgreSQL
• Designed a PostgreSQL schema and REST APIs for rooms and messages
• Optimized message fetch with cursor pagination, cutting payload size by 60%
• Developed a React client with optimistic updates

SKILLS
C++, Python, JavaScript, React, Node.js, PostgreSQL, Redis, Docker, Kubernetes, Git, SQL, Data Structures, Algorithms, OOP, System Design
`;

const WEAK = `John
EDUCATION
Some college
I was responsible for various tasks and worked on the website. I helped with testing etc.
SKILLS
Java, Kubernetes, Kafka`;

describe("resume rules", () => {
  it("detects sections, skills and bullets", () => {
    expect(Object.keys(splitSections(STRONG))).toEqual(expect.arrayContaining(["education", "experience", "projects", "skills"]));
    expect(getBullets(STRONG).length).toBe(8);
    expect(findSkills(STRONG)).toEqual(expect.arrayContaining(["Python", "React", "Redis", "Docker", "PyTorch"]));
  });

  it("scores a strong resume well and explains each check", () => {
    const r = analyzeResume(STRONG, "backend");
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.checks.every((c) => c.earned <= c.weight && c.earned >= 0)).toBe(true);
    expect(r.stats.contact).toEqual({ email: true, phone: true, linkedin: true, github: true });
    expect(r.stats.quantifiedBullets).toBeGreaterThanOrEqual(5);
    // Kubernetes is listed but never used in a project or experience entry
    expect(r.stats.unsupportedSkills).toContain("Kubernetes");
    expect(r.stats.unsupportedSkills).not.toContain("Redis");
  });

  it("flags weak phrasing and a thin resume", () => {
    const r = analyzeResume(WEAK, "sde1");
    expect(r.score).toBeLessThan(40);
    const phrases = r.stats.weakPhrases.map((w) => w.phrase);
    expect(phrases).toEqual(expect.arrayContaining(["responsible for", "worked on", "helped with", "various"]));
    expect(phrases).not.toContain("helped"); // overlap with "helped with" removed
    expect(r.stats.missingKeywords.length).toBeGreaterThan(3);
  });

  it("does not treat 'Java' inside 'JavaScript' as Java", () => {
    expect(findSkills("Built with JavaScript")).not.toContain("Java");
  });
});

import { checkDates, analyzeResume as analyze2 } from "@/lib/resume/rules";
describe("date checks", () => {
  const now = new Date("2026-11-25");
  it("accepts consistent, ordered ranges with Present", () => {
    const exp = "SDE Intern, Acme — Jun 2025 – Present\nIntern, Beta — Jan 2024 – Mar 2024";
    expect(checkDates(exp, exp, now)).toEqual({ ranges: 2, issues: [] });
  });
  it("flags mixed formats, reversed ranges, future ends, open ranges and order", () => {
    const exp = "Beta — 01/2023 – 05/2023\nAcme — Jun 2025 – Present";
    const text = `${exp}\nB.Tech, XYZ — Aug 2021 – Jul 2027\nHackathon — Mar 2024 – Jan 2024\nClub — Feb 2022 –\n`;
    const issues = checkDates(text, exp, now).issues.join(" | ");
    expect(issues).toMatch(/Mixed date formats/);
    expect(issues).toMatch(/Mar 2024 – Jan 2024" ends before it starts/);
    expect(issues).toMatch(/Jul 2027" ends in the future/);
    expect(issues).toMatch(/Feb 2022 –" has no end date/);
    expect(issues).toMatch(/reverse-chronological/);
    expect(checkDates("B.Tech — Aug 2023 – Expected May 2027", undefined, now).issues).toEqual([]);
  });
  it("bullet length check lists long and short bullets", () => {
    const long = "Built " + Array.from({ length: 40 }, (_, i) => `thing${i}`).join(" ");
    const r = analyze2(`Experience\n- ${long}\n- Did it\n- Built a REST API serving 10k users with Redis caching\n- Reduced p95 latency by 40% using batching`, "backend");
    const c = r.checks.find((x) => x.id === "bullet_length")!;
    expect(r.stats.longBullets).toHaveLength(1);
    expect(r.stats.shortBullets).toEqual(["Did it"]);
    expect(c.earned).toBeLessThan(5);
    expect(c.detail).toMatch(/1 too long .*1 too short/);
  });
});
