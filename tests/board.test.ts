import { describe, expect, it } from "vitest";
import { boardGraph, boardText, boardRefs, compactScene, type BoardElement } from "@/lib/interview/board";

const box = (id: string, x: number, y: number, label?: string): BoardElement[] => [
  { id, type: "rectangle", x, y, width: 120, height: 60 },
  ...(label ? [{ id: `${id}-t`, type: "text", x: x + 10, y: y + 20, width: 100, height: 20, text: label, containerId: id }] : []),
];
const arrow = (id: string, x: number, y: number, dx: number, dy: number, bind?: [string, string], label?: string): BoardElement[] => [
  { id, type: "arrow", x, y, width: Math.abs(dx), height: Math.abs(dy), points: [[0, 0], [dx, dy]], startBinding: bind ? { elementId: bind[0] } : null, endBinding: bind ? { elementId: bind[1] } : null },
  ...(label ? [{ id: `${id}-t`, type: "text", x, y, width: 40, height: 20, text: label, containerId: id }] : []),
];

describe("whiteboard serialisation", () => {
  it("labelled shapes become nodes and bound arrows become labelled edges", () => {
    const els = [...box("lbAAAAAA", 0, 0, "Load balancer"), ...box("apiBBBBB", 300, 0, "API servers"), ...arrow("arrCCCCC", 120, 30, 180, 0, ["lbAAAAAA", "apiBBBBB"], "HTTP")];
    expect(boardText(els)).toBe("Nodes:\n[n:lbAAAA] Load balancer\n[n:apiBBB] API servers\nEdges:\n[e:arrCCC] Load balancer -> API servers (HTTP)");
  });
  it("unbound arrows snap to the nearest shape at each end; far-away ends are ignored", () => {
    const els = [...box("a1xxxxxx", 0, 0, "Client"), ...box("b2xxxxxx", 400, 0, "Cache"), ...arrow("e1xxxxxx", 130, 30, 260, 0), ...arrow("e2xxxxxx", 130, 300, 100, 0)];
    const g = boardGraph(els);
    expect(g.edges).toEqual([{ ref: "e:e1xxxx", from: "Client", to: "Cache", label: undefined }]);
  });
  it("free text is a node; unlabelled shapes and deleted elements are not", () => {
    const els: BoardElement[] = [
      { id: "t1xxxxxx", type: "text", x: 0, y: 0, width: 50, height: 20, text: "  Kafka\n topic " },
      { id: "r1xxxxxx", type: "rectangle", x: 0, y: 100, width: 10, height: 10 },
      ...box("dlxxxxxx", 0, 200, "Gone").map((e) => ({ ...e, isDeleted: true })),
    ];
    expect(boardText(els)).toBe("Nodes:\n[n:t1xxxx] Kafka topic");
  });
  it("empty board → empty text; refs can be read back for evidence checks", () => {
    expect(boardText([])).toBe("");
    const refs = boardRefs(["Nodes:\n[n:abc123] DB\nEdges:\n[e:zz9_-q] A -> B", null]);
    expect([...refs].sort()).toEqual(["e:zz9_-q", "n:abc123"]);
  });
  it("output is capped", () => {
    const many = Array.from({ length: 400 }, (_, i) => box(`id${String(i).padStart(6, "0")}`, 0, i * 100, `Service number ${i} with a long name`)).flat();
    const t = boardText(many);
    expect(t.length).toBeLessThan(8100);
    expect(t.endsWith("(diagram truncated)")).toBe(true);
  });
  it("compact scene drops redraw-irrelevant fields and deleted elements", () => {
    const out = compactScene([{ id: "a", type: "rectangle", seed: 1, versionNonce: 2, x: 0 }, { id: "b", isDeleted: true }]);
    expect(out).toEqual([{ id: "a", type: "rectangle", x: 0 }]);
  });
});
