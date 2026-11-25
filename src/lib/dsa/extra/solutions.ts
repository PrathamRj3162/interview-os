import type { Solution } from "../solutions";
import { EASY_A_SOL } from "./easy-a.sol";
import { MEDIUM_B_SOL } from "./medium-b.sol";
import { MEDIUM_C_SOL } from "./medium-c.sol";
import { HARD_D_SOL } from "./hard-d.sol";

export const EXTRA_SOLUTIONS: Record<string, Solution> = { ...EASY_A_SOL, ...MEDIUM_B_SOL, ...MEDIUM_C_SOL, ...HARD_D_SOL };
