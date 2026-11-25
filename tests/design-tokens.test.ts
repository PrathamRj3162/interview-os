import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { THEMES, TEXT_PAIRS, contrastRatio } from "@/lib/design/tokens";

describe("design tokens", () => {
  for (const [theme, palette] of Object.entries(THEMES)) {
    it(`${theme}: every text pair meets WCAG AA`, () => {
      for (const [fg, bg] of TEXT_PAIRS) {
        const ratio = contrastRatio(palette[fg as keyof typeof palette], palette[bg as keyof typeof palette]);
        expect(ratio, `${fg} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
  it("TS mirror matches globals.css", () => {
    const css = readFileSync("src/app/globals.css", "utf8").toLowerCase();
    for (const v of Object.values(THEMES.neon)) expect(css).toContain(v);
  });
});
