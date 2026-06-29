import { extractFromDsl } from "./dsl-resolver.js";
import { crossValidate } from "./cross-validator.js";
import { layoutPresentation } from "./layout.js";
import { parseSpotlight } from "./spotlight.js";
import { validateSceneFile } from "./validator.js";
import {
  IR_VERSION,
  type IRPayload,
  type Presentation,
  type Scene,
  type SceneStep,
} from "./ir.js";

export type BuildResult =
  | { ok: true; ir: IRPayload }
  | { ok: false; errors: string[] };

export async function buildPresentationFromSources(
  dslText: string,
  sceneYaml: string
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
