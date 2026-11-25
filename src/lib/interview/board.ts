/**
 * Whiteboard (Excalidraw) → compact text the interviewer and evaluator can read, like DSA sends code.
 *
 *   Nodes:
 *   [n:Ab3xYz] Load balancer
 *   Edges:
 *   [e:Qw12Er] Load balancer -> API servers (HTTP)
 *
 * Shapes with text inside (or free-standing text) become nodes; arrows/lines become edges, joined to the shapes
 * they're bound to, or to the nearest shape within a small distance of each end. Ids are the first 6 characters
 * of Excalidraw's element ids, so they stay stable across turns and can be cited as evidence in a report.
 */
export type BoardElement = {
  id: string; type: string; isDeleted?: boolean;
  x: number; y: number; width: number; height: number;
  text?: string; containerId?: string | null;
  points?: [number, number][];
  startBinding?: { elementId: string } | null; endBinding?: { elementId: string } | null;
  boundElements?: { id: string; type: string }[] | null;
};

export type BoardGraph = { nodes: { ref: string; label: string }[]; edges: { ref: string; from: string; to: string; label?: string }[] };

const SHAPES = new Set(["rectangle", "ellipse", "diamond", "frame"]);
const LINKS = new Set(["arrow", "line"]);
const SNAP = 48; // px: an unbound arrow end this close to a shape counts as connected
export const BOARD_TEXT_MAX = 8000;

export const shortRef = (kind: "n" | "e", id: string) => `${kind}:${id.slice(0, 6)}`;
const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 80);

function distToBox(px: number, py: number, el: BoardElement) {
  const dx = Math.max(el.x - px, 0, px - (el.x + el.width));
  const dy = Math.max(el.y - py, 0, py - (el.y + el.height));
  return Math.hypot(dx, dy);
}

export function boardGraph(elements: readonly BoardElement[]): BoardGraph {
  const live = elements.filter((e) => !e.isDeleted);
  const byId = new Map(live.map((e) => [e.id, e]));
  const labelOf = new Map<string, string>(); // container id → bound text
  for (const t of live) if (t.type === "text" && t.containerId && t.text?.trim()) labelOf.set(t.containerId, clean(t.text));

  // Nodes: labelled shapes, plus free text that isn't a label of anything.
  const nodeEls = live.filter((e) => (SHAPES.has(e.type) && labelOf.has(e.id)) || (e.type === "text" && !e.containerId && e.text?.trim()));
  const nodeLabel = (e: BoardElement) => (e.type === "text" ? clean(e.text ?? "") : labelOf.get(e.id)!);
  // Reading order: rows of ~80 px top to bottom, then left to right (so a pixel of drift doesn't reorder a row).
  const row = (e: BoardElement) => Math.round(e.y / 80);
  const nodes = [...nodeEls].sort((a, b) => row(a) - row(b) || a.x - b.x || a.y - b.y).map((e) => ({ ref: shortRef("n", e.id), label: nodeLabel(e), el: e }));

  const nearest = (px: number, py: number) => {
    let best: (typeof nodes)[number] | null = null, d = SNAP;
    for (const nd of nodes) { const dd = distToBox(px, py, nd.el); if (dd <= d) { d = dd; best = nd; } }
    return best;
  };
  const endpoint = (link: BoardElement, which: "start" | "end") => {
    const bound = (which === "start" ? link.startBinding : link.endBinding)?.elementId;
    if (bound && byId.has(bound)) return nodes.find((nd) => nd.el.id === bound) ?? null;
    const pts = link.points ?? [[0, 0]];
    const [px, py] = which === "start" ? pts[0] : pts[pts.length - 1];
    return nearest(link.x + px, link.y + py);
  };

  const edges: BoardGraph["edges"] = [];
  for (const l of live.filter((e) => LINKS.has(e.type))) {
    const a = endpoint(l, "start"), b = endpoint(l, "end");
    if (!a || !b || a === b) continue;
    edges.push({ ref: shortRef("e", l.id), from: a.label, to: b.label, label: labelOf.get(l.id) });
  }
  return { nodes: nodes.map(({ ref, label }) => ({ ref, label })), edges };
}

/** Compact text, capped at BOARD_TEXT_MAX characters. Empty string when nothing is drawn. */
export function boardText(elements: readonly BoardElement[]): string {
  const g = boardGraph(elements);
  if (!g.nodes.length && !g.edges.length) return "";
  const lines = ["Nodes:", ...g.nodes.map((n) => `[${n.ref}] ${n.label}`)];
  if (g.edges.length) lines.push("Edges:", ...g.edges.map((e) => `[${e.ref}] ${e.from} -> ${e.to}${e.label ? ` (${e.label})` : ""}`));
  const out = lines.join("\n");
  return out.length > BOARD_TEXT_MAX ? out.slice(0, BOARD_TEXT_MAX) + "\n…(diagram truncated)" : out;
}

/** Element refs ("n:Ab3xYz" / "e:Qw12Er") present in one or more saved board texts. */
export function boardRefs(texts: (string | null | undefined)[]): Set<string> {
  const out = new Set<string>();
  for (const t of texts) for (const m of (t ?? "").matchAll(/\[([ne]:[A-Za-z0-9_-]{1,6})\]/g)) out.add(m[1]);
  return out;
}

/** Keeps only the fields needed to redraw the board (saved for reload; size-capped by the caller). */
export function compactScene(elements: readonly Record<string, unknown>[]) {
  const drop = new Set(["seed", "versionNonce", "updated", "link", "locked", "groupIds", "frameId", "index", "roundness", "customData"]);
  return elements.filter((e) => !e.isDeleted).map((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !drop.has(k))));
}
