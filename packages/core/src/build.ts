import { extractFromDsl } from "./dsl-resolver.js";
import { crossValidate } from "./cross-validator.js";
import { layoutPresentation, normalize } from "./layout.js";
import { connector } from "./geometry.js";
import { parseSpotlight } from "./spotlight.js";
import { validateSceneFile } from "./validator.js";
import {
  IR_VERSION,
  type IRPayload,
  type Presentation,
  type RelationshipEdge,
  type Scene,
  type SceneStep,
} from "./ir.js";

export type BuildResult =
  | { ok: true; ir: IRPayload }
  | { ok: false; errors: string[] };

/**
 * Hand-placed component positions persisted by the WYSIWYG editor. When supplied,
 * they override the auto-layout coordinates and edges are redrawn as straight
 * connectors so arrows still attach to the moved boxes.
 */
export interface LayoutOverride {
  components?: Record<string, { x?: number; y?: number }>;
}

export async function buildPresentationFromSources(
  dslText: string,
  sceneYaml: string,
  layoutOverride?: LayoutOverride
): Promise<BuildResult> {
  const dslResult = extractFromDsl(dslText);
  if (!dslResult.ok) {
    return { ok: false, errors: [dslResult.error] };
  }

  const sceneResult = validateSceneFile(sceneYaml);
  if (!sceneResult.ok) {
    return { ok: false, errors: sceneResult.errors };
  }

  const crossResult = crossValidate(
    sceneResult.data,
    dslResult.elements,
    dslResult.relationships
  );
  if (!crossResult.ok) {
    return { ok: false, errors: crossResult.errors };
  }

  const sceneFile = sceneResult.data;
  const castUnion = new Set<string>();
  for (const scene of sceneFile.scenes) {
    for (const id of scene.cast) castUnion.add(id);
  }

  const elements = dslResult.elements.filter((e) => castUnion.has(e.id));
  const relationships = dslResult.relationships.filter(
    (r) => castUnion.has(r.sourceId) && castUnion.has(r.targetId)
  );

  const direction = sceneFile.defaults?.direction ?? "vertical";
  const layout = await layoutPresentation(elements, relationships, { direction });
  const defaultMode = sceneFile.defaults?.mode ?? "trailing";

  // Apply per-component overrides (e.g. a shorter custom description) onto the
  // laid-out nodes. Defaults come from the C4 DSL; overrides win when present.
  const overrides = sceneFile.components ?? {};
  for (const node of layout.components) {
    const override = overrides[node.id];
    if (override?.description !== undefined) {
      node.description = override.description;
    }
  }

  // Apply hand-placed positions from the WYSIWYG editor, then redraw edges as
  // straight connectors (ELK's orthogonal routing no longer fits moved boxes)
  // and re-normalize so the origin and bounds stay consistent.
  const positions = layoutOverride?.components;
  if (positions) {
    for (const node of layout.components) {
      const pos = positions[node.id];
      if (pos?.x !== undefined) node.x = pos.x;
      if (pos?.y !== undefined) node.y = pos.y;
    }
    const byId = new Map(layout.components.map((c) => [c.id, c] as const));
    layout.edges = relationships.map((r) => {
      const source = byId.get(r.sourceId)!;
      const target = byId.get(r.targetId)!;
      const edge: RelationshipEdge = {
        id: `${r.sourceId}->${r.targetId}`,
        sourceId: r.sourceId,
        targetId: r.targetId,
        points: connector(source, target),
      };
      if (r.label) edge.label = r.label;
      return edge;
    });
    const rebounded = normalize(layout.components, layout.edges);
    layout.width = rebounded.width;
    layout.height = rebounded.height;
  }

  const spotlightEdges = relationships.map((r) => ({
    id: `${r.sourceId}->${r.targetId}`,
    sourceId: r.sourceId,
    targetId: r.targetId,
  }));

  const scenes: Scene[] = sceneFile.scenes.map((scene) => {
    const steps: SceneStep[] = scene.steps.map((step, index) => {
      const mode = step.mode ?? defaultMode;
      const spotResult = parseSpotlight(step.spotlight, scene.cast, spotlightEdges);
      if (!spotResult.ok) {
        throw new Error(`unexpected spotlight error: ${spotResult.error}`);
      }

      const sceneStep: SceneStep = {
        index,
        highlight: spotResult.highlight,
        mode,
      };
      if (step.title) sceneStep.title = step.title;
      if (step.narration) sceneStep.narration = step.narration;
      return sceneStep;
    });

    return {
      id: scene.id,
      title: scene.title,
      cast: scene.cast,
      steps,
    };
  });

  const presentation: Presentation = {
    title: sceneFile.title,
    direction,
    width: layout.width,
    height: layout.height,
    components: layout.components,
    edges: layout.edges,
    scenes,
  };
  if (sceneFile.subtitle) presentation.subtitle = sceneFile.subtitle;

  return {
    ok: true,
    ir: {
      version: IR_VERSION,
      presentation,
    },
  };
}
