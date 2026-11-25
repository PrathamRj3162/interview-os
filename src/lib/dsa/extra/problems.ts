import type { Problem } from "../types";
import { EASY_A } from "./easy-a";
import { MEDIUM_B } from "./medium-b";
import { MEDIUM_C } from "./medium-c";
import { HARD_D } from "./hard-d";

/** Extra problem batches (statements only — client-safe). Solutions live in ./solutions (server-side). */
export const EXTRA_PROBLEMS: Problem[] = [...EASY_A, ...MEDIUM_B, ...MEDIUM_C, ...HARD_D];
