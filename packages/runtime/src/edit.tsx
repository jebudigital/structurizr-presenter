import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { IRPayload } from "@structurizr-presenter/core";

export interface EditAppProps {
  ir: IRPayload;
}

interface Pos {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Mirror of core's geometry.connector. Inlined (rather than imported) so the
// runtime bundle does not pull the entire core barrel — and elkjs/ajv with it —
// into the self-contained deck. Keep in sync with packages/core/src/geometry.ts.
function borderPoint(box: Rect, towards: Pos): Pos {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = towards.x - cx;
  const dy = towards.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const tx = dx !== 0 ? box.width / 2 / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? box.height / 2 / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t };
}

function connector(a: Rect, b: Rect): [Pos, Pos] {
  const centerA = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const centerB = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  return [borderPoint(a, centerB), borderPoint(b, centerA)];
}

const STAGE_PADDING = 48;
const MAX_SCALE = 1.5;

/**
 * WYSIWYG layout editor. Renders every component (the union of all casts) as a
 * draggable box; edges follow live as straight connectors. "Save layout" POSTs
 * the hand-placed coordinates back to the `edit` server, which writes layout.json
 * for the next `build` to read.
 */
export function EditApp({ ir }: EditAppProps): JSX.Element {
  const { presentation } = ir;

  const dims = useRef(
    new Map(presentation.components.map((c) => [c.id, { width: c.width, height: c.height }]))
  ).current;

  const [positions, setPositions] = useState<Map<string, Pos>>(
    () => new Map(presentation.components.map((c) => [c.id, { x: c.x, y: c.y }]))
  );
  const [status, setStatus] = useState<string>("");

  const worldWidth = Math.max(presentation.width, 1);
  const worldHeight = Math.max(presentation.height, 1);

  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  scaleRef.current = scale;

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const compute = (): void => {
      const availW = el.clientWidth - STAGE_PADDING * 2;
      const availH = el.clientHeight - STAGE_PADDING * 2;
      if (availW <= 0 || availH <= 0) return;
      const next = Math.min(availW / worldWidth, availH / worldHeight, MAX_SCALE);
      setScale(next > 0 ? next : 1);
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [worldWidth, worldHeight]);

  const drag = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(
    null
  );

  const onPointerMove = useCallback((e: PointerEvent): void => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scaleRef.current;
    const dy = (e.clientY - d.startY) / scaleRef.current;
    setPositions((prev) => {
      const next = new Map(prev);
      next.set(d.id, { x: d.originX + dx, y: d.originY + dy });
      return next;
    });
  }, []);

  const onPointerUp = useCallback((): void => {
    drag.current = null;
    setStatus("unsaved changes");
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  const startDrag = useCallback(
    (id: string, e: React.PointerEvent): void => {
      e.preventDefault();
      const pos = positions.get(id);
      if (!pos) return;
      drag.current = { id, startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y };
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [positions, onPointerMove, onPointerUp]
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const save = useCallback(async (): Promise<void> => {
    setStatus("saving…");
    const components: Record<string, Pos> = {};
    for (const [id, pos] of positions) {
      components[id] = { x: Math.round(pos.x), y: Math.round(pos.y) };
    }
    try {
      const res = await fetch("/__save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ components }),
      });
      setStatus(res.ok ? "saved layout.json ✓" : `save failed (${res.status})`);
    } catch (err) {
      setStatus(`save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [positions]);

  function rect(id: string): { x: number; y: number; width: number; height: number } {
    const pos = positions.get(id) ?? { x: 0, y: 0 };
    const dim = dims.get(id) ?? { width: 220, height: 120 };
    return { x: pos.x, y: pos.y, width: dim.width, height: dim.height };
  }

  return (
    <div className="sp-app">
      <div className="sp-header">
        <div className="sp-title">{presentation.title} — editing layout</div>
        <div className="sp-edit-toolbar">
          <span className="sp-edit-status">{status}</span>
          <button className="sp-edit-save" onClick={save}>
            Save layout
          </button>
        </div>
      </div>
      <div className="sp-stage" ref={stageRef}>
        <div
          className="sp-world"
          style={{ width: worldWidth, height: worldHeight, transform: `scale(${scale})` }}
        >
          <svg
            width={worldWidth}
            height={worldHeight}
            viewBox={`0 0 ${worldWidth} ${worldHeight}`}
            style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
          >
            <defs>
              <marker
                id="sp-arrowhead"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sp-edge)" />
              </marker>
            </defs>
            {presentation.edges.map((edge) => {
              const pts = connector(rect(edge.sourceId), rect(edge.targetId));
              const a = pts[0]!;
              const b = pts[1]!;
              return (
                <path
                  key={edge.id}
                  className="sp-edge-path"
                  d={`M${a.x},${a.y} L${b.x},${b.y}`}
                  markerEnd="url(#sp-arrowhead)"
                />
              );
            })}
          </svg>
          {presentation.components.map((node) => {
            const pos = positions.get(node.id)!;
            return (
              <div
                key={node.id}
                className="sp-component sp-component-draggable"
                onPointerDown={(e) => startDrag(node.id, e)}
                style={{
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  width: node.width,
                  height: node.height,
                }}
              >
                <div className="sp-component-kind">{node.kind}</div>
                <div className="sp-component-name">{node.name}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="sp-narration">
        Drag boxes to arrange the diagram, then Save. Run <code>build</code> again to bake the layout
        into your deck.
      </div>
    </div>
  );
}
