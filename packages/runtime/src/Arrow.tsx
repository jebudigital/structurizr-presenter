import { motion } from "framer-motion";
import type { RelationshipEdge } from "@structurizr-presenter/core";

export interface ArrowProps {
  edge: RelationshipEdge;
  state: "active" | "visible" | "dim";
}

export function Arrow({ edge, state }: ArrowProps): JSX.Element {
  const d = pointsToPath(edge.points);
  const last = edge.points[edge.points.length - 1]!;
  const cls = [
    "sp-edge-path",
    state === "active" ? "sp-edge-path-active" : "",
    state === "dim" ? "sp-edge-path-dim" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const labelCls = state === "active" ? "sp-edge-label sp-edge-label-active" : "sp-edge-label";

  return (
    <motion.g
      layoutId={`edge-${edge.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <path className={cls} d={d} markerEnd="url(#sp-arrowhead)" />
      {edge.label ? (
        <text className={labelCls} x={last.x + 8} y={last.y - 8}>
          {edge.label}
        </text>
      ) : null}
    </motion.g>
  );
}

function pointsToPath(points: ReadonlyArray<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M${first!.x},${first!.y}` + rest.map((p) => ` L${p.x},${p.y}`).join("");
}
