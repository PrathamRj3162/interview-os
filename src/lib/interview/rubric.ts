/**
 * Anchored 1–4 rubric. Each category's score has a written meaning, so a "3" means the same thing in
 * every report, and the evaluator is told exactly what each level requires.
 *   1 = not demonstrated / wrong · 2 = partial, needed prompting · 3 = solid, meets the bar · 4 = strong, unprompted
 * A 4-point scale (no middle option) forces a lean to one side of the bar.
 */
import type { KindId } from "./config";

export type Anchors = [string, string, string, string];

export const ANCHORS: Record<string, Anchors> = {
  // Machine coding (completeness and extensibility are scored from tests and the diff; see lib/mc/scoring.ts)
  completeness: [
    "Most core requirements don't work (under 40% of the core tests pass) or the code doesn't compile.",
    "Some core requirements work (40–74% of the core tests).",
    "Nearly all core requirements work (75–99% of the core tests).",
    "Every core requirement works (all core tests pass).",
  ],
  modularity: [
    "One or two god classes mixing parsing, rules and state.",
    "Some separation, but core logic is tangled with I/O or spread inconsistently.",
    "Clear classes with single responsibilities; I/O separated from the domain.",
    "Clean domain model with interfaces where variation is expected; each class easy to explain.",
  ],
  validation: [
    "Bad input crashes the program or corrupts state.",
    "Some checks, inconsistently applied.",
    "Inputs validated at the boundaries with clear errors.",
    "Validation and error handling are deliberate and consistent everywhere, including state-dependent errors.",
  ],
  concurrency: [
    "Shared mutable state with no protection, and no awareness of the problem.",
    "Aware of the risk but the protection is missing or wrong.",
    "Critical sections protected (locks/atomics/concurrent collections) with a sound explanation.",
    "Correct, minimal synchronisation with a clear argument about races and contention.",
  ],
  readability: [
    "Hard to follow: unclear names, very long methods.",
    "Readable in parts; some long methods or unclear names.",
    "Clear names and reasonably small methods throughout.",
    "Reads like documentation: consistent, small, well-named pieces.",
  ],
  testability: [
    "Logic can only be exercised through the console loop.",
    "Some logic is separable, but key rules depend on I/O or globals.",
    "Domain logic is independent of I/O and could be unit tested directly.",
    "Designed for tests: pure domain services, injectable dependencies (clocks, strategies).",
  ],
  // DSA
  understanding: [
    "Started without understanding the problem, or misread it.",
    "Understood the basic task but missed constraints or input details until prompted.",
    "Restated the problem and asked about the key constraints/inputs before designing.",
    "Clarified constraints, edge inputs and expected output precisely before any design, unprompted.",
  ],
  approach: [
    "No workable approach.",
    "Reached a working approach only with heavy prompting, or stopped at brute force.",
    "Gave a brute force, then a justified optimisation with suitable data structures.",
    "Moved quickly to the optimal approach, compared alternatives and justified the choice clearly.",
  ],
  correctness: [
    "Solution or explanations are incorrect.",
    "Partially correct: works on simple cases but has significant errors.",
    "Correct, with at most minor issues.",
    "Fully correct and robust, including the tricky cases.",
  ],
  edge_cases: [
    "Did not consider edge cases or test the solution.",
    "Mentioned an edge case or two only when asked; little testing.",
    "Identified the main edge cases and dry-ran at least one example.",
    "Systematically covered edge cases and dry-ran the code, catching issues themselves.",
  ],
  complexity: [
    "Could not state time or space complexity, or stated it wrongly.",
    "Stated complexity partly correctly, or without reasoning.",
    "Correct time and space complexity with reasoning.",
    "Correct complexity with clear reasoning, and discussed how it compares with alternatives.",
  ],
  code_quality: [
    "Code is hard to follow or largely missing.",
    "Works but with unclear names, duplication or awkward structure.",
    "Readable, sensibly named, reasonably idiomatic code.",
    "Clean, idiomatic, well-structured code an interviewer would happily merge.",
  ],
  communication: [
    "Hard to follow; long silences or unclear explanations.",
    "Explained some steps, but often unclear or only when asked.",
    "Thought aloud clearly and kept the interviewer in the loop.",
    "Consistently clear, structured and concise; drove the conversation.",
  ],
  // System design
  requirements: [
    "Jumped into design without clarifying scope.",
    "Clarified some requirements, missing key functional or non-functional ones.",
    "Clarified functional and key non-functional requirements before designing.",
    "Scoped precisely, prioritised requirements and stated assumptions explicitly.",
  ],
  estimation: [
    "No estimates, or estimates unrelated to the design.",
    "Rough estimates with errors, or not used to drive decisions.",
    "Reasonable traffic/storage estimates that informed the design.",
    "Quick, accurate estimates that clearly drove specific design decisions.",
  ],
  architecture: [
    "No coherent architecture.",
    "Some components identified, but gaps in APIs, data model or data flow.",
    "Coherent components, APIs and data model that meet the requirements.",
    "Clean, well-justified architecture with clear data flow and sensible boundaries.",
  ],
  scaling: [
    "Did not address scale or failure.",
    "Mentioned scaling techniques generically, without fitting them to the bottlenecks.",
    "Identified bottlenecks and applied fitting caching/sharding/replication/queues.",
    "Deep, specific handling of scale and failure modes with clear trade-offs.",
  ],
  tradeoffs: [
    "No alternatives considered.",
    "Named alternatives but didn't compare them meaningfully.",
    "Compared alternatives and justified the choices made.",
    "Weighed trade-offs crisply against the requirements and revisited choices when constraints changed.",
  ],
  modeling: [
    "No sensible entities or classes.",
    "Some entities identified, with unclear responsibilities or relationships.",
    "Sensible classes, interfaces and relationships covering the use cases.",
    "Clean model with clear responsibilities that maps naturally to the requirements.",
  ],
  principles: [
    "Design principles not applied.",
    "Mentioned principles or patterns without applying them correctly.",
    "Applied SOLID and suitable patterns where they help.",
    "Applied principles and patterns judiciously and explained why each fits.",
  ],
  extensibility: [
    "Design breaks with any change.",
    "Some change is possible, but common extensions need rewrites.",
    "Design accommodates likely changes with limited modification.",
    "Showed, with examples, how the design absorbs new requirements cleanly.",
  ],
  // Projects / resume
  decisions: [
    "Could not explain why technologies were chosen.",
    "Gave generic reasons without comparing alternatives.",
    "Justified key choices against realistic alternatives.",
    "Justified choices with specific constraints, measurements and trade-offs.",
  ],
  depth: [
    "Answers stayed at buzzword level.",
    "Some concrete details, but shallow when probed.",
    "Concrete, accurate details of how things work and were built.",
    "Deep, precise understanding that held up under follow-up questions.",
  ],
  ownership: [
    "Unclear what they personally did or decided.",
    "Some personal contribution, mixed with 'we' and vague ownership.",
    "Clear about their own actions and decisions.",
    "Clear personal ownership of significant decisions and their outcomes.",
  ],
  reflection: [
    "No acknowledgement of weaknesses or improvements.",
    "Acknowledged issues only when pushed, or vaguely.",
    "Honest about limitations with credible improvements.",
    "Insightful self-critique with concrete, prioritised improvements.",
  ],
  claims: [
    "Could not back up resume claims.",
    "Backed some claims, but key ones stayed vague or unsupported.",
    "Backed the main claims with specifics and evidence.",
    "Every probed claim was supported with concrete details, numbers or examples.",
  ],
  // Fundamentals
  application: [
    "Could not connect concepts to real systems.",
    "Generic examples only.",
    "Connected concepts to realistic systems or scenarios.",
    "Rich, specific real-world application, including trade-offs.",
  ],
  vocabulary: [
    "Imprecise or incorrect terminology.",
    "Mostly correct terms, used loosely.",
    "Precise, correct terminology.",
    "Precise terminology used naturally to explain nuances.",
  ],
  // Behavioral / HR
  structure: [
    "No clear structure.",
    "Some STAR elements present, but Result or Action unclear.",
    "Situation, Task, Action and Result all clearly present.",
    "Tight STAR answers with measurable results and reflection.",
  ],
  specificity: [
    "Hypothetical or generic answers.",
    "Real examples, but light on concrete detail.",
    "Real, concrete examples with relevant detail.",
    "Vivid, specific examples with details that are easy to verify.",
  ],
  results: [
    "No outcomes described.",
    "Outcomes vague or unmeasured.",
    "Clear outcomes and some reflection on what was learned.",
    "Measurable outcomes and genuine lessons applied later.",
  ],
  motivation: [
    "No clear reason for the role or company.",
    "Generic motivation.",
    "Clear, genuine reasons tied to the role.",
    "Specific, well-researched motivation tied to their goals.",
  ],
  self_awareness: [
    "No credible strengths or weaknesses.",
    "Clichéd strengths/weaknesses without examples.",
    "Credible strengths and weaknesses with examples.",
    "Candid, specific self-assessment with evidence of working on weaknesses.",
  ],
  professionalism: [
    "Inappropriate or careless answers.",
    "Mostly appropriate, occasionally careless.",
    "Appropriate, considered answers.",
    "Consistently thoughtful and composed.",
  ],
  // Full / company loops
  problem_solving: [
    "No structured approach to technical problems.",
    "Reached answers with heavy prompting.",
    "Structured approach that reached sound solutions.",
    "Efficient, well-structured problem solving with alternatives considered.",
  ],
  technical_depth: [
    "Shallow or incorrect technical knowledge.",
    "Some accurate knowledge, with gaps when probed.",
    "Accurate, reasonably deep technical knowledge.",
    "Deep, precise knowledge that held up under follow-ups.",
  ],
  projects: [
    "Could not explain their own work.",
    "Explained their work at a surface level.",
    "Explained and justified their own work with specifics.",
    "Deep, convincing defence of their own work and its trade-offs.",
  ],
  fundamentals: [
    "Core CS knowledge missing or wrong.",
    "Some core knowledge, with notable gaps.",
    "Accurate core CS knowledge.",
    "Accurate and deep core CS knowledge applied to examples.",
  ],
};

const GENERIC: Anchors = [
  "Not demonstrated, or incorrect.",
  "Partially demonstrated; needed prompting or had notable gaps.",
  "Solid: meets the bar for this difficulty, with minor gaps.",
  "Strong: complete, precise and unprompted.",
];

/**
 * System design (HLD) rubric v2: two anchor sets per category, because the bar rises with level.
 * SDE-1: a reasonable, coherent design with basic scaling. SDE-2+: justified trade-offs, failure modes, operations.
 */
export type DesignLevel = "sde1" | "sde2";
export const designLevel = (difficulty: string): DesignLevel => (difficulty === "hard" || difficulty === "expert" ? "sde2" : "sde1");
export const DESIGN_LEVEL_LABEL: Record<DesignLevel, string> = { sde1: "SDE-1 bar", sde2: "SDE-2+ bar" };

export const HLD_ANCHORS: Record<string, Record<DesignLevel, Anchors>> = {
  requirements: {
    sde1: [
      "Started designing without clarifying what the system must do.",
      "Listed some features but no non-functional needs (scale, latency, availability) until prompted.",
      "Clarified core features and at least two non-functional needs, with a stated number for scale or latency.",
      "Scoped precisely: prioritised features, stated non-functional numbers and assumptions, and named what is out of scope.",
    ],
    sde2: [
      "Started designing without clarifying what the system must do.",
      "Clarified features but treated non-functional needs vaguely (\"fast\", \"scalable\") without numbers.",
      "Stated non-functional targets as numbers (QPS, p99 latency, availability) and the consistency needs per operation.",
      "Drove scoping like an owner: numeric targets, consistency per operation, explicit trade-off priorities and out-of-scope items, unprompted.",
    ],
  },
  estimation: {
    sde1: [
      "No estimates, or numbers off by orders of magnitude.",
      "Some numbers, but they never influenced a design choice.",
      "Reasonable QPS and storage estimates, and at least one later choice was explained by a number.",
      "Quick, correct estimates (average and peak, storage, bandwidth) that clearly drove several choices.",
    ],
    sde2: [
      "No estimates, or numbers off by orders of magnitude.",
      "Estimates given but not connected to any decision.",
      "Estimates drove concrete decisions (sharding, caching, partition counts) and peak vs average was considered.",
      "Estimates drove decisions and were revisited when the design or the requirements changed (e.g. the curveball).",
    ],
  },
  api_data: {
    sde1: [
      "No API or data model.",
      "A vague API or data model with missing keys or unclear entities.",
      "Clear main endpoints (inputs/outputs) and a data model with keys suited to the main queries.",
      "Clean API with pagination/idempotency where needed and a data model designed around access patterns, with the store choice explained.",
    ],
    sde2: [
      "No API or data model.",
      "API and entities named, but keys and access patterns not thought through.",
      "API with idempotency/pagination where needed; data model and partition keys chosen from the access patterns.",
      "Data model justified against access patterns and growth (hot partitions, secondary indexes, retention), with the alternative considered.",
    ],
  },
  architecture: {
    sde1: [
      "No coherent design: missing core components, or components that don't connect.",
      "Main components named, but the request flow is unclear or a core path is missing.",
      "Coherent components covering the requirements; walked through a read and a write path (on the board or in words).",
      "Clean, minimal design whose every component has a stated purpose; both main paths walked through end to end.",
    ],
    sde2: [
      "No coherent design: missing core components, or components that don't connect.",
      "Components drawn, but responsibilities blur or the design over-engineers without reason.",
      "Coherent, minimal design with clear boundaries; data flow, sync vs async and failure points identified.",
      "Clear boundaries, sync/async choices justified, and the design evolves cleanly from simple to scaled as requirements tighten.",
    ],
  },
  deep_dive: {
    sde1: [
      "Couldn't go deeper than the box level on the component the interviewer chose.",
      "Went one level deeper but stayed generic (\"add a cache\") without how it works.",
      "Explained how the chosen component works: data layout, the main algorithm or flow, and one way it fails.",
      "Detailed, correct internals of the chosen component, including its failure handling and limits.",
    ],
    sde2: [
      "Couldn't go deeper than the box level on the component the interviewer chose.",
      "Some depth but missed the critical issue for this component (hot keys, consistency, ordering, fan-out).",
      "Found and handled the critical issue in the chosen component, with a concrete mechanism and its cost.",
      "Expert depth: the critical issue, alternatives with their costs, failure modes and recovery, and how to verify it in production.",
    ],
  },
  scaling: {
    sde1: [
      "No scaling or reliability thinking.",
      "Mentioned scaling tools (caching, sharding, replicas) without saying where or why.",
      "Applied caching, replication or sharding where the numbers needed it, with the reason.",
      "Scaled each tier appropriately and covered basic failure handling (retries, replicas, timeouts).",
    ],
    sde2: [
      "No scaling or reliability thinking.",
      "Generic scaling with no failure analysis.",
      "Bottlenecks identified from the numbers; scaling and replication choices with consistency implications; failure of key components handled.",
      "Handled hot spots, partial failures, backpressure and multi-region concerns proportionately, including the curveball.",
    ],
  },
  tradeoffs: {
    sde1: [
      "No alternatives considered.",
      "Said things are trade-offs without naming the alternative or the cost.",
      "Named the alternative and what was given up for at least one key choice.",
      "Weighed alternatives crisply for the key choices and tied them back to the requirements.",
    ],
    sde2: [
      "No alternatives considered.",
      "Named alternatives but the reasoning didn't match the requirements.",
      "For the key choices, named the alternative, what was given up, and why it is right for these requirements.",
      "Trade-offs drove the design and were revisited when constraints changed; quantified costs where possible.",
    ],
  },
  operations: {
    sde1: [
      "Nothing on running the system.",
      "Mentioned monitoring or failures only when asked, without specifics.",
      "Named what to monitor (key metrics/alerts) and how a main failure would be noticed and handled.",
      "Covered monitoring, a failure scenario, safe deployment and a basic security point (auth, abuse limits).",
    ],
    sde2: [
      "Nothing on running the system.",
      "Generic \"add monitoring\" with no concrete signals.",
      "Concrete SLIs/alerts, failure detection and recovery, safe rollout and abuse/security controls for this system.",
      "Operational plan an on-call engineer could use: SLOs, dashboards, runbook-level failure handling, migrations and capacity planning.",
    ],
  },
  communication: {
    sde1: [
      "Disorganised; the interviewer had to drive every step.",
      "Followed the interviewer's lead but lost structure or time in places.",
      "Structured the discussion (requirements → estimates → design → deep dive), checked in and used the whiteboard.",
      "Drove the whole discussion with clear structure, time awareness and a readable diagram.",
    ],
    sde2: [
      "Disorganised; the interviewer had to drive every step.",
      "Structured but passive; waited for prompts to go deeper.",
      "Drove the discussion, managed time across phases and kept the diagram in sync with the conversation.",
      "Led like a senior engineer: framed decisions, invited challenge, summarised trade-offs and next steps.",
    ],
  },
};

/** Machine-coding meanings for ids that other rounds also use. */
export const MC_ANCHORS: Record<string, Anchors> = {
  extensibility: [
    "The new requirement wasn't delivered (under half its tests pass).",
    "Partly delivered, or it needed broad changes across the code.",
    "Delivered with moderate, mostly local changes.",
    "Delivered with small, local changes (a new class or strategy, few existing lines touched).",
  ],
};

/** The anchors used to score a category. HLD uses the level-calibrated v2 sets; machine coding has its own for shared ids. */
export const anchorsFor = (id: string, opts?: { kind?: KindId; level?: DesignLevel }): Anchors =>
  (opts?.kind === "hld" && HLD_ANCHORS[id] ? HLD_ANCHORS[id][opts.level ?? "sde1"] : undefined)
  ?? (opts?.kind === "machine_coding" ? MC_ANCHORS[id] : undefined)
  ?? ANCHORS[id] ?? GENERIC;

/** The categories that matter most for each round: they count double and gate the verdict. */
export const CORE: Record<KindId, string[]> = {
  dsa: ["approach", "correctness"],
  hld: ["architecture", "deep_dive"],
  lld: ["modeling", "principles"],
  project: ["depth", "decisions"],
  resume_screen: ["claims", "depth"],
  fundamentals: ["correctness", "depth"],
  behavioral: ["specificity", "ownership"],
  hr: ["motivation", "self_awareness"],
  full: ["problem_solving", "technical_depth"],
  company: ["problem_solving", "technical_depth"],
  machine_coding: ["completeness", "extensibility"],
};

export const isCore = (kind: KindId, id: string) => (CORE[kind] ?? []).includes(id);
export const weightOf = (kind: KindId, id: string) => (isCore(kind, id) ? 2 : 1);
