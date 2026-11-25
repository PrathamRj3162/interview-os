/**
 * Linked lists and binary trees travel as JSON arrays — a list as its values in order, a tree in level
 * order with `null` for missing children (trailing nulls trimmed), the format most candidates already know.
 * Every harness converts these arrays to real nodes before calling the solution and back afterwards; these
 * are the JavaScript versions, used to compute expected outputs from the reference solutions.
 * Node objects are plain `{ val, next }` / `{ val, left, right }` shapes, so references never need a class.
 */
import type { Problem, ValueType } from "./types";

export type ListNode = { val: number; next: ListNode | null };
export type TreeNode = { val: number; left: TreeNode | null; right: TreeNode | null };

const MAX_NODES = 200_000;

export function toList(values: number[]): ListNode | null {
  let head: ListNode | null = null;
  for (let i = values.length - 1; i >= 0; i--) head = { val: values[i], next: head };
  return head;
}

export function fromList(head: ListNode | null): number[] {
  const out: number[] = [];
  for (let n = head; n; n = n.next) {
    if (out.length >= MAX_NODES) throw new Error("returned list has a cycle or is too long");
    out.push(n.val);
  }
  return out;
}

export function toTree(values: (number | null)[]): TreeNode | null {
  if (!values.length || values[0] === null) return null;
  const root: TreeNode = { val: values[0], left: null, right: null };
  const queue: TreeNode[] = [root];
  let i = 1;
  for (let q = 0; q < queue.length && i < values.length; q++) {
    const node = queue[q];
    for (const side of ["left", "right"] as const) {
      if (i >= values.length) break;
      const v = values[i++];
      if (v !== null && v !== undefined) { node[side] = { val: v, left: null, right: null }; queue.push(node[side]!); }
    }
  }
  return root;
}

export function fromTree(root: TreeNode | null): (number | null)[] {
  const out: (number | null)[] = [];
  const queue: (TreeNode | null)[] = [root];
  for (let q = 0; q < queue.length; q++) {
    if (q > 2 * MAX_NODES) throw new Error("returned tree has a cycle or is too large");
    const n = queue[q];
    if (!n) { out.push(null); continue; }
    out.push(n.val);
    queue.push(n.left, n.right);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

const IN: Partial<Record<ValueType, (v: never) => unknown>> = { ListNode: toList, TreeNode: toTree };
const OUT: Partial<Record<ValueType, (v: never) => unknown>> = { ListNode: fromList, TreeNode: fromTree };

/** Call a reference solution with JSON-shaped input and get a JSON-shaped result back. */
export function callRef(problem: Problem, ref: (...args: never[]) => unknown, input: unknown[]): unknown {
  const args = structuredClone(input).map((v, i) => {
    const conv = IN[problem.params[i]?.type];
    return conv ? conv(v as never) : v;
  });
  const result = ref(...(args as never[]));
  const out = OUT[problem.returns];
  return out ? out(result as never) : result;
}

// ───────────── Random generators for hidden tests (not used by references) ─────────────

type R = { int(lo: number, hi: number): number; next(): number; shuffle<T>(xs: T[]): T[]; distinct(n: number, lo: number, hi: number): number[] };

/** Random binary tree with n nodes and values from `vals`; `shape` biases towards balanced or skewed. */
export function randomTree(r: R, vals: number[], shape: "random" | "left" | "right" | "balanced" = "random"): (number | null)[] {
  if (!vals.length) return [];
  const nodes: TreeNode[] = vals.map((val) => ({ val, left: null, right: null }));
  if (shape === "balanced") {
    nodes.forEach((n, i) => { n.left = nodes[2 * i + 1] ?? null; n.right = nodes[2 * i + 2] ?? null; });
  } else {
    for (let i = 1; i < nodes.length; i++) {
      // Attach each new node to a random existing node with a free slot.
      for (;;) {
        const parent = shape === "random" ? nodes[r.int(0, i - 1)] : nodes[i - 1];
        const side = shape === "left" ? "left" : shape === "right" ? "right" : r.next() < 0.5 ? "left" : "right";
        if (!parent[side]) { parent[side] = nodes[i]; break; }
        const other = side === "left" ? "right" : "left";
        if (shape === "random" && !parent[other]) { parent[other] = nodes[i]; break; }
      }
    }
  }
  return fromTree(nodes[0]);
}

/** Binary search tree built by inserting `vals` in the given order. */
export function bstFrom(vals: number[]): (number | null)[] {
  let root: TreeNode | null = null;
  for (const v of vals) {
    const node: TreeNode = { val: v, left: null, right: null };
    if (!root) { root = node; continue; }
    for (let c = root; ;) {
      const side = v < c.val ? "left" : "right";
      if (!c[side]) { c[side] = node; break; }
      c = c[side]!;
    }
  }
  return fromTree(root);
}
