import ELKModule from "elkjs/lib/elk.bundled.js";
import type { ComponentNode, RelationshipEdge, LayoutDirection } from "./ir.js";
import type { DslElement, DslRelationship } from "./dsl-resolver.js";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;

interface ElkLayoutNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface ElkLayoutEdge {
  sections?: Array<{
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };
    bendPoints?: Array<{ x: number; y: number }>;
  }>;
}

interface ElkLayoutResult {
  children?: ElkLayoutNode[];
  edges?: ElkLayoutEdge[];
}

type ElkConstructor = new () => { layout: (graph: unknown) => Promise<ElkLayoutResult> };

const elk = new (ELKModule as unknown as ElkConstructor)();

export interface LayoutOptions {
  /** Diagram orientation. Defaults to `vertical`. */
  direction?: LayoutDirection;
}

export interface LayoutResult {
  components: ComponentNode[];
  edges: RelationshipEdge[];
  /** Bounding width of the laid-out diagram, origin-normalized to (0,0). */
  width: number;
  /** Bounding height of the laid-out diagram. */
  height: number;
}

export async function layoutPresentation(
  elements: readonly DslElement[],
  relationships: readonly DslRelationship[],
  options: LayoutOptions = {}
): Promise<LayoutResult> {
  const direction: LayoutDirection = options.direction ?? "vertical";
  const elkDirection = direction === "horizontal" ? "RIGHT" : "DOWN";
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": elkDirection,
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
    },
    children: elements.map((el) => ({
      id: el.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: relationships.map((r, i) => ({
      id: `e${i}`,
      sources: [r.sourceId],
      targets: [r.targetId],
    })),
  };

  const result = await elk.layout(graph);
  const elementById = new Map(elements.map((e) => [e.id, e] as const));

  const components: ComponentNode[] = (result.children ?? []).map((c) => {
    const src = elementById.get(c.id);
    if (!src) throw new Error(`ELK produced unknown node id: ${c.id}`);
    const node: ComponentNode = {
      id: src.id,
      name: src.name,
      kind: src.kind,
      x: c.x ?? 0,
      y: c.y ?? 0,
      width: c.width ?? NODE_WIDTH,
      height: c.height ?? NODE_HEIGHT,
    };
    if (src.description) node.description = src.description;
    return node;
  });

  const edges: RelationshipEdge[] = (result.edges ?? []).map((e, i) => {
    const rel = relationships[i]!;
    const section = e.sections?.[0];
    const points: Array<{ x: number; y: number }> = [];
    if (section) {
      points.push({ x: section.startPoint.x, y: section.startPoint.y });
      for (const bp of section.bendPoints ?? []) {
        points.push({ x: bp.x, y: bp.y });
      }
      points.push({ x: section.endPoint.x, y: section.endPoint.y });
    } else {
      points.push({ x: 0, y: 0 }, { x: 0, y: 0 });
    }
    const edge: RelationshipEdge = {
      id: `${rel.sourceId}->${rel.targetId}`,
      sourceId: rel.sourceId,
      targetId: rel.targetId,
      points,
    };
    if (rel.label) edge.label = rel.label;
    return edge;
  });

  return normalize(components, edges);
}

/**
 * Shift all coordinates so the diagram's top-left origin is (0,0), and compute the
 * overall bounding box. ELK can emit negative coordinates and arbitrary offsets;
 * normalizing keeps the runtime's coordinate math simple and the diagram centerable.
 */
export function normalize(components: ComponentNode[], edges: RelationshipEdge[]): LayoutResult {
  let minX = Infinity;
  let minY = Infinity;
  for (const c of components) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
  }
  for (const e of edges) {
    for (const p of e.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
    }
  }
  if (!Number.isFinite(minX)) minX = 0;
  if (!Number.isFinite(minY)) minY = 0;

  let maxX = 0;
  let maxY = 0;
  for (const c of components) {
    c.x -= minX;
    c.y -= minY;
    maxX = Math.max(maxX, c.x + c.width);
    maxY = Math.max(maxY, c.y + c.height);
  }
  for (const e of edges) {
    for (const p of e.points) {
      p.x -= minX;
      p.y -= minY;
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  return { components, edges, width: maxX, height: maxY };
}
