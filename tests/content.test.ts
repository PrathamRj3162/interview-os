import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { makeGate, isAdminEmail, isAdminUser } from "@/lib/content/gate";
import { allContent } from "@/lib/content/registry";
import type { ContentMeta } from "@/lib/content/types";

const item = (over: Partial<ContentMeta> = {}): ContentMeta => ({ id: "design-case:x", version: 1, type: "design-case", tags: [], status: "draft", ...over });

describe("content gate", () => {
  it("only live items are visible to users; admins can open everything, non-live marked preview", () => {
    const g = makeGate([], [], false), a = makeGate([], [], true);
    expect(g.visible(item({ status: "live" }))).toBe(true);
    expect(g.visible(item({ status: "reviewed" }))).toBe(false);
    expect(a.visible(item({ status: "reviewed" }))).toBe(true);
    expect(a.preview(item({ status: "reviewed" }))).toBe(true);
    expect(a.visible(item({ status: "draft" }))).toBe(true);
    expect(a.preview(item({ status: "draft" }))).toBe(true);
    expect(a.preview(item({ status: "live" }))).toBe(false);
  });
  it("a review overrides the shipped status only for the same version", () => {
    const g = makeGate([{ item_id: "design-case:x", version: 1, status: "live" }], [], false);
    expect(g.visible(item())).toBe(true);
    expect(g.visible(item({ version: 2 }))).toBe(false); // edited → needs review again
  });
  it("items hidden by reports disappear for users until resolved", () => {
    const g = makeGate([], [{ item_id: "design-case:x", version: 1 }], false);
    expect(g.visible(item({ status: "live" }))).toBe(false);
    expect(g.hidden(item({ status: "live" }))).toBe(true);
    expect(g.visible(item({ status: "live", version: 2 }))).toBe(true);
  });
  it("an admin must have a confirmed email", () => {
    vi.stubEnv("ADMIN_EMAILS", "a@x.com");
    expect(isAdminUser({ email: "a@x.com", email_confirmed_at: "2026-01-01" })).toBe(true);
    expect(isAdminUser({ email: "a@x.com", email_confirmed_at: null })).toBe(false);
    vi.unstubAllEnvs();
  });
  it("admin emails come only from ADMIN_EMAILS, case-insensitive", () => {
    vi.stubEnv("ADMIN_EMAILS", " A@x.com ,b@y.com");
    expect(isAdminEmail("a@X.com")).toBe(true);
    expect(isAdminEmail("c@x.com")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isAdminEmail("a@x.com")).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe("content registry", () => {
  const items = allContent();
  it("ids are unique and typed, versions positive", () => {
    expect(new Set(items.map((i) => i.meta.id)).size).toBe(items.length);
    for (const i of items) { expect(i.meta.id.startsWith(`${i.meta.type}:`)).toBe(true); expect(i.meta.version).toBeGreaterThanOrEqual(1); }
  });
  it("design library: 45 cases (20 HLD + 25 LLD), every one passing its checks, new ones shipped as draft", () => {
    const cases = items.filter((i) => i.meta.type === "design-case");
    expect(cases).toHaveLength(45);
    for (const i of cases) for (const c of i.checks) expect(c.ok, `${i.meta.id}: ${c.name} ${c.detail ?? ""}`).toBe(true);
    expect(cases.filter((i) => i.meta.status === "draft")).toHaveLength(33);
  });
  it("every item, draft or live, passes its automated checks (same checks /review shows)", () => {
    expect(items.filter((i) => i.meta.type === "primer")).toHaveLength(25);
    for (const i of items) for (const c of i.checks) expect(c.ok, `${i.meta.id}: ${c.name} ${c.detail ?? ""}`).toBe(true);
  });
});

import { DESIGN_QUESTIONS, verifyKeyPoints } from "@/lib/learn/design-questions";

describe("design fundamentals drill", () => {
  const q = DESIGN_QUESTIONS.find((x) => x.slug === "add-cache")!;
  const answer = "I would use cache-aside: read Redis first and on a miss read the database, then set a TTL of five minutes.";
  it("credits a key point only with a real quote of 3+ words from that answer; score computed in code", () => {
    const v = verifyKeyPoints(q, answer, [
      { id: "pattern", quote: "read Redis first and on a miss read the database" },
      { id: "ttl", quote: "set a TTL" },                       // real but only 3 words → ok
      { id: "stampede", quote: "use request coalescing for hot keys" }, // never said → dropped
      { id: "pattern", quote: "read Redis first" },             // duplicate id → dropped
      { id: "nonsense", quote: "read Redis first and on" },     // unknown key point → dropped
    ]);
    expect(v.covered.map((c) => c.id)).toEqual(["pattern", "ttl"]);
    expect(v.missed.map((m) => m.id)).toEqual(["invalidation", "stampede", "stale"]);
    expect(v.dropped).toBe(3);
  });
  it("20 scenario questions, all passing their checks, shipped as draft", () => {
    expect(DESIGN_QUESTIONS).toHaveLength(20);
    const qs = allContent().filter((i) => i.meta.type === "design-question");
    expect(qs).toHaveLength(20);
    expect(qs.every((i) => i.meta.status === "draft" && i.checks.every((c) => c.ok))).toBe(true);
  });
});
