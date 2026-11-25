import { z } from "zod";
import { COMPANY_STYLES } from "@/lib/interview/companies";

export const ROLES = {
  sde1: "SDE-1",
  sde_intern: "SDE Intern",
  backend: "Backend Developer",
  frontend: "Frontend Developer",
  fullstack: "Full-Stack Developer",
  swe: "Software Engineer (general)",
} as const;

export const EXPERIENCE = {
  beginner: "Complete beginner",
  student: "College student / fresher",
  intern_applicant: "Internship applicant",
  entry: "Entry-level engineer (0–2 yrs)",
  experienced: "Experienced engineer (2+ yrs)",
} as const;

export const COMPANY_TRACKS = {
  product: "Product-based companies",
  service: "Service-based companies",
  startup: "Startups",
  general: "General preparation",
} as const;

export const LANGUAGES = {
  cpp: "C++",
  python: "Python",
  java: "Java",
  javascript: "JavaScript",
} as const;

export const LEARNING_STYLES = {
  reading: "Read concepts first",
  practice: "Learn by solving",
  mixed: "Mix of both",
} as const;

/** Target companies (style practice only) — one list, from the company style map. */
export const COMPANIES = COMPANY_STYLES.map((c) => c.name) as [string, ...string[]];

export const LEVEL_LABELS = ["", "None yet", "Basics", "Comfortable", "Strong", "Expert"] as const;

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

export const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name").max(120),
  target_role: z.enum(keys(ROLES)),
  experience_level: z.enum(keys(EXPERIENCE)),
  company_track: z.enum(keys(COMPANY_TRACKS)),
  target_companies: z.array(z.enum(COMPANIES)).max(COMPANIES.length),
  preferred_language: z.enum(keys(LANGUAGES)),
  daily_hours: z.coerce.number().min(0.5, "At least 0.5 hours").max(16, "At most 16 hours"),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
    .refine((d) => new Date(d + "T23:59:59") >= new Date(new Date().toDateString()), "Deadline must be today or later")
    .nullable(),
  dsa_level: z.coerce.number().int().min(1).max(5),
  system_design_level: z.coerce.number().int().min(1).max(5),
  learning_style: z.enum(keys(LEARNING_STYLES)),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Converts FormData into the shape profileSchema expects. */
export function profileFromFormData(fd: FormData): unknown {
  const deadline = String(fd.get("deadline") ?? "").trim();
  return {
    full_name: fd.get("full_name"),
    target_role: fd.get("target_role"),
    experience_level: fd.get("experience_level"),
    company_track: fd.get("company_track"),
    target_companies: fd.getAll("target_companies").map(String),
    preferred_language: fd.get("preferred_language"),
    daily_hours: fd.get("daily_hours"),
    deadline: deadline === "" ? null : deadline,
    dsa_level: fd.get("dsa_level"),
    system_design_level: fd.get("system_design_level"),
    learning_style: fd.get("learning_style"),
  };
}

export const credentialsSchema = z.object({
  email: z.email("Enter a valid email").max(254),
  password: z.string().min(8, "Use at least 8 characters").max(72, "At most 72 characters"),
});

export const signupSchema = credentialsSchema.extend({
  full_name: z.string().trim().min(1, "Enter your name").max(120),
});

/** Only allow same-site relative redirects (prevents open-redirect after login). */
export function safeNext(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
