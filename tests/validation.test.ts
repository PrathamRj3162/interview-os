import { describe, expect, it } from "vitest";
import { profileSchema, profileFromFormData, safeNext, signupSchema } from "@/lib/validation/profile";

function fd(entries: [string, string][]) {
  const f = new FormData();
  entries.forEach(([k, v]) => f.append(k, v));
  return f;
}

const valid: [string, string][] = [
  ["full_name", "Asha Rao"], ["target_role", "sde1"], ["experience_level", "student"],
  ["company_track", "product"], ["target_companies", "Google"], ["target_companies", "Amazon"],
  ["preferred_language", "cpp"], ["daily_hours", "2.5"], ["deadline", ""],
  ["dsa_level", "2"], ["system_design_level", "1"], ["learning_style", "mixed"],
];

describe("profileSchema", () => {
  it("accepts a valid onboarding form", () => {
    const r = profileSchema.safeParse(profileFromFormData(fd(valid)));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.target_companies).toEqual(["Google", "Amazon"]);
      expect(r.data.daily_hours).toBe(2.5);
      expect(r.data.deadline).toBeNull();
    }
  });
  it("rejects unknown companies and roles", () => {
    const bad = valid.map(([k, v]) => [k, k === "target_role" ? "ceo" : v] as [string, string]);
    bad.push(["target_companies", "EvilCorp"]);
    expect(profileSchema.safeParse(profileFromFormData(fd(bad))).success).toBe(false);
  });
  it("rejects past deadlines and out-of-range hours", () => {
    const bad = valid.map(([k, v]) => [k, k === "deadline" ? "2000-01-01" : k === "daily_hours" ? "40" : v] as [string, string]);
    const r = profileSchema.safeParse(profileFromFormData(fd(bad)));
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("deadline");
      expect(paths).toContain("daily_hours");
    }
  });
});

describe("signupSchema", () => {
  it("enforces password length and email format", () => {
    expect(signupSchema.safeParse({ email: "x", password: "short", full_name: "A" }).success).toBe(false);
    expect(signupSchema.safeParse({ email: "a@b.co", password: "longenough", full_name: "A" }).success).toBe(true);
  });
});

describe("safeNext", () => {
  it("allows same-site paths only", () => {
    expect(safeNext("/dsa/arrays")).toBe("/dsa/arrays");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
});
