import { CHARACTERS, PERSONAS, type PersonaId } from "@/lib/interview/config";
import { cn } from "@/lib/utils";

/** Original, generated interviewer avatar (geometric SVG — no photos, no likeness of real people). */
export function InterviewerAvatar({ persona, size = 40, className }: { persona: PersonaId | string; size?: number; className?: string }) {
  const c = CHARACTERS[persona as PersonaId] ?? CHARACTERS.professional;
  const { bg, fg, hair, glasses } = c.look;
  const hairPath = [
    "M22 40 Q50 8 78 40 Q78 26 50 20 Q22 26 22 40Z",            // short crop
    "M20 46 Q18 14 50 14 Q82 14 80 46 Q72 28 50 26 Q28 28 20 46Z", // side part
    "M18 70 Q12 16 50 14 Q88 16 82 70 Q80 34 50 28 Q20 34 18 70Z", // long
    "M24 38 Q30 10 50 18 Q70 8 76 38 Q66 24 50 30 Q34 24 24 38Z",  // tuft
  ][hair];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={cn("shrink-0 rounded-full", className)} role="img" aria-label={`${c.first}, ${PERSONAS[persona as PersonaId]?.name ?? "Interviewer"}`}>
      <circle cx="50" cy="50" r="50" fill={bg} />
      <circle cx="50" cy="56" r="26" fill="#fde7d3" />
      <path d={hairPath} fill={fg} />
      <circle cx="41" cy="55" r="3" fill={fg} />
      <circle cx="59" cy="55" r="3" fill={fg} />
      {glasses && <g fill="none" stroke={fg} strokeWidth="2.2"><circle cx="41" cy="55" r="7" /><circle cx="59" cy="55" r="7" /><path d="M48 55h4" /></g>}
      <path d="M42 67 Q50 73 58 67" fill="none" stroke={fg} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 100 Q50 80 74 100Z" fill={fg} opacity="0.85" />
    </svg>
  );
}
