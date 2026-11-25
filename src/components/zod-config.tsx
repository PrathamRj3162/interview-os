"use client";

import { z } from "zod";

// zod v4 probes `new Function` to enable its JIT parser. Our CSP forbids eval, so opt out up front
// (it would fall back anyway, but the probe causes a CSP violation report on every page).
z.config({ jitless: true });

export function ZodConfig() {
  return null;
}
