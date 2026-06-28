import ELK from "elkjs/lib/elk.bundled.js";
import type { ComponentNode, RelationshipEdge } from "./ir.js";
import type { DslElement, DslRelationship } from "./dsl-resolver.js";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;

const elk = new ELK();

export interface LayoutResult {
  components: ComponentNode[];
  edges: RelationshipEdge[];
}

export async function layoutPresentation(
  elements: readonly DslElement[],
  relationships: readonly DslRelationship[]
): Promise<LayoutResult> {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
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

  return { components, edges };
}
