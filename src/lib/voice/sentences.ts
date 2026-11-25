/**
 * Splits an interviewer message into speakable chunks so text-to-speech can start on the first sentence
 * while the rest is still being prepared. Strips markdown and replaces code blocks with a short phrase.
 */
export function speakable(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " (see the code shown on screen) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\[Hint[^\]]*\]\s*/, "Hint: ")
    .replace(/[*_#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitSentences(text: string, minChars = 40, maxChars = 280): string[] {
  const clean = speakable(text);
  if (!clean) return [];
  // Split after . ! ? (and the closing quote/bracket) followed by a space, but not inside "e.g." / "i.e." / numbers like 3.5.
  const parts = clean.split(/(?<=(?<!\b(?:e\.g|i\.e|vs|etc|Mr|Ms|Dr))[.!?]["')\]]?)\s+(?=[A-Z0-9"'(])/);
  const out: string[] = [];
  for (const p of parts) {
    const s = p.trim();
    if (!s) continue;
    // Merge very short fragments into the previous chunk so the voice doesn't sound choppy.
    if (out.length && (out[out.length - 1].length < minChars || s.length < 12) && out[out.length - 1].length + s.length + 1 <= maxChars) out[out.length - 1] += " " + s;
    else out.push(s);
  }
  // Hard-wrap anything still too long at a comma or space.
  return out.flatMap((s) => {
    const chunks: string[] = [];
    let rest = s;
    while (rest.length > maxChars) {
      const cut = Math.max(rest.lastIndexOf(", ", maxChars), rest.lastIndexOf(" ", maxChars));
      const at = cut > maxChars / 2 ? cut + 1 : maxChars;
      chunks.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) chunks.push(rest);
    return chunks;
  });
}
