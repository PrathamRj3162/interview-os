import type { Diagram, NodeKind } from "@/lib/learn/design-diagrams";

const CW = 240, RH = 104, BW = 150, BH = 46, PAD = 16;

const KIND_COLOR: Record<NodeKind, string> = {
  client: "var(--muted)", edge: "var(--info)", service: "var(--accent)", store: "var(--success)",
  cache: "var(--warning)", queue: "var(--glow-pink)", class: "var(--accent)",
};
const KIND_LABEL: Record<NodeKind, string> = { client: "Client", edge: "Edge / gateway", service: "Service", store: "Storage", cache: "Cache", queue: "Queue / async", class: "Class" };

/** Point where the segment from the box centre towards (tx, ty) leaves the box. */
function exitPoint(cx: number, cy: number, tx: number, ty: number) {
  const dx = tx - cx, dy = ty - cy;
  if (dx === 0 && dy === 0) return [cx, cy];
  const s = Math.min(dx ? (BW / 2 + 4) / Math.abs(dx) : Infinity, dy ? (BH / 2 + 4) / Math.abs(dy) : Infinity);
  return [cx + dx * s, cy + dy * s];
}

/** Wraps a label into at most two lines that fit the box. */
function lines(label: string) {
  if (label.length <= 20) return [label];
  const words = label.split(" "); let a = "";
  while (words.length && (a + " " + words[0]).trim().length <= 20) a = (a + " " + words.shift()).trim();
  return [a, words.join(" ")];
}

export function DesignDiagram({ diagram, title }: { diagram: Diagram; title: string }) {
  const cols = Math.max(...diagram.nodes.map((x) => x.col)) + 1, rows = Math.max(...diagram.nodes.map((x) => x.row)) + 1;
  const W = cols * CW + PAD * 2 - (CW - BW), H = rows * RH + PAD * 2 - (RH - BH);
  const centre = (id: string) => { const nd = diagram.nodes.find((x) => x.id === id)!; return [PAD + nd.col * CW + BW / 2, PAD + nd.row * RH + BH / 2]; };
  const kinds = [...new Set(diagram.nodes.map((x) => x.kind))];
  return (
    <figure className="rounded-[var(--radius-lg)] border border-border bg-surface p-4" data-testid="design-diagram">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Reference architecture for ${title}`} className="mx-auto block max-w-none">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" />
            </marker>
          </defs>
          {diagram.edges.map((ed, i) => {
            const [ax, ay] = centre(ed.from), [bx, by] = centre(ed.to);
            const [x1, y1] = exitPoint(ax, ay, bx, by), [x2, y2] = exitPoint(bx, by, ax, ay);
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted)" strokeWidth={1.4} strokeDasharray={ed.dashed ? "5 4" : undefined} markerEnd="url(#arrow)" />
                {ed.label && (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 5} textAnchor="middle" fontSize={11} fill="var(--muted)" paintOrder="stroke" stroke="var(--surface)" strokeWidth={4}>{ed.label}</text>
                )}
              </g>
            );
          })}
          {diagram.nodes.map((nd) => {
            const x = PAD + nd.col * CW, y = PAD + nd.row * RH; const ls = lines(nd.label);
            return (
              <g key={nd.id}>
                <rect x={x} y={y} width={BW} height={BH} rx={nd.kind === "store" ? 14 : 8} fill="var(--bg)" stroke={KIND_COLOR[nd.kind]} strokeWidth={1.6} strokeDasharray={nd.kind === "queue" ? "6 3" : undefined} />
                {ls.map((l, i) => (
                  <text key={i} x={x + BW / 2} y={y + BH / 2 + (i - (ls.length - 1) / 2) * 14 + 4} textAnchor="middle" fontSize={12.5} fill="var(--text)">{l}</text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="mt-3 space-y-2 text-sm text-muted">
        <p>{diagram.caption}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {kinds.map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm border-2" style={{ borderColor: KIND_COLOR[k] }} aria-hidden />{KIND_LABEL[k]}</span>)}
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-5 border-t border-dashed border-muted" aria-hidden />async / optional</span>
        </p>
      </figcaption>
    </figure>
  );
}
