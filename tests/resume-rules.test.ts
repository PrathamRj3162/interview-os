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
